import { BookingModel } from "@/models/booking.model";
import { PaymentModel } from "@/models/payment.model";
import { RoomModel } from "@/models/room.model";
import type { AnalyticsDateFilter } from "@/modules/analytics/utils/date-filter";

type RevenuePoint = {
  period: string;
  revenue: number;
};

type RevenueBreakdown = {
  daily: RevenuePoint[];
  weekly: RevenuePoint[];
  monthly: RevenuePoint[];
  yearly: RevenuePoint[];
  totalRevenue: number;
};

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

export async function getRevenueBreakdown(filter: AnalyticsDateFilter): Promise<RevenueBreakdown> {
  const revenue = await PaymentModel.aggregate([
    { $match: paymentMatch(filter) },
    {
      $project: {
        createdAt: 1,
        signedAmount: {
          $cond: [{ $eq: ["$status", "REFUNDED"] }, { $multiply: ["$amount", -1] }, "$amount"],
        },
      },
    },
    {
      $facet: {
        daily: [
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } },
              revenue: { $sum: "$signedAmount" },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, period: "$_id", revenue: 1 } },
        ],
        weekly: [
          {
            $group: {
              _id: {
                $dateToString: { format: "%G-W%V", date: "$createdAt", timezone: "UTC" },
              },
              revenue: { $sum: "$signedAmount" },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, period: "$_id", revenue: 1 } },
        ],
        monthly: [
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m", date: "$createdAt", timezone: "UTC" } },
              revenue: { $sum: "$signedAmount" },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, period: "$_id", revenue: 1 } },
        ],
        yearly: [
          {
            $group: {
              _id: { $dateToString: { format: "%Y", date: "$createdAt", timezone: "UTC" } },
              revenue: { $sum: "$signedAmount" },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, period: "$_id", revenue: 1 } },
        ],
      },
    },
  ]);

  const data = revenue[0] ?? { daily: [], weekly: [], monthly: [], yearly: [] };

  return {
    daily: data.daily,
    weekly: data.weekly,
    monthly: data.monthly,
    yearly: data.yearly,
    totalRevenue: (data.daily as RevenuePoint[]).reduce((sum, point) => sum + point.revenue, 0),
  };
}

export async function getOperationalMetrics(filter: AnalyticsDateFilter) {
  const [activeRooms, occupiedRoomNightsAgg, netRevenue] = await Promise.all([
    RoomModel.countDocuments({ isActive: true }),
    BookingModel.aggregate([
      {
        $match: {
          status: { $in: ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"] },
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
  const occupancyRate = availableRoomNights > 0 ? (occupiedRoomNights / availableRoomNights) * 100 : 0;
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

export async function getAdminAnalyticsOverview(filter: AnalyticsDateFilter) {
  const [revenue, metrics, bookingStates] = await Promise.all([
    getRevenueBreakdown(filter),
    getOperationalMetrics(filter),
    BookingModel.aggregate([
      { $match: { createdAt: { $gte: filter.from, $lt: filter.toExclusive } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  return {
    filter: {
      preset: filter.preset,
      from: filter.fromIso,
      to: filter.toIso,
      daysInRange: filter.daysInRange,
    },
    revenue,
    metrics,
    bookingStates,
  };
}
