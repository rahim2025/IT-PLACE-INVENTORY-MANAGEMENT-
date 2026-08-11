import { useNavigate } from "react-router-dom";
import { PackageCheck, HandCoins } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import { Card, CardHeader, CardBody } from "../components/ui/Card";
import StatusStrip from "../components/dashboard/StatusStrip";
import TrendChart from "../components/dashboard/TrendChart";
import AssetTag from "../components/ui/AssetTag";
import DataTable from "../components/ui/DataTable";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";
import {
  useGetDashboardQuery,
  useGetStockOverviewQuery,
  useGetPurchasesQuery,
  useGetDuesQuery,
} from "../app/apiSlice";
import { formatCurrency, formatNumber, formatDate } from "../lib/format";
import { CHART_COLORS } from "../lib/colors";

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: dashboardRes, isLoading: dashboardLoading } = useGetDashboardQuery();
  const { data: lowStockRes } = useGetStockOverviewQuery({ status: "low" });
  const { data: outOfStockRes } = useGetStockOverviewQuery({ status: "out" });
  const { data: purchasesRes } = useGetPurchasesQuery({ limit: 6 });
  const { data: duesRes } = useGetDuesQuery({ limit: 100 });

  const d = dashboardRes?.data;
  const lowStock = lowStockRes?.data ?? [];
  const outOfStock = outOfStockRes?.data ?? [];
  const recentPurchases = purchasesRes?.data ?? [];
  const openDues = (duesRes?.data ?? [])
    .filter((due) => due.remainingDue > 0)
    .sort((a, b) => b.remainingDue - a.remainingDue)
    .slice(0, 6);

  if (dashboardLoading || !d) {
    return (
      <div>
        <PageHeader title="Dashboard" description="Today's snapshot of stock, spend, money to collect, and money to pay." />
        <Skeleton className="h-24 w-full" />
        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const segments = [
    { label: "Products", value: formatNumber(d.totalProducts) },
    { label: "Stock on hand", value: formatNumber(d.stockOnHand) },
    { label: "Inventory value", value: formatCurrency(d.inventoryValue) },
    { label: "Today's purchases", value: formatCurrency(d.todaysPurchases), tone: d.todaysPurchases > 0 ? "solder" : "neutral" },
    { label: "Today's expenses", value: formatCurrency(d.todaysExpenses), tone: d.todaysExpenses > 0 ? "trace" : "neutral" },
    { label: "To collect", value: formatCurrency(d.totalReceivable), tone: d.totalReceivable > 0 ? "rose" : "neutral" },
    { label: "To pay", value: formatCurrency(d.totalPayable), tone: d.totalPayable > 0 ? "trace" : "neutral" },
    { label: "Employees", value: formatNumber(d.totalEmployees) },
    { label: "Low stock", value: formatNumber(d.lowStockCount), tone: d.lowStockCount ? "trace" : "solder", pulse: d.lowStockCount > 0 },
    { label: "Out of stock", value: formatNumber(d.outOfStockCount), tone: d.outOfStockCount ? "fault" : "solder", pulse: d.outOfStockCount > 0 },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Today's snapshot of stock, spend, money to collect, and money to pay."
      />

      <StatusStrip segments={segments} />

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Inventory value trend" description="Weighted-average cost × stock on hand, by month" />
          <CardBody>
            <TrendChart data={d.inventoryValueTrend} color={CHART_COLORS.rose} type="area" currency height={240} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Stock health" description={`${lowStock.length + outOfStock.length} item(s) need attention`} />
          <CardBody className="max-h-[292px] overflow-y-auto p-0">
            {lowStock.length + outOfStock.length === 0 ? (
              <EmptyState
                icon={PackageCheck}
                title="All stock healthy"
                description="No products are low or out of stock right now."
              />
            ) : (
              <ul className="divide-y divide-border">
                {[...outOfStock, ...lowStock].map((p) => (
                  <li key={p._id}>
                    <button
                      onClick={() => navigate("/inventory")}
                      className="flex w-full items-center justify-between gap-3 px-4.5 py-3 text-left hover:bg-bg-sunken"
                    >
                      <span className="min-w-0 flex-1 truncate text-[13px] text-text">{p.name}</span>
                      <AssetTag tone={p.stockStatus === "out" ? "fault" : "trace"}>
                        {p.stockStatus === "out" ? "Out" : `${p.currentStock} left`}
                      </AssetTag>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader title="Monthly purchase trend" description="Total stock-in spend, last 7 months" />
          <CardBody>
            <TrendChart data={d.purchaseTrend} color={CHART_COLORS.solder} type="bar" currency />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Monthly expense trend" description="Rent, utilities, and overhead, last 7 months" />
          <CardBody>
            <TrendChart data={d.expenseTrend} color={CHART_COLORS.trace} type="bar" currency />
          </CardBody>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Recent purchases" action={<button onClick={() => navigate("/purchases")} className="text-[12.5px] font-medium text-rose hover:underline">View all</button>} />
          {recentPurchases.length === 0 ? (
            <EmptyState title="No purchases yet" description="Stock-ins will show up here as they're recorded." />
          ) : (
            <DataTable
              columns={[
                { key: "product", header: "Product", render: (r) => r.product?.name ?? "—" },
                { key: "quantity", header: "Qty", align: "right", mono: true },
                { key: "unitPrice", header: "Unit price", align: "right", mono: true, render: (r) => formatCurrency(r.unitPrice) },
                { key: "date", header: "Date", render: (r) => formatDate(r.date) },
              ]}
              rows={recentPurchases}
              keyField="_id"
              pageSize={6}
            />
          )}
        </Card>

        <Card>
          <CardHeader title="Open due & credit balances" action={<button onClick={() => navigate("/customers/dues")} className="text-[12.5px] font-medium text-rose hover:underline">View all</button>} />
          {openDues.length === 0 ? (
            <EmptyState
              icon={HandCoins}
              title="Nothing outstanding"
              description="Every due and credit balance is settled."
            />
          ) : (
            <DataTable
              columns={[
                { key: "customer", header: "Customer", render: (r) => r.customer?.name ?? "—" },
                { key: "remainingDue", header: "Remaining", align: "right", mono: true, render: (r) => formatCurrency(r.remainingDue) },
                { key: "type", header: "Type", render: (r) => <AssetTag tone={r.type === "credit" ? "trace" : "rose"}>{r.type === "credit" ? "To pay" : "To collect"}</AssetTag> },
              ]}
              rows={openDues}
              keyField="_id"
              pageSize={6}
            />
          )}
        </Card>
      </div>
    </div>
  );
}
