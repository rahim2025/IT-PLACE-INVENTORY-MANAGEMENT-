import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { Input, Label, FieldGroup, FieldError } from "../components/ui/Field";
import Button from "../components/ui/Button";
import {
  useGetCategoriesQuery,
  useGetBrandsQuery,
  useCreateProductMutation,
  useCreateCategoryMutation,
  useCreateBrandMutation,
} from "../app/apiSlice";
import { pushed } from "../features/toast/toastSlice";

const emptyForm = {
  name: "",
  brand: "",
  category: "",
  quantity: "",
  buyingPrice: "",
  sellingPrice: "",
};

export default function AddProduct() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { data: categoriesRes } = useGetCategoriesQuery();
  const { data: brandsRes } = useGetBrandsQuery();
  const [createProduct, { isLoading: saving }] = useCreateProductMutation();
  const [createCategory] = useCreateCategoryMutation();
  const [createBrand] = useCreateBrandMutation();

  const categories = categoriesRes?.data ?? [];
  const brands = brandsRes?.data ?? [];

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function validate() {
    const next = {};
    if (!form.name.trim()) next.name = "Product name is required.";
    if (!form.brand.trim()) next.brand = "Choose or enter a brand.";
    if (!form.category.trim()) next.category = "Choose or enter a category.";
    if (!form.quantity || Number(form.quantity) < 1) next.quantity = "Enter a starting quantity of at least 1.";
    if (form.buyingPrice === "" || Number(form.buyingPrice) < 0) next.buyingPrice = "Enter a valid buying price.";
    if (!form.sellingPrice.trim()) next.sellingPrice = "Enter a selling price.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function resolveBrandId() {
    const existing = brands.find((b) => b.name.toLowerCase() === form.brand.trim().toLowerCase());
    if (existing) return existing._id;
    const res = await createBrand(form.brand.trim()).unwrap();
    return res.data._id;
  }

  async function resolveCategoryId() {
    const existing = categories.find((c) => c.name.toLowerCase() === form.category.trim().toLowerCase());
    if (existing) return existing._id;
    const res = await createCategory(form.category.trim()).unwrap();
    return res.data._id;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    try {
      const [brandId, categoryId] = await Promise.all([resolveBrandId(), resolveCategoryId()]);

      await createProduct({
        name: form.name.trim(),
        brand: brandId,
        category: categoryId,
        quantity: Number(form.quantity),
        buyingPrice: Number(form.buyingPrice),
        sellingPrice: form.sellingPrice.trim(),
      }).unwrap();

      dispatch(pushed({ message: `${form.name.trim()} added to the catalog.` }));
      navigate("/products");
    } catch (err) {
      const message = err?.data?.message ?? "Couldn't save this product.";
      if (err?.status === 409) {
        setErrors((prev) => ({ ...prev, name: message }));
      } else {
        dispatch(pushed({ message, variant: "error" }));
      }
    }
  }

  return (
    <div>
      <PageHeader title="Add product" description="Starting stock and cost are recorded here as the first purchase — later restocks go through Purchase Entry." />

      <Card className="max-w-2xl">
        <CardHeader title="Product details" />
        <CardBody>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <FieldGroup className="sm:col-span-2">
              <Label htmlFor="name">Product name</Label>
              <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. ThinkPad E14 Gen 5" />
              <FieldError>{errors.name}</FieldError>
            </FieldGroup>

            <FieldGroup>
              <Label htmlFor="brand" hint="type to add new">Brand</Label>
              <Input id="brand" list="brand-options" value={form.brand} onChange={(e) => update("brand", e.target.value)} placeholder="Select or type a brand" />
              <datalist id="brand-options">
                {brands.map((b) => (
                  <option key={b._id} value={b.name} />
                ))}
              </datalist>
              <FieldError>{errors.brand}</FieldError>
            </FieldGroup>

            <FieldGroup>
              <Label htmlFor="category" hint="type to add new">Category</Label>
              <Input id="category" list="category-options" value={form.category} onChange={(e) => update("category", e.target.value)} placeholder="Select or type a category" />
              <datalist id="category-options">
                {categories.map((c) => (
                  <option key={c._id} value={c.name} />
                ))}
              </datalist>
              <FieldError>{errors.category}</FieldError>
            </FieldGroup>

            <FieldGroup>
              <Label htmlFor="quantity">Starting quantity</Label>
              <Input id="quantity" type="number" min="1" step="1" value={form.quantity} onChange={(e) => update("quantity", e.target.value)} placeholder="0" />
              <FieldError>{errors.quantity}</FieldError>
            </FieldGroup>

            <FieldGroup>
              <Label htmlFor="buyingPrice">Buying price</Label>
              <Input id="buyingPrice" type="number" min="0" step="0.01" value={form.buyingPrice} onChange={(e) => update("buyingPrice", e.target.value)} placeholder="0.00" />
              <FieldError>{errors.buyingPrice}</FieldError>
            </FieldGroup>

            <FieldGroup className="sm:col-span-2">
              <Label htmlFor="sellingPrice" hint="e.g. a range like 15000-16000">Selling price</Label>
              <Input id="sellingPrice" value={form.sellingPrice} onChange={(e) => update("sellingPrice", e.target.value)} placeholder="15000-16000" />
              <FieldError>{errors.sellingPrice}</FieldError>
            </FieldGroup>

            <div className="flex justify-end sm:col-span-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save product"}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
