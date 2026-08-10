import { useId, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { Input, Select, Label, FieldError } from "../components/ui/Field";
import Button from "../components/ui/Button";
import {
  useGetCategoriesQuery,
  useGetBrandsQuery,
  useCreateProductMutation,
  useCreateCategoryMutation,
  useCreateBrandMutation,
} from "../app/apiSlice";
import { pushed } from "../features/toast/toastSlice";

const emptyRow = () => ({
  key: crypto.randomUUID(),
  name: "",
  brand: "",
  category: "",
  shop: "Shop 1",
  quantity: "",
  wholesalePrice: "",
  sellingPrice: "",
});

const ROW_GRID = "grid grid-cols-[minmax(180px,2fr)_minmax(130px,1.1fr)_minmax(130px,1.1fr)_100px_84px_112px_140px_32px] gap-2";

function validateRow(row) {
  const errors = [];
  if (!row.name.trim()) errors.push("product name");
  if (!row.brand.trim()) errors.push("brand");
  if (!row.quantity || Number(row.quantity) < 1) errors.push("starting quantity");
  if (row.wholesalePrice !== "" && Number(row.wholesalePrice) < 0) errors.push("wholesale price");
  if (errors.length === 0) return null;
  return `Missing or invalid: ${errors.join(", ")}.`;
}

// Resolves a brand/category name to an id, creating it if new — and records
// the newly-created entity in `known` so a second row in the same batch that
// types the same new name reuses it instead of creating a duplicate.
async function resolveEntity(name, known, createMutation) {
  const key = name.trim().toLowerCase();
  const existing = known.find((x) => x.name.toLowerCase() === key);
  if (existing) return existing._id;
  const res = await createMutation(name.trim()).unwrap();
  known.push(res.data);
  return res.data._id;
}

export default function AddProduct() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const brandListId = useId();
  const categoryListId = useId();
  const { data: categoriesRes } = useGetCategoriesQuery();
  const { data: brandsRes } = useGetBrandsQuery();
  const [createProduct] = useCreateProductMutation();
  const [createCategory] = useCreateCategoryMutation();
  const [createBrand] = useCreateBrandMutation();

  const categories = categoriesRes?.data ?? [];
  const brands = brandsRes?.data ?? [];

  const [rows, setRows] = useState([emptyRow()]);
  const [rowErrors, setRowErrors] = useState({});
  const [saving, setSaving] = useState(false);

  function updateRow(key, field, value) {
    setRows((list) => list.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }

  function addRow() {
    setRows((list) => [...list, emptyRow()]);
  }

  function removeRow(key) {
    setRows((list) => (list.length === 1 ? list : list.filter((r) => r.key !== key)));
    setRowErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const nextRowErrors = {};
    rows.forEach((row) => {
      const message = validateRow(row);
      if (message) nextRowErrors[row.key] = message;
    });
    if (Object.keys(nextRowErrors).length > 0) {
      setRowErrors(nextRowErrors);
      return;
    }
    setRowErrors({});

    setSaving(true);
    const knownBrands = [...brands];
    const knownCategories = [...categories];
    const failed = {};
    let addedCount = 0;

    for (const row of rows) {
      try {
        const [brandId, categoryId] = await Promise.all([
          resolveEntity(row.brand, knownBrands, createBrand),
          row.category.trim() ? resolveEntity(row.category, knownCategories, createCategory) : Promise.resolve(undefined),
        ]);
        await createProduct({
          name: row.name.trim(),
          brand: brandId,
          category: categoryId,
          shop: row.shop,
          quantity: Number(row.quantity),
          wholesalePrice: row.wholesalePrice === "" ? undefined : Number(row.wholesalePrice),
          sellingPrice: row.sellingPrice.trim() || undefined,
        }).unwrap();
        addedCount += 1;
      } catch (err) {
        failed[row.key] = err?.data?.message ?? "Couldn't save this product.";
      }
    }
    setSaving(false);

    if (addedCount > 0) {
      dispatch(pushed({ message: `${addedCount} product${addedCount > 1 ? "s" : ""} added to the catalog.` }));
    }

    if (Object.keys(failed).length === 0) {
      navigate("/products");
    } else {
      setRows((prev) => prev.filter((r) => failed[r.key]));
      setRowErrors(failed);
      if (addedCount === 0) {
        dispatch(pushed({ message: "Nothing was saved — fix the highlighted rows and try again.", variant: "error" }));
      }
    }
  }

  return (
    <div>
      <PageHeader
        title="Add products"
        description="Add one product or several at once. Starting stock is recorded as each product's first purchase — later restocks go through Purchase Entry. Wholesale price is optional and can be set or changed anytime from the Products page."
      />

      <Card>
        <CardHeader title="Product details" description="Selling price can be a range, e.g. 15000-16000." />
        <CardBody>
          <form onSubmit={handleSubmit}>
            <div className="overflow-x-auto">
              <div className="min-w-[1000px]">
                <div className={ROW_GRID}>
                  <Label>Product name</Label>
                  <Label>Brand</Label>
                  <Label>Category (optional)</Label>
                  <Label>Shop</Label>
                  <Label>Qty</Label>
                  <Label>Wholesale price (optional)</Label>
                  <Label>Selling price (optional)</Label>
                  <span />
                </div>

                <div className="space-y-2">
                  {rows.map((row) => (
                    <div key={row.key}>
                      <div className={ROW_GRID}>
                        <Input
                          aria-label="Product name"
                          value={row.name}
                          onChange={(e) => updateRow(row.key, "name", e.target.value)}
                          placeholder="e.g. ThinkPad E14 Gen 5"
                        />
                        <Input
                          aria-label="Brand"
                          list={brandListId}
                          value={row.brand}
                          onChange={(e) => updateRow(row.key, "brand", e.target.value)}
                          placeholder="Type or pick"
                        />
                        <Input
                          aria-label="Category"
                          list={categoryListId}
                          value={row.category}
                          onChange={(e) => updateRow(row.key, "category", e.target.value)}
                          placeholder="Type or pick"
                        />
                        <Select
                          aria-label="Shop"
                          value={row.shop}
                          onChange={(e) => updateRow(row.key, "shop", e.target.value)}
                          className="!h-10"
                        >
                          <option value="Shop 1">Shop 1</option>
                          <option value="Shop 2">Shop 2</option>
                        </Select>
                        <Input
                          aria-label="Starting quantity"
                          type="number"
                          min="1"
                          step="1"
                          value={row.quantity}
                          onChange={(e) => updateRow(row.key, "quantity", e.target.value)}
                          placeholder="0"
                        />
                        <Input
                          aria-label="Wholesale price"
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.wholesalePrice}
                          onChange={(e) => updateRow(row.key, "wholesalePrice", e.target.value)}
                          placeholder="0.00"
                        />
                        <Input
                          aria-label="Selling price"
                          value={row.sellingPrice}
                          onChange={(e) => updateRow(row.key, "sellingPrice", e.target.value)}
                          placeholder="15000-16000"
                        />
                        <button
                          type="button"
                          onClick={() => removeRow(row.key)}
                          disabled={rows.length === 1}
                          aria-label="Remove row"
                          className="flex h-10 w-8 shrink-0 items-center justify-center rounded-[5px] text-text-faint hover:bg-fault/10 hover:text-fault disabled:pointer-events-none disabled:opacity-30"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <FieldError>{rowErrors[row.key]}</FieldError>
                    </div>
                  ))}
                </div>

                <datalist id={brandListId}>
                  {brands.map((b) => (
                    <option key={b._id} value={b.name} />
                  ))}
                </datalist>
                <datalist id={categoryListId}>
                  {categories.map((c) => (
                    <option key={c._id} value={c.name} />
                  ))}
                </datalist>
              </div>
            </div>

            <button
              type="button"
              onClick={addRow}
              className="mt-3 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-rose hover:underline"
            >
              <Plus size={15} /> Add another product
            </button>

            <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
              <p className="text-[13px] text-text-muted">
                {rows.length} product{rows.length > 1 ? "s" : ""} ready to save
              </p>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : rows.length > 1 ? `Save ${rows.length} products` : "Save product"}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
