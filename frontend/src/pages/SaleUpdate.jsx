import { useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { Plus, ShoppingCart, Trash2 } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import { Card } from "../components/ui/Card";
import { Input, Select, Textarea, Label, FieldGroup } from "../components/ui/Field";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import AssetTag from "../components/ui/AssetTag";
import DataTable from "../components/ui/DataTable";
import EmptyState from "../components/ui/EmptyState";
import { SkeletonRows } from "../components/ui/Skeleton";
import StatusStrip from "../components/dashboard/StatusStrip";
import ProductPicker from "../components/ui/ProductPicker";
import { useGetProductsQuery, useGetSalesQuery, useCreateSaleMutation } from "../app/apiSlice";
import { pushed } from "../features/toast/toastSlice";
import { formatCurrency, formatDate, toLocalDateInput } from "../lib/format";
import { SHOPS, SHOP_TONE } from "../lib/shops";

const today = () => toLocalDateInput();
const emptyItem = () => ({ productId: "", quantity: 1, unitPrice: "" });

function RecordSaleModal({ open, onClose }) {
  const dispatch = useDispatch();
  const { data: productsRes } = useGetProductsQuery({ limit: 100000 });
  const [createSale, { isLoading: saving }] = useCreateSaleMutation();

  const products = productsRes?.data ?? [];

  // No "all shops" choice — a sale happens at one physical shop, and every
  // item in it must come from that shop's stock (enforced server-side too).
  const [shop, setShop] = useState("");
  const [items, setItems] = useState([emptyItem()]);
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const shopProducts = useMemo(() => products.filter((p) => p.shop === shop), [products, shop]);

  const totalAmount = items.reduce((sum, item) => sum + Number(item.unitPrice || 0) * Number(item.quantity || 0), 0);

  function reset() {
    setShop("");
    setItems([emptyItem()]);
    setDate(today());
    setNotes("");
    setError("");
  }

  function changeShop(value) {
    setShop(value);
    setItems((list) => list.map((it) => ({ ...it, productId: "" })));
  }

  function updateItem(index, field, value) {
    setItems((list) => list.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  }

  function addItem() {
    setItems((list) => [...list, emptyItem()]);
  }

  function removeItem(index) {
    setItems((list) => list.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!shop) {
      setError("Choose a shop before adding products.");
      return;
    }
    if (items.some((it) => !it.productId)) {
      setError("Choose a product for every line item.");
      return;
    }
    if (items.some((it) => !it.quantity || Number(it.quantity) <= 0)) {
      setError("Enter a quantity greater than zero for every line item.");
      return;
    }
    if (items.some((it) => it.unitPrice === "" || Number(it.unitPrice) < 0)) {
      setError("Enter a unit price for every line item.");
      return;
    }
    for (const item of items) {
      const product = products.find((p) => p._id === item.productId);
      if (product && Number(item.quantity) > product.currentStock) {
        setError(`Only ${product.currentStock} of "${product.name}" in stock.`);
        return;
      }
    }

    try {
      await createSale({
        shop,
        items: items.map((it) => ({ product: it.productId, quantity: Number(it.quantity), unitPrice: Number(it.unitPrice) })),
        date,
        notes: notes.trim(),
      }).unwrap();
      dispatch(pushed({ message: `Sale of ${formatCurrency(totalAmount)} recorded.` }));
      reset();
      onClose();
    } catch (err) {
      setError(err?.data?.message ?? "Couldn't save this sale.");
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Record sale"
      description="Add every product sold in this sale — stock and totals update automatically."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FieldGroup>
          <Label htmlFor="sale-shop" hint="every item in this sale comes from its stock">Shop</Label>
          <Select id="sale-shop" value={shop} onChange={(e) => changeShop(e.target.value)}>
            <option value="" disabled>Select a shop</option>
            {SHOPS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </FieldGroup>

        <div>
          <Label>Products sold</Label>
          <div className="space-y-2">
            {!shop ? (
              <p className="rounded-[6px] border border-dashed border-border-strong px-3 py-2.5 text-[13px] text-text-faint">
                Choose a shop above to search its products.
              </p>
            ) : (
              items.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <ProductPicker
                  products={shopProducts}
                  value={item.productId}
                  onChange={(id) => updateItem(index, "productId", id)}
                  placeholder="Search products…"
                />
                <Input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, "quantity", e.target.value)}
                  placeholder="Qty"
                  className="!w-16 shrink-0"
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unitPrice}
                  onChange={(e) => updateItem(index, "unitPrice", e.target.value)}
                  placeholder="Unit price"
                  className="!w-24 shrink-0"
                />
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  disabled={items.length === 1}
                  aria-label="Remove item"
                  className="shrink-0 rounded-[5px] p-2 text-text-faint hover:bg-bg-sunken hover:text-fault disabled:opacity-30"
                >
                  <Trash2 size={15} />
                </button>
              </div>
              ))
            )}
          </div>
          {shop && (
            <button type="button" onClick={addItem} className="mt-2 text-[12.5px] font-medium text-rose hover:underline">
              + Add another product
            </button>
          )}
        </div>

        <FieldGroup>
          <Label htmlFor="sale-date">Date</Label>
          <Input id="sale-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </FieldGroup>

        <FieldGroup>
          <Label htmlFor="sale-notes" hint="optional">Notes</Label>
          <Textarea id="sale-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Buyer, receipt number, etc." />
        </FieldGroup>

        <div className="flex items-center justify-between rounded-[6px] border border-border bg-bg-sunken px-3.5 py-2.5">
          <span className="text-[13px] text-text-muted">Total</span>
          <span className="font-mono text-[15px] font-semibold text-text">{formatCurrency(totalAmount)}</span>
        </div>

        {error && <p className="text-[12.5px] text-fault">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save sale"}</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function SaleUpdate() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [shopFilter, setShopFilter] = useState("all");
  const [recordOpen, setRecordOpen] = useState(false);

  const queryParams = useMemo(() => {
    const params = { limit: 200 };
    if (from) params.from = from;
    if (to) params.to = to;
    if (shopFilter !== "all") params.shop = shopFilter;
    return params;
  }, [from, to, shopFilter]);

  const { data: salesRes, isLoading } = useGetSalesQuery(queryParams);
  const sales = salesRes?.data ?? [];

  const rows = useMemo(
    () =>
      sales.map((s) => ({
        ...s,
        itemsLabel: s.items.map((it) => `${it.product?.name ?? "Product"} × ${it.quantity}`).join(", "),
        itemCount: s.items.reduce((sum, it) => sum + it.quantity, 0),
      })),
    [sales]
  );

  const totalRevenue = rows.reduce((s, r) => s + r.totalAmount, 0);

  function setToday() {
    const t = today();
    setFrom(t);
    setTo(t);
  }

  function setThisMonth() {
    const now = new Date();
    const first = toLocalDateInput(new Date(now.getFullYear(), now.getMonth(), 1));
    const last = toLocalDateInput(new Date(now.getFullYear(), now.getMonth() + 1, 0));
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
        title="Sale Update"
        description="Record what's sold — stock updates automatically for every item."
        action={
          <Button onClick={() => setRecordOpen(true)}>
            <Plus size={16} /> Record sale
          </Button>
        }
      />

      <div className="mb-5">
        <StatusStrip
          segments={[
            { label: "Sales shown", value: rows.length },
            { label: "Total revenue", value: formatCurrency(totalRevenue) },
          ]}
        />
      </div>

      <Card>
        {isLoading ? (
          <SkeletonRows rows={7} cols={5} />
        ) : (
          <DataTable
            filters={
              <>
                <button type="button" onClick={setToday} className="h-8.5 rounded-[5px] border border-border-strong px-3 text-[13px] text-text hover:bg-bg-sunken">
                  Today
                </button>
                <button type="button" onClick={setThisMonth} className="h-8.5 rounded-[5px] border border-border-strong px-3 text-[13px] text-text hover:bg-bg-sunken">
                  This month
                </button>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="!h-8.5 w-36 !text-[13px]" />
                <span className="text-[13px] text-text-faint">to</span>
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="!h-8.5 w-36 !text-[13px]" />
                {(from || to) && (
                  <button type="button" onClick={clearRange} className="text-[12.5px] font-medium text-text-faint hover:text-text hover:underline">
                    Clear
                  </button>
                )}
                <Select value={shopFilter} onChange={(e) => setShopFilter(e.target.value)} className="!h-8.5 w-36 !text-[13px]">
                  <option value="all">All shops</option>
                  {SHOPS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Select>
              </>
            }
            columns={[
              { key: "date", header: "Date", render: (r) => formatDate(r.date) },
              { key: "shop", header: "Shop", render: (r) => <AssetTag tone={SHOP_TONE[r.shop]}>{r.shop}</AssetTag> },
              { key: "itemsLabel", header: "Items sold", render: (r) => <span className="text-[12.5px] text-text-muted">{r.itemsLabel}</span> },
              { key: "itemCount", header: "Qty", align: "right", mono: true },
              { key: "totalAmount", header: "Total", align: "right", mono: true, render: (r) => formatCurrency(r.totalAmount) },
            ]}
            rows={rows}
            keyField="_id"
            pageSize={10}
            emptyState={
              <EmptyState icon={ShoppingCart} title="No sales match" description="Try a different date range, or record a new sale." />
            }
          />
        )}
      </Card>

      <RecordSaleModal open={recordOpen} onClose={() => setRecordOpen(false)} />
    </div>
  );
}
