import { useState } from "react";
import { useDispatch } from "react-redux";
import { SlidersHorizontal } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import { Card, CardHeader } from "../components/ui/Card";
import { Select, Input, Textarea, Label, FieldGroup, FieldError } from "../components/ui/Field";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import AssetTag from "../components/ui/AssetTag";
import DataTable from "../components/ui/DataTable";
import ProductPicker from "../components/ui/ProductPicker";
import { SkeletonRows } from "../components/ui/Skeleton";
import { useGetProductsQuery, useGetStockOverviewQuery, useCreateAdjustmentMutation } from "../app/apiSlice";
import { pushed } from "../features/toast/toastSlice";
import { formatCurrency, formatNumber } from "../lib/format";
import { SHOPS, SHOP_TONE } from "../lib/shops";

const STOCK_TONE = { ok: "solder", low: "trace", out: "fault" };
const STOCK_LABEL = { ok: "Healthy", low: "Low stock", out: "Out of stock" };

function StatTile({ label, value, tone }) {
  return (
    <Card className="px-4.5 py-3.5">
      <p className="font-mono text-[10.5px] uppercase tracking-wide text-text-faint">{label}</p>
      <p className={`mt-1.5 font-mono text-xl font-semibold font-tabular ${tone ?? "text-text"}`}>{value}</p>
    </Card>
  );
}

export default function Inventory() {
  const dispatch = useDispatch();
  const { data: overviewRes, isLoading } = useGetStockOverviewQuery();
  const { data: productsRes } = useGetProductsQuery({ limit: 100000 });
  const [createAdjustment, { isLoading: saving }] = useCreateAdjustmentMutation();

  const rows = overviewRes?.data ?? [];
  const meta = overviewRes?.meta ?? { totalStock: 0, inventoryValue: 0, lowStockCount: 0, outOfStockCount: 0 };
  const products = productsRes?.data ?? [];

  const [statusFilter, setStatusFilter] = useState("all");
  const [shopFilter, setShopFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [productId, setProductId] = useState("");
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState({});

  const filteredRows = rows.filter(
    (r) => (statusFilter === "all" || r.stockStatus === statusFilter) && (shopFilter === "all" || r.shop === shopFilter)
  );

  function resetForm() {
    setProductId("");
    setDelta("");
    setReason("");
    setErrors({});
  }

  function validate() {
    const next = {};
    if (!productId) next.productId = "Choose a product.";
    if (!delta || Number(delta) === 0) next.delta = "Enter a non-zero quantity change.";
    if (!reason.trim()) next.reason = "Explain the adjustment for the audit trail.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    const product = products.find((p) => p._id === productId);
    try {
      await createAdjustment({ product: productId, quantityChange: Number(delta), reason: reason.trim() }).unwrap();
      dispatch(pushed({ message: `Stock adjusted for ${product?.name}.` }));
      setModalOpen(false);
      resetForm();
    } catch (err) {
      dispatch(pushed({ message: err?.data?.message ?? "Couldn't save this adjustment.", variant: "error" }));
    }
  }

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Stock on hand and valuation for every product, updated automatically from purchases."
        action={
          <Button onClick={() => setModalOpen(true)}>
            <SlidersHorizontal size={16} /> Adjust stock
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Stock on hand" value={formatNumber(meta.totalStock)} />
        <StatTile label="Inventory value" value={formatCurrency(meta.inventoryValue)} />
        <StatTile label="Low stock" value={formatNumber(meta.lowStockCount)} tone={meta.lowStockCount ? "text-trace" : "text-solder"} />
        <StatTile label="Out of stock" value={formatNumber(meta.outOfStockCount)} tone={meta.outOfStockCount ? "text-fault" : "text-solder"} />
      </div>

      <Card className="mt-5">
        <CardHeader title="Stock by product" />
        {isLoading ? (
          <SkeletonRows rows={8} cols={7} />
        ) : (
          <DataTable
            searchKeys={["name"]}
            searchPlaceholder="Search products…"
            filters={
              <>
                <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="!h-8.5 w-40 !text-[13px]">
                  <option value="all">All statuses</option>
                  <option value="ok">Healthy</option>
                  <option value="low">Low stock</option>
                  <option value="out">Out of stock</option>
                </Select>
                <Select value={shopFilter} onChange={(e) => setShopFilter(e.target.value)} className="!h-8.5 w-36 !text-[13px]">
                  <option value="all">All shops</option>
                  {SHOPS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Select>
              </>
            }
            columns={[
              { key: "name", header: "Product", render: (r) => <span className="font-medium text-text">{r.name}</span> },
              { key: "brand", header: "Brand", render: (r) => r.brand?.name ?? "—" },
              { key: "category", header: "Category", render: (r) => r.category?.name ?? "—" },
              { key: "shop", header: "Shop", render: (r) => <AssetTag tone={SHOP_TONE[r.shop]}>{r.shop}</AssetTag> },
              { key: "currentStock", header: "Stock", align: "right", mono: true },
              { key: "wholesalePrice", header: "Wholesale price", align: "right", mono: true, render: (r) => (r.wholesalePrice ? formatCurrency(r.wholesalePrice) : "—") },
              { key: "value", header: "Value", align: "right", mono: true, render: (r) => formatCurrency(r.value) },
              { key: "status", header: "Status", render: (r) => <AssetTag tone={STOCK_TONE[r.stockStatus]}>{STOCK_LABEL[r.stockStatus]}</AssetTag> },
            ]}
            rows={filteredRows}
            keyField="_id"
            pageSize={8}
          />
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          resetForm();
        }}
        title="Manual stock adjustment"
        description="Use this for damage, recounts, or returns — not for new stock arriving from a supplier."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FieldGroup>
            <Label htmlFor="adj-product">Product</Label>
            <ProductPicker
              products={products}
              value={productId}
              onChange={setProductId}
              placeholder="Search products…"
            />
            <FieldError>{errors.productId}</FieldError>
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="adj-delta" hint="negative to remove, positive to add">Quantity change</Label>
            <Input id="adj-delta" type="number" value={delta} onChange={(e) => setDelta(e.target.value)} placeholder="e.g. -2 or 5" />
            <FieldError>{errors.delta}</FieldError>
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="adj-reason">Reason</Label>
            <Textarea id="adj-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. damaged in storage, recount correction" />
            <FieldError>{errors.reason}</FieldError>
          </FieldGroup>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save adjustment"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
