"use client";

import { getDashboardExpensesReport, getDashboardRevenue, getDashboardStatistics } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { formatCurrency } from "@/lib/format";
import { useAdminQuery } from "@/lib/query/hooks";
import { queryKeys } from "@/lib/query/keys";
import { AlertBellButton } from "@/components/layout/AlertBellButton";
import { ErrorMessage, PageHeader, StatCard } from "@/components/ui/AdminUi";

export default function DashboardPage() {
  const { data: stats, isPending, error } = useAdminQuery({
    queryKey: queryKeys.dashboard(),
    queryFn: () => getDashboardStatistics(),
  });

  const { data: revenue } = useAdminQuery({
    queryKey: queryKeys.dashboardRevenue(),
    queryFn: () => getDashboardRevenue(),
  });

  const { data: expensesReport } = useAdminQuery({
    queryKey: queryKeys.dashboardExpenses(),
    queryFn: () => getDashboardExpensesReport(),
  });

  const errorMessage =
    error instanceof ApiError ? error.message : error ? "Failed to load dashboard." : null;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Fleet overview, reservations, and financial performance."
        actions={<AlertBellButton />}
      />

      {errorMessage ? <ErrorMessage message={errorMessage} /> : null}

      {isPending ? (
        <div className="admin-card p-6 text-sm text-gray-500">Loading statistics...</div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total vehicles" value={stats.global_kpis.total_vehicles} />
            <StatCard label="Available" value={stats.global_kpis.available_vehicles} />
            <StatCard label="Reservations today" value={stats.global_kpis.reservations_today} />
            <StatCard
              label="Reservations this month"
              value={stats.global_kpis.reservations_this_month}
              hint={`${stats.month.month}/${stats.month.year}`}
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Monthly revenue" value={formatCurrency(stats.global_kpis.monthly_revenue)} />
            <StatCard
              label="Monthly expenses"
              value={formatCurrency(stats.global_kpis.monthly_expenses)}
              hint="Expenses + maintenance costs this month"
            />
            <StatCard label="Net profit" value={formatCurrency(stats.global_kpis.monthly_net_profit)} hint={`${stats.month.month}/${stats.month.year}`} />
            <StatCard label="Total customers" value={stats.global_kpis.total_customers} />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="admin-card p-6">
              <h2 className="text-lg font-bold text-gray-900">Fleet status</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Reserved vehicles</dt>
                  <dd className="font-semibold">{stats.global_kpis.reserved_vehicles}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Rented vehicles</dt>
                  <dd className="font-semibold">{stats.global_kpis.rented_vehicles}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Confirmed reservations</dt>
                  <dd className="font-semibold">{stats.global_kpis.confirmed_reservations}</dd>
                </div>
              </dl>
            </div>

            <div className="admin-card p-6">
              <h2 className="text-lg font-bold text-gray-900">Revenue report</h2>
              {revenue ? (
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Today</dt>
                    <dd className="font-semibold">{formatCurrency(revenue.daily_revenue)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">This month</dt>
                    <dd className="font-semibold">{formatCurrency(revenue.monthly_revenue)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">This year</dt>
                    <dd className="font-semibold">{formatCurrency(revenue.yearly_revenue)}</dd>
                  </div>
                </dl>
              ) : null}
            </div>
          </div>

          {expensesReport ? (
            <div className="admin-card mt-6 p-6">
              <h2 className="text-lg font-bold text-gray-900">Expenses by category</h2>
              <p className="mt-1 text-sm text-gray-500">
                Breakdown of expense records this month (fuel, maintenance, taxes, etc.).
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                {expensesReport.expenses_by_category.length === 0 ? (
                  <li className="text-gray-500">No expenses recorded this month.</li>
                ) : (
                  expensesReport.expenses_by_category.map((item) => (
                    <li key={item.slug} className="flex justify-between">
                      <span className="text-gray-500">
                        {item.name}
                        <span className="ml-2 text-xs text-gray-400">({item.expense_count})</span>
                      </span>
                      <span className="font-semibold">{formatCurrency(item.total_amount)}</span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
