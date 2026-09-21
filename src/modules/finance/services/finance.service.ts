import { PaymentModel } from "@/models/Payment";
import { ExpenditureModel } from "@/models/Expenditure";
import { RevenueEntryModel } from "@/models/RevenueEntry";
import type { AnalyticsDateFilter } from "@/modules/analytics/utils/date-filter";
import { getOperationalMetrics } from "@/modules/analytics/services/analytics.service";

export type FinancePeriod = "daily" | "weekly" | "monthly" | "yearly";

type FinancePoint = {
  period: string;
  revenue: number;
  expenses: number;
  profit: number;
};

const RevenuePaymentStatuses = ["PAID", "PARTIAL", "APPROVED", "REFUNDED"] as const;

function paymentMatch(filter: AnalyticsDateFilter) {
  return {
    createdAt: { $gte: filter.from, $lt: filter.toExclusive },
    status: { $in: RevenuePaymentStatuses },
  };
}

function dateFormatForPeriod(period: FinancePeriod): string {
  switch (period) {
    case "daily":
      return "%Y-%m-%d";
    case "weekly":
      return "%G-W%V";
    case "yearly":
      return "%Y";
    default:
      return "%Y-%m";
  }
}

async function aggregatePaymentRevenue(filter: AnalyticsDateFilter): Promise<number> {
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

async function aggregateManualRevenue(filter: AnalyticsDateFilter): Promise<number> {
  const totals = await RevenueEntryModel.aggregate([
    { $match: { date: { $gte: filter.from, $lt: filter.toExclusive } } },
    { $group: { _id: null, totalRevenue: { $sum: "$amount" } } },
  ]);

  return totals[0]?.totalRevenue ?? 0;
}

async function aggregateExpenses(filter: AnalyticsDateFilter): Promise<number> {
  const totals = await ExpenditureModel.aggregate([
    { $match: { date: { $gte: filter.from, $lt: filter.toExclusive } } },
    { $group: { _id: null, totalExpenses: { $sum: "$amount" } } },
  ]);

  return totals[0]?.totalExpenses ?? 0;
}

async function aggregatePaymentSeries(filter: AnalyticsDateFilter, period: FinancePeriod) {
  const format = dateFormatForPeriod(period);
  return PaymentModel.aggregate([
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
      $group: {
        _id: { $dateToString: { format, date: "$createdAt", timezone: "UTC" } },
        revenue: { $sum: "$signedAmount" },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, period: "$_id", revenue: 1 } },
  ]);
}

async function aggregateManualRevenueSeries(filter: AnalyticsDateFilter, period: FinancePeriod) {
  const format = dateFormatForPeriod(period);
  return RevenueEntryModel.aggregate([
    { $match: { date: { $gte: filter.from, $lt: filter.toExclusive } } },
    {
      $group: {
        _id: { $dateToString: { format, date: "$date", timezone: "UTC" } },
        revenue: { $sum: "$amount" },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, period: "$_id", revenue: 1 } },
  ]);
}

async function aggregateExpenseSeries(filter: AnalyticsDateFilter, period: FinancePeriod) {
  const format = dateFormatForPeriod(period);
  return ExpenditureModel.aggregate([
    { $match: { date: { $gte: filter.from, $lt: filter.toExclusive } } },
    {
      $group: {
        _id: { $dateToString: { format, date: "$date", timezone: "UTC" } },
        expenses: { $sum: "$amount" },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, period: "$_id", expenses: 1 } },
  ]);
}

function mergeSeries(
  revenuePoints: Array<{ period: string; revenue: number }>,
  expensePoints: Array<{ period: string; expenses: number }>,
): FinancePoint[] {
  const map = new Map<string, FinancePoint>();

  for (const point of revenuePoints) {
    map.set(point.period, {
      period: point.period,
      revenue: point.revenue,
      expenses: 0,
      profit: point.revenue,
    });
  }

  for (const point of expensePoints) {
    const existing = map.get(point.period);
    if (existing) {
      existing.expenses = point.expenses;
      existing.profit = existing.revenue - existing.expenses;
    } else {
      map.set(point.period, {
        period: point.period,
        revenue: 0,
        expenses: point.expenses,
        profit: -point.expenses,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => a.period.localeCompare(b.period));
}

async function buildFinanceSeries(filter: AnalyticsDateFilter, period: FinancePeriod) {
  const [paymentSeries, manualRevenueSeries, expenseSeries] = await Promise.all([
    aggregatePaymentSeries(filter, period),
    aggregateManualRevenueSeries(filter, period),
    aggregateExpenseSeries(filter, period),
  ]);

  const revenueMap = new Map<string, number>();
  for (const point of paymentSeries as Array<{ period: string; revenue: number }>) {
    revenueMap.set(point.period, (revenueMap.get(point.period) ?? 0) + point.revenue);
  }
  for (const point of manualRevenueSeries as Array<{ period: string; revenue: number }>) {
    revenueMap.set(point.period, (revenueMap.get(point.period) ?? 0) + point.revenue);
  }

  const combinedRevenue = Array.from(revenueMap.entries()).map(([period, revenue]) => ({ period, revenue }));

  return mergeSeries(combinedRevenue, expenseSeries as Array<{ period: string; expenses: number }>);
}

export async function getFinancialTotals(filter: AnalyticsDateFilter) {
  const [paymentRevenue, manualRevenue, totalExpenses] = await Promise.all([
    aggregatePaymentRevenue(filter),
    aggregateManualRevenue(filter),
    aggregateExpenses(filter),
  ]);

  const totalRevenue = paymentRevenue + manualRevenue;
  const netProfit = totalRevenue - totalExpenses;

  return {
    totalRevenue,
    totalExpenses,
    netProfit,
    revenueBreakdown: {
      bookingPayments: paymentRevenue,
      otherIncome: manualRevenue,
    },
  };
}

export async function getFinancialSummary(filter: AnalyticsDateFilter, chartPeriod: FinancePeriod) {
  const [totals, series, metrics] = await Promise.all([
    getFinancialTotals(filter),
    buildFinanceSeries(filter, chartPeriod),
    getOperationalMetrics(filter),
  ]);

  const status = totals.netProfit > 0 ? "PROFIT" : totals.netProfit < 0 ? "LOSS" : "BREAK_EVEN";

  return {
    totals,
    status,
    chartPeriod,
    comparison: series,
    occupancyContribution: {
      occupancyRate: metrics.occupancyRate,
      occupiedRoomNights: metrics.occupiedRoomNights,
      availableRoomNights: metrics.availableRoomNights,
      revenuePerRoom: metrics.revenuePerRoom,
    },
  };
}

export async function getFinancialReport(filter: AnalyticsDateFilter, period: FinancePeriod) {
  const series = await buildFinanceSeries(filter, period);
  const totalRevenue = series.reduce((sum, point) => sum + point.revenue, 0);
  const totalExpenses = series.reduce((sum, point) => sum + point.expenses, 0);
  const netProfit = totalRevenue - totalExpenses;

  return {
    period,
    series,
    totals: {
      totalRevenue,
      totalExpenses,
      netProfit,
      status: netProfit > 0 ? "PROFIT" : netProfit < 0 ? "LOSS" : "BREAK_EVEN",
    },
  };
}
