import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { Plus, Package, Pencil, Trash2 } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import { Card } from "../components/ui/Card";
import { Select, Input, Label, FieldGroup, FieldError } from "../components/ui/Field";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import AssetTag from "../components/ui/AssetTag";
import DataTable from "../components/ui/DataTable";
import EmptyState from "../components/ui/EmptyState";
import { SkeletonRows } from "../components/ui/Skeleton";
import { selectAuth } from "../features/auth/authSlice";
import {
  useGetProductsQuery,
  useGetCategoriesQuery,
  useGetBrandsQuery,
  useGetSettingsQuery,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useCreateCategoryMutation,
  useCreateBrandMutation,
} from "../app/apiSlice";
import { pushed } from "../features/toast/toastSlice";
import { formatCurrency } from "../lib/format";

const STOCK_TONE = { ok: "solder", low: "trace", out: "fault" };
const STOCK_LABEL = { ok: "In stock", low: "Low stock", out: "Out of stock" };
const SHOP_TONE = { "Shop 1": "neutral", "Shop 2": "rose" };

function getStockStatus(stock, threshold) {
  if (stock <= 0) return "out";
  if (stock <= threshold) return "low";
  return "ok";
}

function EditProductModal({ product, categories, brands, onClose }) {
  const dispatch = useDispatch();
  const [updateProduct, { isLoading: saving }] = useUpdateProductMutation();
  const [createCategory] = useCreateCategoryMutation();
  const [createBrand] = useCreateBrandMutation();

  const [form, setForm] = useState(() => ({
    name: product?.name ?? "",
    brand: product?.brand?.name ?? "",
    category: product?.category?.name ?? "",
    shop: product?.shop ?? "Shop 1",
    sellingPrice: product?.sellingPrice ?? "",
    wholesalePrice: product?.wholesalePrice ?? "",
  }));
  const [errors, setErrors] = useState({});

  if (!product) return null;

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function validate() {
    const next = {};
    if (!form.name.trim()) next.name = "Product name is required.";
    if (!form.brand.trim()) next.brand = "Choose or enter a brand.";
    if (form.wholesalePrice !== "" && Number(form.wholesalePrice) < 0) next.wholesalePrice = "Enter a valid wholesale price.";
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
    if (!form.category.trim()) return "";
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
      await updateProduct({
        id: product._id,
        name: form.name.trim(),
        brand: brandId,
        category: categoryId,
        shop: form.shop,
        sellingPrice: form.sellingPrice.trim() || undefined,
        wholesalePrice: form.wholesalePrice === "" ? "" : Number(form.wholesalePrice),
      }).unwrap();
      dispatch(pushed({ message: `${form.name.trim()} updated.` }));
      onClose();
    } catch (err) {
      const message = err?.data?.message ?? "Couldn't save changes.";
      if (err?.status === 409) {
        setErrors((prev) => ({ ...prev, name: message }));
      } else {
        dispatch(pushed({ message, variant: "error" }));
      }
    }
  }

  return (
    <Modal open={!!product} onClose={onClose} title="Edit product" description="Stock isn't editable here — it follows purchase and adjustment history. Wholesale price can be set or changed anytime." size="lg">
      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <FieldGroup className="sm:col-span-2">
          <Label htmlFor="edit-name">Product name</Label>
          <Input id="edit-name" value={form.name} onChange={(e) => update("name", e.target.value)} />
          <FieldError>{errors.name}</FieldError>
        </FieldGroup>

        <FieldGroup>
          <Label htmlFor="edit-brand" hint="type to add new">Brand</Label>
          <Input id="edit-brand" list="edit-brand-options" value={form.brand} onChange={(e) => update("brand", e.target.value)} />
          <datalist id="edit-brand-options">
            {brands.map((b) => (
              <option key={b._id} value={b.name} />
            ))}
          </datalist>
          <FieldError>{errors.brand}</FieldError>
        </FieldGroup>

        <FieldGroup>
          <Label htmlFor="edit-category" hint="optional — type to add new">Category</Label>
          <Input id="edit-category" list="edit-category-options" value={form.category} onChange={(e) => update("category", e.target.value)} />
          <datalist id="edit-category-options">
            {categories.map((c) => (
              <option key={c._id} value={c.name} />
            ))}
          </datalist>
          <FieldError>{errors.category}</FieldError>
        </FieldGroup>

        <FieldGroup>
          <Label htmlFor="edit-shop">Shop</Label>
          <Select id="edit-shop" value={form.shop} onChange={(e) => update("shop", e.target.value)}>
            <option value="Shop 1">Shop 1</option>
            <option value="Shop 2">Shop 2</option>
          </Select>
        </FieldGroup>

        <FieldGroup>
          <Label htmlFor="edit-sellingPrice" hint="optional — e.g. a range like 15000-16000">Selling price</Label>
          <Input id="edit-sellingPrice" value={form.sellingPrice} onChange={(e) => update("sellingPrice", e.target.value)} />
        </FieldGroup>

        <FieldGroup>
          <Label htmlFor="edit-wholesalePrice" hint="optional">Wholesale price</Label>
          <Input
            id="edit-wholesalePrice"
            type="number"
            min="0"
            step="0.01"
            value={form.wholesalePrice}
            onChange={(e) => update("wholesalePrice", e.target.value)}
          />
          <FieldError>{errors.wholesalePrice}</FieldError>
        </FieldGroup>

        <div className="flex justify-end gap-2 pt-1 sm:col-span-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function Products() {
  const dispatch = useDispatch();
  const { user } = useSelector(selectAuth);
  const isOwner = user?.role === "owner";
  const canAddProduct = user?.role === "owner" || user?.role === "employee";

  const { data: productsRes, isLoading } = useGetProductsQuery({ limit: 100000 });
  const { data: categoriesRes } = useGetCategoriesQuery();
  const { data: brandsRes } = useGetBrandsQuery();
  const { data: settingsRes } = useGetSettingsQuery();
  const [deleteProduct] = useDeleteProductMutation();

  const products = productsRes?.data ?? [];
  const categories = categoriesRes?.data ?? [];
  const brands = brandsRes?.data ?? [];
  const threshold = settingsRes?.data?.lowStockThreshold ?? 10;

  const [category, setCategory] = useState("all");
  const [brand, setBrand] = useState("all");
  const [shop, setShop] = useState("all");
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [deleteError, setDeleteError] = useState("");

  const rows = useMemo(
    () =>
      products.map((p) => ({
        ...p,
        brandName: p.brand?.name ?? "",
        categoryName: p.category?.name ?? "",
        stockStatus: getStockStatus(p.currentStock, threshold),
        value: p.currentStock * (p.wholesalePrice || 0),
      })),
    [products, threshold]
  );

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (category === "all" || r.categoryName === category) &&
          (brand === "all" || r.brandName === brand) &&
          (shop === "all" || r.shop === shop)
      ),
    [rows, category, brand, shop]
  );

  async function handleDelete() {
    if (!deletingProduct) return;
    try {
      await deleteProduct(deletingProduct._id).unwrap();
      dispatch(pushed({ message: `${deletingProduct.name} removed from the catalog.` }));
      setDeleteError("");
    } catch (err) {
      setDeleteError(err?.data?.message ?? "Couldn't delete this product.");
      throw err;
    }
  }

  return (
    <div>
      <PageHeader
        title="Products"
        description={`${products.length} products in the catalog · stock updates automatically from purchases, wholesale price is set manually.`}
        action={
          canAddProduct && (
            <Link to="/products/new">
              <Button>
                <Plus size={16} /> Add product
              </Button>
            </Link>
          )
        }
      />

      <Card>
        {isLoading ? (
          <SkeletonRows rows={8} cols={8} />
        ) : (
          <DataTable
            searchKeys={["name", "brandName", "barcode"]}
            searchPlaceholder="Search name, brand, barcode…"
            filters={
              <>
                <Select value={category} onChange={(e) => setCategory(e.target.value)} className="!h-8.5 w-40 !text-[13px]">
                  <option value="all">All categories</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </Select>
                <Select value={brand} onChange={(e) => setBrand(e.target.value)} className="!h-8.5 w-36 !text-[13px]">
                  <option value="all">All brands</option>
                  {brands.map((b) => (
                    <option key={b._id} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </Select>
                <Select value={shop} onChange={(e) => setShop(e.target.value)} className="!h-8.5 w-32 !text-[13px]">
                  <option value="all">All shops</option>
                  <option value="Shop 1">Shop 1</option>
                  <option value="Shop 2">Shop 2</option>
                </Select>
              </>
            }
            columns={[
              {
                key: "name",
                header: "Product",
                render: (r) => (
                  <div>
                    <p className="font-medium text-text">{r.name}</p>
                    <p className="text-[12.5px] text-text-faint">{r.brandName}</p>
                  </div>
                ),
              },
              { key: "categoryName", header: "Category" },
              {
                key: "shop",
                header: "Shop",
                render: (r) => <AssetTag tone={SHOP_TONE[r.shop]}>{r.shop}</AssetTag>,
              },
              {
                key: "stock",
                header: "Stock",
                render: (r) => (
                  <AssetTag tone={STOCK_TONE[r.stockStatus]}>
                    {r.stockStatus === "ok" ? `${r.currentStock} units` : STOCK_LABEL[r.stockStatus]}
                  </AssetTag>
                ),
              },
              { key: "wholesalePrice", header: "Wholesale price", align: "right", mono: true, render: (r) => (r.wholesalePrice ? formatCurrency(r.wholesalePrice) : "—") },
              { key: "sellingPrice", header: "Selling price", align: "right", mono: true, render: (r) => r.sellingPrice || "—" },
              { key: "value", header: "Stock value", align: "right", mono: true, render: (r) => formatCurrency(r.value) },
              ...(isOwner
                ? [
                    {
                      key: "actions",
                      header: "",
                      render: (r) => (
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => setEditingProduct(r)}
                            aria-label={`Edit ${r.name}`}
                            className="rounded-[5px] p-1.5 text-text-faint hover:bg-bg-sunken hover:text-text"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => {
                              setDeletingProduct(r);
                              setDeleteError("");
                            }}
                            aria-label={`Delete ${r.name}`}
                            className="rounded-[5px] p-1.5 text-text-faint hover:bg-fault/10 hover:text-fault"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ),
                    },
                  ]
                : []),
            ]}
            rows={filtered}
            keyField="_id"
            pageSize={9}
            emptyState={
              <EmptyState
                icon={Package}
                title="No products match"
                description="Try a different search term or clear the category and brand filters."
              />
            }
          />
        )}
      </Card>

      <EditProductModal
        key={editingProduct?._id}
        product={editingProduct}
        categories={categories}
        brands={brands}
        onClose={() => setEditingProduct(null)}
      />

      <ConfirmDialog
        open={!!deletingProduct}
        onClose={() => setDeletingProduct(null)}
        onConfirm={handleDelete}
        title={`Delete ${deletingProduct?.name ?? "product"}?`}
        description={
          deleteError ||
          "This can't be undone. Products with customer due records attached can't be deleted — keep them in the catalog instead."
        }
        confirmLabel="Delete product"
      />
    </div>
  );
}
