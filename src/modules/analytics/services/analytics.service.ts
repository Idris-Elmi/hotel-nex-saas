import { BookingModel } from "@/models/Booking";
import { PaymentModel } from "@/models/Payment";
import { RoomModel } from "@/models/Room";
import { ExpenditureModel } from "@/models/Expenditure";
import type { AnalyticsDateFilter, BookingTrendPeriod, OccupancyPeriod } from "@/modules/analytics/utils/date-filter";
import { startOfDay, addDays, format, subDays } from "date-fns";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_MS = 86_400_000;

export type MonthlyRevenuePoint = {
  month: string;
  year: number;
  revenue: number;
  bookings: number;
};

export async function getMonthlyRevenue(): Promise<MonthlyRevenuePoint[]> {
  const now = new Date();
  const thirteenMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const results = await BookingModel.aggregate([
    {
      $match: {
        createdAt: { $gte: thirteenMonthsAgo },
        status: { $ne: "CANCELLED" },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        revenue: { $sum: "$totalPrice" },
        bookings: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
    {
      $project: {
        _id: 0,
        year: "$_id.year",
        monthIndex: "$_id.month",
        revenue: 1,
        bookings: 1,
      },
    },
  ]);

  const resultMap = new Map<string, { revenue: number; bookings: number }>();
  for (const r of results) {
    resultMap.set(`${r.year}-${r.monthIndex}`, {
      revenue: r.revenue,
      bookings: r.bookings,
    });
  }

  const months: MonthlyRevenuePoint[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    const data = resultMap.get(key);
    months.push({
      month: MONTH_LABELS[d.getMonth()],
      year: d.getFullYear(),
      revenue: data?.revenue ?? 0,
      bookings: data?.bookings ?? 0,
    });
  }

  return months;
}

function paymentMatch(filter: AnalyticsDateFilter) {
  return {
    createdAt: { $gte: filter.from, $lt: filter.toExclusive },
    status: { $in: ["PAID", "PARTIAL", "REFUNDED"] },
  };
}

async function aggregateNetRevenue(filter: AnalyticsDateFilter): Promise<number> {
  const totals = await PaymentModel.aggregate([
    { $match: paymentMatch(filter) },
    {
      $group: {
        _id: null,
        totalRevenue: {
          $sum: {
            $cond: [{ $eq: ["$status", "REFUNDED"] }, { $multiply: ["$amount", -1] }, "$amount"],
          },
        },
      },
    },
  ]);

  return totals[0]?.totalRevenue ?? 0;
}

export async function getOperationalMetrics(filter: AnalyticsDateFilter) {
  const [activeRooms, occupiedRoomNightsAgg, netRevenue] = await Promise.all([
    RoomModel.countDocuments({ isActive: true }),
    BookingModel.aggregate([
      {
        $match: {
        status: { $nin: ["CANCELLED", "PENDING"] },
          arrivalDate: { $lt: filter.toExclusive },
          departureDate: { $gt: filter.from },
        },
      },
      {
        $project: {
          overlapStart: {
            $cond: [{ $gt: ["$arrivalDate", filter.from] }, "$arrivalDate", filter.from],
          },
          overlapEnd: {
            $cond: [{ $lt: ["$departureDate", filter.toExclusive] }, "$departureDate", filter.toExclusive],
          },
        },
      },
      {
        $project: {
          occupiedNights: {
            $max: [
              {
                $dateDiff: {
                  startDate: "$overlapStart",
                  endDate: "$overlapEnd",
                  unit: "day",
                },
              },
              0,
            ],
          },
        },
      },
      { $group: { _id: null, totalOccupiedNights: { $sum: "$occupiedNights" } } },
    ]),
    aggregateNetRevenue(filter),
  ]);

  const occupiedRoomNights = occupiedRoomNightsAgg[0]?.totalOccupiedNights ?? 0;
  const availableRoomNights = activeRooms * filter.daysInRange;

  const totalActive = await RoomModel.countDocuments({
    isActive: true,
    status: { $in: ["AVAILABLE", "RESERVED", "OCCUPIED"] },
  });
  const occupiedCount = await RoomModel.countDocuments({
    isActive: true,
    status: "OCCUPIED",
  });
  const occupancyRate = totalActive > 0 ? Math.round((occupiedCount / totalActive) * 100) : 0;
  const revenuePerRoom = activeRooms > 0 ? netRevenue / activeRooms : 0;

  return {
    activeRooms,
    occupiedRoomNights,
    availableRoomNights,
    occupancyRate,
    revenuePerRoom,
    netRevenue,
  };
}

export async function getBookingTrends(period: BookingTrendPeriod) {
  const now = new Date();
  const todayStart = startOfDay(now);

  let from: Date;
  let toExclusive: Date;
  let groupFormat: string;
  let labels: string[];
  let fillLabel: (idx: number) => string;

  switch (period) {
    case "today": {
      from = todayStart;
      toExclusive = addDays(todayStart, 1);
      groupFormat = "%H";
      labels = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, "0")}:00`);
      fillLabel = (i: number) => `${i.toString().padStart(2, "0")}:00`;
      break;
    }
    case "7d": {
      from = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6));
      toExclusive = addDays(todayStart, 1);
      groupFormat = "%Y-%m-%d";
      labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      fillLabel = (i: number) => dayNames[addDays(from, i).getDay()];
      break;
    }
    case "30d": {
      from = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29));
      toExclusive = addDays(todayStart, 1);
      groupFormat = "%Y-%m-%d";
      labels = [];
      fillLabel = (i: number) => format(addDays(from, i), "MMM d");
      for (let i = 0; i < 30; i++) {
        labels.push(fillLabel(i));
      }
      break;
    }
    case "12m": {
      from = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      toExclusive = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      groupFormat = "%Y-%m";
      labels = MONTH_LABELS;
      fillLabel = (i: number) => {
        const d = new Date(from.getFullYear(), from.getMonth() + i, 1);
        return MONTH_LABELS[d.getMonth()];
      };
      break;
    }
    default: {
      from = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29));
      toExclusive = addDays(todayStart, 1);
      groupFormat = "%Y-%m-%d";
      labels = [];
      fillLabel = (i: number) => format(addDays(from, i), "MMM d");
      for (let i = 0; i < 30; i++) {
        labels.push(fillLabel(i));
      }
    }
  }

  const results = await BookingModel.aggregate([
    {
      $match: {
        createdAt: { $gte: from, $lt: toExclusive },
        status: { $nin: ["CANCELLED", "PENDING"] },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: groupFormat, date: "$createdAt" } },
        bookings: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const resultMap = new Map(results.map((r) => [r._id, r.bookings]));

  const numPoints = period === "today" ? 24 : period === "7d" ? 7 : period === "30d" ? 30 : 12;

  const data: { label: string; bookings: number }[] = [];
  for (let i = 0; i < numPoints; i++) {
    const label = fillLabel(i);
    let key: string;

    if (period === "today") {
      const hourKey = i.toString().padStart(2, "0");
      data.push({ label: `${hourKey}:00`, bookings: resultMap.get(hourKey) ?? 0 });
      continue;
    }

    const d = addDays(from, i);
    if (groupFormat === "%Y-%m-%d") {
      key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
    } else if (groupFormat === "%Y-%m") {
      key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
    } else {
      key = label;
    }

    data.push({ label, bookings: resultMap.get(key) ?? 0 });
  }

  return data;
}

export async function getOccupancyTrend(period: OccupancyPeriod) {
  const now = new Date();
  const todayStart = startOfDay(now);

  let from: Date;
  let toExclusive: Date;
  let numPoints: number;
  let interval: "hour" | "day" | "month";

  switch (period) {
    case "today": {
      from = todayStart;
      toExclusive = addDays(todayStart, 1);
      interval = "hour";
      numPoints = 24;
      break;
    }
    case "weekly": {
      from = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6));
      toExclusive = addDays(todayStart, 1);
      interval = "day";
      numPoints = 7;
      break;
    }
    case "monthly": {
      from = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
      toExclusive = addDays(todayStart, 1);
      interval = "day";
      numPoints = now.getDate();
      break;
    }
    case "yearly": {
      from = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      toExclusive = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      interval = "month";
      numPoints = 12;
      break;
    }
    default: {
      from = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
      toExclusive = addDays(todayStart, 1);
      interval = "day";
      numPoints = now.getDate();
    }
  }

  const totalRooms = await RoomModel.countDocuments({ isActive: true });

  const occupiedRoomIds = (await RoomModel.find({ isActive: true, status: "OCCUPIED" })
    .select("_id")
    .lean()).map((r) => r._id.toString());

  const fromMs = from.getTime();

  const bookings = await BookingModel.find({
    status: { $ne: "CANCELLED" },
    arrivalDate: { $lt: toExclusive },
    departureDate: { $gt: from },
  })
    .select("arrivalDate departureDate roomId")
    .lean();

  const data: { label: string; occupancyRate: number }[] = [];

  if (interval === "hour") {
    for (let h = 0; h < 24; h++) {
      const slotStart = new Date(fromMs + h * 3600000);
      const slotEnd = new Date(fromMs + (h + 1) * 3600000);
      const bookedSet = new Set<string>();
      for (const b of bookings) {
        if (b.arrivalDate < slotEnd && b.departureDate > slotStart) {
          bookedSet.add(b.roomId.toString());
        }
      }
      const occupied = new Set([...bookedSet, ...occupiedRoomIds]).size;
      data.push({
        label: `${h.toString().padStart(2, "0")}:00`,
        occupancyRate: totalRooms > 0 ? (occupied / totalRooms) * 100 : 0,
      });
    }
  } else if (interval === "day") {
    for (let d = 0; d < numPoints; d++) {
      const dayStart = new Date(fromMs + d * DAY_MS);
      const dayEnd = new Date(fromMs + (d + 1) * DAY_MS);
      const bookedSet = new Set<string>();
      for (const b of bookings) {
        if (b.arrivalDate < dayEnd && b.departureDate > dayStart) {
          bookedSet.add(b.roomId.toString());
        }
      }
      const occupied = new Set([...bookedSet, ...occupiedRoomIds]).size;
      const label = period === "weekly"
        ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dayStart.getDay()]
        : format(dayStart, "MMM d");
      data.push({
        label,
        occupancyRate: totalRooms > 0 ? (occupied / totalRooms) * 100 : 0,
      });
    }
  } else {
    for (let m = 0; m < 12; m++) {
      const monthStart = new Date(from.getFullYear(), from.getMonth() + m, 1);
      const monthEnd = new Date(from.getFullYear(), from.getMonth() + m + 1, 1);
      const bookedSet = new Set<string>();
      for (const b of bookings) {
        if (b.arrivalDate < monthEnd && b.departureDate > monthStart) {
          bookedSet.add(b.roomId.toString());
        }
      }
      const occupied = new Set([...bookedSet, ...occupiedRoomIds]).size;
      data.push({
        label: MONTH_LABELS[monthStart.getMonth()],
        occupancyRate: totalRooms > 0 ? (occupied / totalRooms) * 100 : 0,
      });
    }
  }

  return data;
}

export async function getTopRoomTypes(filter: AnalyticsDateFilter) {
  const results = await BookingModel.aggregate([
    {
      $match: {
        createdAt: { $gte: filter.from, $lt: filter.toExclusive },
        status: { $ne: "CANCELLED" },
      },
    },
    {
      $lookup: {
        from: "rooms",
        localField: "roomId",
        foreignField: "_id",
        as: "room",
      },
    },
    { $unwind: { path: "$room", preserveNullAndEmptyArrays: false } },
    {
      $lookup: {
        from: "roomtypes",
        localField: "room.type",
        foreignField: "_id",
        as: "roomType",
      },
    },
    { $unwind: { path: "$roomType", preserveNullAndEmptyArrays: false } },
    {
      $group: {
        _id: { $ifNull: ["$roomType.name", "Unknown"] },
        bookings: { $sum: 1 },
        revenue: { $sum: "$totalPrice" },
      },
    },
    { $sort: { bookings: -1 } },
    { $limit: 10 },
    {
      $project: {
        _id: 0,
        roomType: "$_id",
        bookings: 1,
        revenue: 1,
      },
    },
  ]);

  return results;
}

export type FinanceOverviewPeriod = "today" | "7d" | "30d" | "monthly" | "quarterly" | "yearly";

function generateFinanceLabels(period: FinanceOverviewPeriod): {
  labels: string[];
  from: Date;
  toExclusive: Date;
  formatGroup: (date: Date) => string;
} {
  const now = new Date();
  const todayStart = startOfDay(now);

  switch (period) {
    case "today": {
      const labels = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, "0")}:00`);
      return {
        labels,
        from: todayStart,
        toExclusive: addDays(todayStart, 1),
        formatGroup: (d: Date) => `${d.getUTCHours().toString().padStart(2, "0")}:00`,
      };
    }
    case "7d": {
      const from = startOfDay(subDays(todayStart, 6));
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      return {
        labels,
        from,
        toExclusive: addDays(todayStart, 1),
        formatGroup: (d: Date) => {
          const diff = Math.floor((d.getTime() - from.getTime()) / DAY_MS);
          return dayNames[addDays(from, diff).getDay()];
        },
      };
    }
    case "30d": {
      const from = startOfDay(subDays(todayStart, 29));
      const labels: string[] = [];
      for (let i = 0; i < 30; i++) labels.push(format(addDays(from, i), "MMM d"));
      return {
        labels,
        from,
        toExclusive: addDays(todayStart, 1),
        formatGroup: (d: Date) => format(d, "MMM d"),
      };
    }
    case "monthly": {
      const from = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      const labels: string[] = [];
      for (let i = 0; i < 12; i++) {
        const d = new Date(from.getFullYear(), from.getMonth() + i, 1);
        labels.push(MONTH_LABELS[d.getMonth()]);
      }
      return {
        labels,
        from,
        toExclusive: new Date(now.getFullYear(), now.getMonth() + 1, 1),
        formatGroup: (d: Date) => {
          const m = d.getUTCMonth();
          const y = d.getUTCFullYear();
          return `${y}-${(m + 1).toString().padStart(2, "0")}`;
        },
      };
    }
    case "quarterly": {
      const from = new Date(now.getFullYear() - 4, 0, 1);
      const labels: string[] = [];
      for (let i = 0; i < 20; i++) {
        const y = from.getFullYear() + Math.floor(i / 4);
        const q = (i % 4) + 1;
        labels.push(`Q${q} ${y}`);
      }
      return {
        labels,
        from,
        toExclusive: new Date(now.getFullYear() + 1, 0, 1),
        formatGroup: (d: Date) => {
          const q = Math.floor(d.getUTCMonth() / 3) + 1;
          return `Q${q} ${d.getUTCFullYear()}`;
        },
      };
    }
    case "yearly": {
      const from = new Date(now.getFullYear() - 4, 0, 1);
      const labels: string[] = [];
      for (let i = 0; i < 5; i++) {
        labels.push(String(from.getFullYear() + i));
      }
      return {
        labels,
        from,
        toExclusive: new Date(now.getFullYear() + 1, 0, 1),
        formatGroup: (d: Date) => String(d.getUTCFullYear()),
      };
    }
    default:
      return generateFinanceLabels("monthly");
  }
}

export async function getFinanceOverview(period: FinanceOverviewPeriod) {
  const { labels, from, toExclusive } = generateFinanceLabels(period);

  const [incomeAgg, expenseAgg] = await Promise.all([
    PaymentModel.aggregate([
      {
        $match: {
          createdAt: { $gte: from, $lt: toExclusive },
          status: { $in: ["PAID", "PARTIAL", "APPROVED"] },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } },
          income: { $sum: "$amount" },
          transactions: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    ExpenditureModel.aggregate([
      {
        $match: { date: { $gte: from, $lt: toExclusive } },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date", timezone: "UTC" } },
          expenses: { $sum: "$amount" },
          expenseTransactions: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const incomeMap = new Map<string, number>();
  const expenseMap = new Map<string, number>();
  let txCount = 0;

  if (period === "quarterly") {
    for (const row of incomeAgg) {
      const d = new Date(row._id);
      const q = Math.floor(d.getUTCMonth() / 3) + 1;
      const key = `Q${q} ${d.getUTCFullYear()}`;
      incomeMap.set(key, (incomeMap.get(key) ?? 0) + row.income);
      txCount += row.transactions;
    }
    for (const row of expenseAgg) {
      const d = new Date(row._id);
      const q = Math.floor(d.getUTCMonth() / 3) + 1;
      const key = `Q${q} ${d.getUTCFullYear()}`;
      expenseMap.set(key, (expenseMap.get(key) ?? 0) + row.expenses);
    }
  } else if (period === "yearly") {
    for (const row of incomeAgg) {
      const key = String(new Date(row._id).getUTCFullYear());
      incomeMap.set(key, (incomeMap.get(key) ?? 0) + row.income);
      txCount += row.transactions;
    }
    for (const row of expenseAgg) {
      const key = String(new Date(row._id).getUTCFullYear());
      expenseMap.set(key, (expenseMap.get(key) ?? 0) + row.expenses);
    }
  } else if (period === "monthly") {
    for (const row of incomeAgg) {
      const d = new Date(row._id);
      const key = `${d.getUTCFullYear()}-${(d.getUTCMonth() + 1).toString().padStart(2, "0")}`;
      incomeMap.set(key, (incomeMap.get(key) ?? 0) + row.income);
      txCount += row.transactions;
    }
    for (const row of expenseAgg) {
      const d = new Date(row._id);
      const key = `${d.getUTCFullYear()}-${(d.getUTCMonth() + 1).toString().padStart(2, "0")}`;
      expenseMap.set(key, (expenseMap.get(key) ?? 0) + row.expenses);
    }
  } else if (period === "7d" || period === "30d") {
    for (const row of incomeAgg) {
      const d = new Date(row._id);
      const key = format(d, "MMM d");
      incomeMap.set(key, (incomeMap.get(key) ?? 0) + row.income);
      txCount += row.transactions;
    }
    for (const row of expenseAgg) {
      const d = new Date(row._id);
      const key = format(d, "MMM d");
      expenseMap.set(key, (expenseMap.get(key) ?? 0) + row.expenses);
    }
  }

  const incomeValues = labels.map((l) => {
    if (period === "monthly") {
      const idx = labels.indexOf(l);
      const d = new Date(from.getFullYear(), from.getMonth() + idx, 1);
      const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
      return incomeMap.get(key) ?? 0;
    }
    if (period === "yearly") return incomeMap.get(l) ?? 0;
    if (period === "quarterly") return incomeMap.get(l) ?? 0;
    return incomeMap.get(l) ?? 0;
  });

  const expenseValues = labels.map((l) => {
    if (period === "monthly") {
      const idx = labels.indexOf(l);
      const d = new Date(from.getFullYear(), from.getMonth() + idx, 1);
      const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
      return expenseMap.get(key) ?? 0;
    }
    if (period === "yearly") return expenseMap.get(l) ?? 0;
    if (period === "quarterly") return expenseMap.get(l) ?? 0;
    return expenseMap.get(l) ?? 0;
  });

  const profitValues = incomeValues.map((inc, i) => inc - expenseValues[i]);

  const finalTotalIncome = incomeValues.reduce((s, v) => s + v, 0);
  const finalTotalExpenses = expenseValues.reduce((s, v) => s + v, 0);

  return {
    success: true,
    period,
    labels,
    datasets: [
      { label: "Income", data: incomeValues },
      { label: "Expenses", data: expenseValues },
      { label: "Profit", data: profitValues },
    ],
    summary: {
      totalIncome: finalTotalIncome,
      totalExpenses: finalTotalExpenses,
      netProfit: finalTotalIncome - finalTotalExpenses,
      grossProfit: finalTotalIncome,
      operatingProfit: finalTotalIncome - finalTotalExpenses,
      totalTransactions: txCount,
    },
  };
}

export type ExpenditureAnalyticsPeriod = "daily" | "weekly" | "monthly" | "yearly";

function generateExpenditureLabels(period: ExpenditureAnalyticsPeriod): {
  labels: string[];
  from: Date;
  toExclusive: Date;
} {
  const now = new Date();
  const todayStart = startOfDay(now);

  switch (period) {
    case "daily": {
      const from = startOfDay(subDays(todayStart, 29));
      const labels: string[] = [];
      for (let i = 0; i < 30; i++) labels.push(format(addDays(from, i), "MMM d"));
      return { labels, from, toExclusive: addDays(todayStart, 1) };
    }
    case "weekly": {
      const from = startOfDay(subDays(todayStart, 83));
      const labels: string[] = [];
      for (let i = 0; i < 12; i++) {
        labels.push(`W${i + 1}`);
      }
      return { labels, from, toExclusive: addDays(todayStart, 1) };
    }
    case "monthly": {
      const from = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      const labels: string[] = [];
      for (let i = 0; i < 12; i++) {
        const d = new Date(from.getFullYear(), from.getMonth() + i, 1);
        labels.push(MONTH_LABELS[d.getMonth()]);
      }
      return { labels, from, toExclusive: new Date(now.getFullYear(), now.getMonth() + 1, 1) };
    }
    case "yearly": {
      const from = new Date(now.getFullYear() - 4, 0, 1);
      const labels: string[] = [];
      for (let i = 0; i < 5; i++) labels.push(String(from.getFullYear() + i));
      return { labels, from, toExclusive: new Date(now.getFullYear() + 1, 0, 1) };
    }
    default:
      return generateExpenditureLabels("monthly");
  }
}

export async function getExpenditureAnalytics(period: ExpenditureAnalyticsPeriod) {
  const { labels, from, toExclusive } = generateExpenditureLabels(period);

  const aggResults = await ExpenditureModel.aggregate([
    { $match: { date: { $gte: from, $lt: toExclusive } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$date", timezone: "UTC" } },
        amount: { $sum: "$amount" },
        count: { $sum: 1 },
        categories: { $push: "$category" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const amountMap = new Map<string, number>();
  const countMap = new Map<string, number>();
  const categoryTotals = new Map<string, number>();

  for (const row of aggResults) {
    const d = new Date(row._id);
    let key: string;

    if (period === "monthly") {
      key = `${d.getUTCFullYear()}-${(d.getUTCMonth() + 1).toString().padStart(2, "0")}`;
    } else if (period === "yearly") {
      key = String(d.getUTCFullYear());
    } else if (period === "weekly") {
      const weekNum = Math.floor((d.getTime() - from.getTime()) / (7 * DAY_MS));
      key = `W${Math.min(weekNum + 1, 12)}`;
    } else {
      key = format(d, "MMM d");
    }

    amountMap.set(key, (amountMap.get(key) ?? 0) + row.amount);
    countMap.set(key, (countMap.get(key) ?? 0) + row.count);
    for (const cat of row.categories as string[]) {
      categoryTotals.set(cat, (categoryTotals.get(cat) ?? 0) + row.amount);
    }
  }

  const amountValues = labels.map((l) => {
    if (period === "monthly") {
      const idx = labels.indexOf(l);
      const d = new Date(from.getFullYear(), from.getMonth() + idx, 1);
      const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
      return amountMap.get(key) ?? 0;
    }
    if (period === "yearly") return amountMap.get(l) ?? 0;
    if (period === "weekly") return amountMap.get(l) ?? 0;
    return amountMap.get(l) ?? 0;
  });

  const countValues = labels.map((l) => {
    if (period === "monthly") {
      const idx = labels.indexOf(l);
      const d = new Date(from.getFullYear(), from.getMonth() + idx, 1);
      const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
      return countMap.get(key) ?? 0;
    }
    if (period === "yearly") return countMap.get(l) ?? 0;
    if (period === "weekly") return countMap.get(l) ?? 0;
    return countMap.get(l) ?? 0;
  });

  const totalAmount = amountValues.reduce((s, v) => s + v, 0);
  const totalCount = countValues.reduce((s, v) => s + v, 0);

  const categoryBreakdown = Array.from(categoryTotals.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return {
    success: true,
    period,
    labels,
    datasets: [
      { label: "Expenditure", data: amountValues },
      { label: "Transactions", data: countValues },
    ],
    summary: {
      totalExpenditure: totalAmount,
      totalTransactions: totalCount,
      averageExpense: totalCount > 0 ? Math.round((totalAmount / totalCount) * 100) / 100 : 0,
      categoryBreakdown,
    },
  };
}

export async function getAdminAnalyticsOverview(filter: AnalyticsDateFilter) {
  const [metrics, bookingStates, monthlyRevenue, topRoomTypes] =
    await Promise.all([
      getOperationalMetrics(filter),
      BookingModel.aggregate([
        { $match: { createdAt: { $gte: filter.from, $lt: filter.toExclusive } } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      getMonthlyRevenue(),
      getTopRoomTypes(filter),
    ]);

  return {
    filter: {
      preset: filter.preset,
      from: filter.fromIso,
      to: filter.toIso,
      daysInRange: filter.daysInRange,
    },
    metrics,
    bookingStates,
    monthlyRevenue,
    topRoomTypes,
  };
}
