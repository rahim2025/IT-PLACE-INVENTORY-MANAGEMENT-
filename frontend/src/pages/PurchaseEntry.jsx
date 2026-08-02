import { useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/ui/PageHeader";
import { Card, CardHeader, CardBody } from "../components/ui/Card";
import { Input, Textarea, Label, FieldGroup, FieldError } from "../components/ui/Field";
import Button from "../components/ui/Button";
import ProductPicker from "../components/ui/ProductPicker";
import {
  useGetProductsQuery,
  useGetSuppliersQuery,
  useGetPurchasesQuery,
  useCreatePurchaseMutation,
} from "../app/apiSlice";
import { pushed } from "../features/toast/toastSlice";
import { weightedAverage, formatCurrency } from "../lib/format";

const today = () => new Date().toISOString().slice(0, 10);

export default function PurchaseEntry() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { data: productsRes } = useGetProductsQuery({ limit: 200 });
  const { data: suppliersRes } = useGetSuppliersQuery();
  const [createPurchase, { isLoading: saving }] = useCreatePurchaseMutation();

  const products = productsRes?.data ?? [];
  const suppliers = suppliersRes?.data ?? [];

  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [supplier, setSupplier] = useState("");
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState({});

  const selectedProduct = products.find((p) => p._id === productId);
  const { data: historyRes } = useGetPurchasesQuery({ product: productId, limit: 200 }, { skip: !productId });
  const history = historyRes?.data ?? [];

  // Mirrors purchaseController.createPurchase: once a product has gone out of
  // stock, only purchases since that point count toward its average — older,
  // pre-stockout prices shouldn't get blended into this preview either.
  const cycleHistory = useMemo(() => {
    if (!selectedProduct?.stockResetAt) return history;
    const resetAt = new Date(selectedProduct.stockResetAt).getTime();
    return history.filter((h) => new Date(h.createdAt).getTime() >= resetAt);
  }, [history, selectedProduct]);

  const preview = useMemo(() => {
    if (!productId || !quantity || !unitPrice) return null;
    const candidate = [...cycleHistory, { quantity: Number(quantity), unitPrice: Number(unitPrice) }];
    return {
      newAvg: weightedAverage(candidate),
      newStock: (selectedProduct?.currentStock ?? 0) + Number(quantity),
    };
  }, [productId, quantity, unitPrice, cycleHistory, selectedProduct]);

  // cycleHistory is sorted newest-first by the API; reverse the last 5 so the
  // row reads oldest → newest, ending with the most recent buying price.
  const lastPrices = useMemo(
    () => cycleHistory.slice(0, 5).reverse().map((h) => ({ unitPrice: h.unitPrice, quantity: h.quantity })),
    [cycleHistory]
  );

  function validate() {
    const next = {};
    if (!productId) next.productId = "Choose a product.";
    if (!quantity || Number(quantity) <= 0) next.quantity = "Enter a quantity greater than zero.";
    if (!unitPrice || Number(unitPrice) < 0) next.unitPrice = "Enter a unit buying price.";
    if (!date) next.date = "Choose a purchase date.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    try {
      await createPurchase({
        product: productId,
        quantity: Number(quantity),
        unitPrice: Number(unitPrice),
        date
        
      }).unwrap();
      dispatch(pushed({ message: `Stocked in ${quantity} × ${selectedProduct?.name}.` }));
      navigate("/purchases");
    } catch (err) {
      dispatch(pushed({ message: err?.data?.message ?? "Couldn't record this purchase.", variant: "error" }));
    }
  }

  return (
    <div>
      <PageHeader
        title="Purchase entry"
        description="Every stock-in is a purchase record. Prior costs are never overwritten — the average updates instead."
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="New purchase" />
          <CardBody>
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              <FieldGroup className="sm:col-span-2">
                <Label htmlFor="product">Product</Label>
                <ProductPicker
                  products={products}
                  value={productId}
                  onChange={setProductId}
                  placeholder="Search products…"
                />
                <FieldError>{errors.productId}</FieldError>
              </FieldGroup>

              <FieldGroup>
                <Label htmlFor="quantity">Quantity</Label>
                <Input id="quantity" type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" />
                <FieldError>{errors.quantity}</FieldError>
              </FieldGroup>

              <FieldGroup>
                <Label htmlFor="unitPrice">Unit buying price</Label>
                <Input id="unitPrice" type="number" min="0" step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} placeholder="0.00" />
                <FieldError>{errors.unitPrice}</FieldError>
              </FieldGroup>


              <FieldGroup>
                <Label htmlFor="date">Purchase date</Label>
                <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                <FieldError>{errors.date}</FieldError>
              </FieldGroup>


              <div className="sm:col-span-2">
                <Button type="submit" className="w-full sm:w-auto" disabled={saving}>
                  {saving ? "Recording…" : "Record purchase"}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        <Card className="h-fit">
          <CardHeader title="Cost impact" description="Recalculated live as you type" />
          <CardBody className="space-y-4">
            {!selectedProduct ? (
              <p className="text-[13px] text-text-muted">Choose a product to preview its updated cost and stock.</p>
            ) : (
              <>
                <div>
                  <p className="font-mono text-[10.5px] uppercase tracking-wide text-text-faint">Current avg. cost</p>
                  <p className="mt-1 font-mono text-lg text-text">{formatCurrency(selectedProduct.avgBuyingPrice)}</p>
                </div>
                <div>
                  <p className="font-mono text-[10.5px] uppercase tracking-wide text-text-faint">New avg. cost</p>
                  <p className="mt-1 font-mono text-lg font-semibold text-rose">
                    {preview ? formatCurrency(preview.newAvg) : "—"}
                  </p>
                </div>
                {lastPrices.length > 0 && (
                  <div className="border-t border-border pt-4">
                    <p className="font-mono text-[10.5px] uppercase tracking-wide text-text-faint">Last buying prices</p>
                    <p className="mt-1 flex flex-wrap items-center gap-1.5 font-mono text-[13px] text-text">
                      {lastPrices.map((entry, i) => (
                        <span key={i} className="flex items-center gap-1.5">
                          {i > 0 && <span className="text-text-faint">→</span>}
                          <span>
                            {formatCurrency(entry.unitPrice)} <span className="text-text-faint">({entry.quantity})</span>
                          </span>
                        </span>
                      ))}
                    </p>
                  </div>
                )}
                <div className="border-t border-border pt-4">
                  <p className="font-mono text-[10.5px] uppercase tracking-wide text-text-faint">Stock on hand</p>
                  <p className="mt-1 font-mono text-lg text-text">
                    {selectedProduct.currentStock} <span className="text-text-faint">→</span>{" "}
                    <span className="font-semibold text-solder">{preview ? preview.newStock : selectedProduct.currentStock}</span>
                  </p>
                </div>
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
