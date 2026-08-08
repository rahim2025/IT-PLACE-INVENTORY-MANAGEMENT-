import { useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/ui/PageHeader";
import { Card, CardHeader, CardBody } from "../components/ui/Card";
import { Input, Label, FieldGroup, FieldError } from "../components/ui/Field";
import Button from "../components/ui/Button";
import ProductPicker from "../components/ui/ProductPicker";
import { useGetProductsQuery, useCreatePurchaseMutation } from "../app/apiSlice";
import { pushed } from "../features/toast/toastSlice";

const today = () => new Date().toISOString().slice(0, 10);

export default function PurchaseEntry() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { data: productsRes } = useGetProductsQuery({ limit: 100000 });
  const [createPurchase, { isLoading: saving }] = useCreatePurchaseMutation();

  const products = productsRes?.data ?? [];

  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [wholesalePrice, setWholesalePrice] = useState("");
  const [date, setDate] = useState(today());
  const [errors, setErrors] = useState({});

  const selectedProduct = products.find((p) => p._id === productId);

  const preview = useMemo(() => {
    if (!productId || !quantity) return null;
    return { newStock: (selectedProduct?.currentStock ?? 0) + Number(quantity) };
  }, [productId, quantity, selectedProduct]);

  function validate() {
    const next = {};
    if (!productId) next.productId = "Choose a product.";
    if (!quantity || Number(quantity) <= 0) next.quantity = "Enter a quantity greater than zero.";
    if (wholesalePrice !== "" && Number(wholesalePrice) < 0) next.wholesalePrice = "Enter a valid wholesale price.";
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
        unitPrice: wholesalePrice === "" ? undefined : Number(wholesalePrice),
        date,
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
        description="Every stock-in is a purchase record, kept for the shop's cost history and spend reports."
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
                <Label htmlFor="wholesalePrice" hint="optional">Wholesale price</Label>
                <Input id="wholesalePrice" type="number" min="0" step="0.01" value={wholesalePrice} onChange={(e) => setWholesalePrice(e.target.value)} placeholder="0.00" />
                <FieldError>{errors.wholesalePrice}</FieldError>
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
          <CardHeader title="Stock impact" description="Recalculated live as you type" />
          <CardBody className="space-y-4">
            {!selectedProduct ? (
              <p className="text-[13px] text-text-muted">Choose a product to preview its updated stock.</p>
            ) : (
              <div>
                <p className="font-mono text-[10.5px] uppercase tracking-wide text-text-faint">Stock on hand</p>
                <p className="mt-1 font-mono text-lg text-text">
                  {selectedProduct.currentStock} <span className="text-text-faint">→</span>{" "}
                  <span className="font-semibold text-solder">{preview ? preview.newStock : selectedProduct.currentStock}</span>
                </p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
