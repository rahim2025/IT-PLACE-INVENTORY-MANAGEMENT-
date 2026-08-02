import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { History } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import { Card } from "../components/ui/Card";
import { Select } from "../components/ui/Field";
import DataTable from "../components/ui/DataTable";
import EmptyState from "../components/ui/EmptyState";
import { SkeletonRows } from "../components/ui/Skeleton";
import StatusStrip from "../components/dashboard/StatusStrip";
import {
  useGetPurchasesQuery,
  useGetProductsQuery,
  useGetSuppliersQuery,
  useGetCategoriesQuery,
  useGetBrandsQuery,
} from "../app/apiSlice";
import { formatCurrency, formatDate, formatNumber } from "../lib/format";

export default function PurchaseHistory() {
  const [searchParams] = useSearchParams();
  const { data: purchasesRes, isLoading } = useGetPurchasesQuery({ limit: 200 });
  const { data: productsRes } = useGetProductsQuery({ limit: 200 });
  const { data: suppliersRes } = useGetSuppliersQuery();
  const { data: categoriesRes } = useGetCategoriesQuery();
  const { data: brandsRes } = useGetBrandsQuery();

  const purchases = purchasesRes?.data ?? [];
  const products = productsRes?.data ?? [];
  const suppliers = suppliersRes?.data ?? [];
  const categories = categoriesRes?.data ?? [];
  const brands = brandsRes?.data ?? [];

  const [productId, setProductId] = useState(searchParams.get("product") ?? "all");
  const [category, setCategory] = useState("all");
  const [brand, setBrand] = useState("all");
  const [supplierId, setSupplierId] = useState("all");

  const joined = useMemo(
    () =>
      purchases.map((p) => ({
        ...p,
        productName: p.product?.name ?? "Unknown product",
        brandName: p.product?.brand?.name ?? "",
        categoryName: p.product?.category?.name ?? "",
        supplierName: p.supplier?.name ?? "—",
        lineTotal: p.quantity * p.unitPrice,
      })),
    [purchases]
  );

  const filtered = useMemo(
    () =>
      joined.filter(
        (p) =>
          (productId === "all" || p.product?._id === productId) &&
          (category === "all" || p.categoryName === category) &&
          (brand === "all" || p.brandName === brand) &&
          (supplierId === "all" || p.supplier?._id === supplierId)
      ),
    [joined, productId, category, brand, supplierId]
  );

  const selectedProduct = products.find((p) => p._id === productId);

  // Once a specific product is picked, surface its whole buying history at a
  // glance — quantity, spend, and average cost — instead of just the rows.
  const summary = useMemo(() => {
    if (!selectedProduct) return null;
    const totalQuantity = filtered.reduce((sum, p) => sum + p.quantity, 0);
    const totalSpent = filtered.reduce((sum, p) => sum + p.lineTotal, 0);
    return {
      count: filtered.length,
      totalQuantity,
      totalSpent,
      avgUnitPrice: totalQuantity ? totalSpent / totalQuantity : 0,
    };
  }, [selectedProduct, filtered]);

  return (
    <div>
      <PageHeader
        title="Purchase history"
        description={`${purchases.length} stock-in records · select a product to see its complete buying history.`}
      />

      {summary && (
        <div className="mb-5">
          <StatusStrip
            segments={[
              { label: "Product", value: selectedProduct.name },
              { label: "Purchases", value: summary.count },
              { label: "Total quantity", value: formatNumber(summary.totalQuantity) },
              { label: "Total spent", value: formatCurrency(summary.totalSpent) },
              { label: "Avg. unit price", value: formatCurrency(summary.avgUnitPrice) },
            ]}
          />
        </div>
      )}

      <Card>
        {isLoading ? (
          <SkeletonRows rows={8} cols={6} />
        ) : (
          <DataTable
            searchKeys={["productName", "supplierName"]}
            searchPlaceholder="Search product or supplier…"
            filters={
              <>
                <Select value={productId} onChange={(e) => setProductId(e.target.value)} className="!h-8.5 w-44 !text-[13px]">
                  <option value="all">All products</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </Select>
                <Select value={category} onChange={(e) => setCategory(e.target.value)} className="!h-8.5 w-36 !text-[13px]">
                  <option value="all">All categories</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c.name}>{c.name}</option>
                  ))}
                </Select>
                <Select value={brand} onChange={(e) => setBrand(e.target.value)} className="!h-8.5 w-32 !text-[13px]">
                  <option value="all">All brands</option>
                  {brands.map((b) => (
                    <option key={b._id} value={b.name}>{b.name}</option>
                  ))}
                </Select>
                <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="!h-8.5 w-44 !text-[13px]">
                  <option value="all">All suppliers</option>
                  {suppliers.map((s) => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </Select>
              </>
            }
            columns={[
              { key: "productName", header: "Product", render: (r) => (
                  <button
                    type="button"
                    onClick={() => r.product?._id && setProductId(r.product._id)}
                    className="text-left hover:underline"
                  >
                    <p className="font-medium text-text">{r.productName}</p>
                    <p className="text-[12px] text-text-faint">{r.brandName} · {r.categoryName}</p>
                  </button>
                ) },
              { key: "quantity", header: "Qty", align: "right", mono: true },
              { key: "unitPrice", header: "Unit price", align: "right", mono: true, render: (r) => formatCurrency(r.unitPrice) },
              { key: "lineTotal", header: "Total", align: "right", mono: true, render: (r) => formatCurrency(r.lineTotal) },
              { key: "supplierName", header: "Supplier" },
              { key: "date", header: "Date", render: (r) => formatDate(r.date) },
            ]}
            rows={filtered}
            keyField="_id"
            pageSize={10}
            emptyState={
              <EmptyState icon={History} title="No purchases match" description="Adjust the filters or record a new purchase entry." />
            }
          />
        )}
      </Card>
    </div>
  );
}
