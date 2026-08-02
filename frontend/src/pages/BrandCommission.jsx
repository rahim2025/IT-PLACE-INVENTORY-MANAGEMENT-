import { useMemo, useState } from "react";
import { Percent } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import { Card } from "../components/ui/Card";
import { Select, Input, Label, FieldGroup } from "../components/ui/Field";
import DataTable from "../components/ui/DataTable";
import EmptyState from "../components/ui/EmptyState";
import { SkeletonRows } from "../components/ui/Skeleton";
import StatusStrip from "../components/dashboard/StatusStrip";
import { useGetBrandsQuery, useGetSalesQuery } from "../app/apiSlice";
import { formatCurrency, formatDate, formatNumber } from "../lib/format";

const today = () => new Date().toISOString().slice(0, 10);

export default function BrandCommission() {
  const { data: brandsRes } = useGetBrandsQuery();
  const brands = brandsRes?.data ?? [];

  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [rate, setRate] = useState(20);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Convenience default — pre-select a brand literally named "Minipro" until
  // the user picks something else, since that's the deal this report exists
  // for. Derived directly (no effect/setState) so it can't fight manual choice.
  const defaultBrandId = useMemo(
    () => brands.find((b) => b.name.toLowerCase() === "minipro")?._id ?? "",
    [brands]
  );
  const brandId = selectedBrandId || defaultBrandId;

  const queryParams = useMemo(() => {
    const params = { limit: 200 };
    if (from) params.from = from;
    if (to) params.to = to;
    return params;
  }, [from, to]);

  const { data: salesRes, isLoading } = useGetSalesQuery(queryParams);
  const sales = salesRes?.data ?? [];

  const selectedBrand = brands.find((b) => b._id === brandId);

  const rows = useMemo(() => {
    if (!brandId) return [];
    const list = [];
    for (const sale of sales) {
      for (const item of sale.items) {
        if (item.product?.brand?._id !== brandId) continue;
        list.push({
          key: `${sale._id}-${item.product?._id}-${list.length}`,
          date: sale.date,
          productName: item.product?.name ?? "Unknown product",
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.quantity * item.unitPrice,
        });
      }
    }
    return list;
  }, [sales, brandId]);

  const totalQuantity = rows.reduce((s, r) => s + r.quantity, 0);
  const totalRevenue = rows.reduce((s, r) => s + r.lineTotal, 0);
  const commissionOwed = totalRevenue * (Number(rate || 0) / 100);

  function setToday() {
    const t = today();
    setFrom(t);
    setTo(t);
  }

  function setThisMonth() {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
    setFrom(first);
    setTo(last);
  }

  function clearRange() {
    setFrom("");
    setTo("");
  }

  return (
    <div>
      <PageHeader
        title="Brand Commission"
        description="See what's sold for a specific brand, and what commission is owed on it."
      />

      <Card className="mb-5">
        <div className="grid gap-4 p-4.5 sm:grid-cols-3">
          <FieldGroup>
            <Label htmlFor="commission-brand">Brand</Label>
            <Select id="commission-brand" value={brandId} onChange={(e) => setSelectedBrandId(e.target.value)}>
              <option value="">Choose a brand</option>
              {brands.map((b) => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </Select>
          </FieldGroup>

          <FieldGroup>
            <Label htmlFor="commission-rate">Commission rate</Label>
            <div className="relative">
              <Input
                id="commission-rate"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="pr-8"
              />
              <Percent size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-faint" />
            </div>
          </FieldGroup>

          <FieldGroup>
            <Label hint="optional">Date range</Label>
            <div className="flex items-center gap-2">
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="!h-10" />
              <span className="text-[13px] text-text-faint">to</span>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="!h-10" />
            </div>
          </FieldGroup>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border px-4.5 py-3">
          <button type="button" onClick={setToday} className="h-8.5 rounded-[5px] border border-border-strong px-3 text-[13px] text-text hover:bg-bg-sunken">
            Today
          </button>
          <button type="button" onClick={setThisMonth} className="h-8.5 rounded-[5px] border border-border-strong px-3 text-[13px] text-text hover:bg-bg-sunken">
            This month
          </button>
          {(from || to) && (
            <button type="button" onClick={clearRange} className="text-[12.5px] font-medium text-text-faint hover:text-text hover:underline">
              Clear dates
            </button>
          )}
        </div>
      </Card>

      {!brandId ? (
        <Card>
          <EmptyState icon={Percent} title="Choose a brand" description="Pick a brand above to see its sales and commission owed." />
        </Card>
      ) : (
        <>
          <div className="mb-5">
            <StatusStrip
              segments={[
                { label: "Brand", value: selectedBrand?.name ?? "—" },
                { label: "Units sold", value: formatNumber(totalQuantity) },
                { label: "Revenue", value: formatCurrency(totalRevenue) },
                { label: "Commission owed", value: formatCurrency(commissionOwed), tone: commissionOwed > 0 ? "rose" : "neutral" },
              ]}
            />
          </div>

          <Card>
            {isLoading ? (
              <SkeletonRows rows={7} cols={4} />
            ) : (
              <DataTable
                searchKeys={["productName"]}
                searchPlaceholder="Search products…"
                columns={[
                  { key: "date", header: "Date", render: (r) => formatDate(r.date) },
                  { key: "productName", header: "Product" },
                  { key: "quantity", header: "Quantity", align: "right", mono: true },
                  { key: "unitPrice", header: "Unit price", align: "right", mono: true, render: (r) => formatCurrency(r.unitPrice) },
                  { key: "lineTotal", header: "Total", align: "right", mono: true, render: (r) => formatCurrency(r.lineTotal) },
                ]}
                rows={rows}
                keyField="key"
                pageSize={10}
                emptyState={
                  <EmptyState
                    icon={Percent}
                    title="No sales for this brand"
                    description="Try a different date range, or record a sale for this brand's products."
                  />
                }
              />
            )}
          </Card>
        </>
      )}
    </div>
  );
}
