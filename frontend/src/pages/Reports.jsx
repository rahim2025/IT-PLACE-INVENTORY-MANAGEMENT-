import { useState } from "react";
import { useDispatch } from "react-redux";
import { Printer, Download, FileBarChart2, FileText } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import { Card, CardHeader } from "../components/ui/Card";
import { Select } from "../components/ui/Field";
import Button from "../components/ui/Button";
import AssetTag from "../components/ui/AssetTag";
import DataTable from "../components/ui/DataTable";
import EmptyState from "../components/ui/EmptyState";
import { SkeletonRows } from "../components/ui/Skeleton";
import { useGetReportQuery, useLazyGetInvoiceQuery } from "../app/apiSlice";
import { pushed } from "../features/toast/toastSlice";
import { formatCurrency, formatDate, toLocalDateInput } from "../lib/format";
import { downloadInvoicePdf } from "../lib/invoicePdf";
import { cn } from "../lib/cn";

const PERIODS = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "yearly", label: "Yearly" },
];

const TYPE_TONE = {
  Purchase: "solder",
  Expense: "trace",
  "Employee payment": "rose",
  "Broker payout": "rose",
  "Due collection": "neutral",
};

const INVOICE_SECTIONS = [
  { key: "sales", label: "Sales" },
  { key: "employeeCost", label: "Employee cost" },
  { key: "brokerCost", label: "Broker cost" },
  { key: "expenses", label: "Expenses" },
];

const INVOICE_MODES = [
  { key: "today", label: "Today" },
  { key: "month", label: "This month" },
  { key: "date", label: "Specific date" },
];

const today = () => toLocalDateInput();

function toCSV(rows) {
  const header = ["Type", "Detail", "Amount", "Date"];
  const lines = rows.map((r) => [r.type, `"${r.detail.replace(/"/g, '""')}"`, r.amount, r.date].join(","));
  return [header.join(","), ...lines].join("\n");
}

function InvoiceSection({ title, countLabel, total, tone, columns, rows }) {
  return (
    <div className="mt-4 first:mt-0">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[13.5px] font-semibold text-text">{title}</p>
          <p className="text-[12px] text-text-faint">{countLabel}</p>
        </div>
        <AssetTag tone={tone}>{formatCurrency(total)}</AssetTag>
      </div>
      {rows.length === 0 ? (
        <p className="mt-2 text-[12.5px] text-text-faint">Nothing in this period.</p>
      ) : (
        <div className="mt-2 overflow-x-auto rounded-[6px] border border-border">
          <table className="w-full border-collapse text-left text-[13px]">
            <thead>
              <tr className="border-b border-border bg-bg-sunken">
                {columns.map((c, i) => (
                  <th key={i} className="whitespace-nowrap px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-text-faint">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  {row.map((cell, j) => (
                    <td key={j} className="whitespace-nowrap px-3 py-2 text-text">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function toInvoiceCSV(invoice, sections) {
  const header = ["Section", "Date", "Detail", "Amount"];
  const lines = [];
  if (sections.sales) {
    invoice.sales.items.forEach((i) => lines.push(["Sales", formatDate(i.date), `"${i.product} × ${i.quantity} @ ${i.unitPrice}"`, i.lineTotal].join(",")));
  }
  if (sections.employeeCost) {
    invoice.employeeCost.items.forEach((i) => lines.push(["Employee cost", formatDate(i.date), `"${i.employee} — ${i.type}"`, i.amount].join(",")));
  }
  if (sections.brokerCost) {
    invoice.brokerCost.items.forEach((i) => lines.push(["Broker cost", formatDate(i.date), `"${i.broker}"`, i.amount].join(",")));
  }
  if (sections.expenses) {
    invoice.expenses.items.forEach((i) => lines.push(["Expenses", formatDate(i.date), `"${i.category} — ${i.description}"`, i.amount].join(",")));
  }
  return [header.join(","), ...lines].join("\n");
}

function computeInvoiceTotals(invoiceData, sections) {
  const revenue = sections.sales ? invoiceData?.sales.total ?? 0 : 0;
  const cost =
    (sections.employeeCost ? invoiceData?.employeeCost.total ?? 0 : 0) +
    (sections.brokerCost ? invoiceData?.brokerCost.total ?? 0 : 0) +
    (sections.expenses ? invoiceData?.expenses.total ?? 0 : 0);
  return { revenue, cost, net: revenue - cost };
}

export default function Reports() {
  const dispatch = useDispatch();
  const [period, setPeriod] = useState("monthly");
  const { data: reportRes, isLoading } = useGetReportQuery(period);

  const report = reportRes?.data;
  const rows = report?.ledger ?? [];
  const totals = report?.totals ?? {
    purchases: 0,
    stockAdded: 0,
    expenses: 0,
    employeePayments: 0,
    brokerPayments: 0,
    dueCollected: 0,
    inventoryValue: 0,
  };
  const start = report?.range?.start;
  const end = report?.range?.end;

  const [sections, setSections] = useState({ sales: true, employeeCost: true, brokerCost: true, expenses: true });
  const [invoiceMode, setInvoiceMode] = useState("today");
  const [specificDate, setSpecificDate] = useState(today());
  const [invoiceShop, setInvoiceShop] = useState("all");
  const [triggerInvoice, { data: invoiceRes, isFetching: invoiceLoading }] = useLazyGetInvoiceQuery();
  const invoice = invoiceRes?.data;

  const { revenue: invoiceRevenue, cost: invoiceCost, net: invoiceNet } = computeInvoiceTotals(invoice, sections);
  const noSectionsChosen = !Object.values(sections).some(Boolean);

  function handleExport() {
    const blob = new Blob([toCSV(rows)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `it-place-report-${period}-${toLocalDateInput()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggleSection(key) {
    setSections((s) => ({ ...s, [key]: !s[key] }));
  }

  async function handleGenerateInvoice() {
    try {
      const params = { mode: invoiceMode };
      if (invoiceMode === "date") params.date = specificDate;
      if (invoiceShop !== "all") params.shop = invoiceShop;
      const result = await triggerInvoice(params).unwrap();
      downloadInvoicePdf(result.data, sections, computeInvoiceTotals(result.data, sections));
    } catch (err) {
      dispatch(pushed({ message: err?.data?.message ?? "Couldn't generate the invoice.", variant: "error" }));
    }
  }

  function handleDownloadPdf() {
    if (!invoice) return;
    downloadInvoicePdf(invoice, sections, { revenue: invoiceRevenue, cost: invoiceCost, net: invoiceNet });
  }

  function handleExportInvoice() {
    if (!invoice) return;
    const blob = new Blob([toInvoiceCSV(invoice, sections)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const shopSlug = invoice.shop && invoice.shop !== "All shops" ? `-${invoice.shop.toLowerCase().replace(/\s+/g, "-")}` : "";
    a.download = `invoice-${invoiceMode}${shopSlug}-${toLocalDateInput()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader
        title="Reports"
        description={
          start && end
            ? `${formatDate(start)} – ${formatDate(end)} · purchases, expenses, payroll, broker payouts, and due collections in one ledger.`
            : "Purchases, expenses, payroll, broker payouts, and due collections in one ledger."
        }
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer size={15} /> Print
            </Button>
            <Button variant="secondary" onClick={handleExport}>
              <Download size={15} /> Export CSV
            </Button>
          </div>
        }
      />

      <Card className="mb-5">
        <CardHeader title="Generate invoice" description="Pick what to include and the period, then generate a company invoice." />
        <div className="space-y-4 px-4.5 py-4">
          <div>
            <p className="mb-2 text-[13px] font-medium text-text-muted">Include</p>
            <div className="flex flex-wrap gap-2">
              {INVOICE_SECTIONS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => toggleSection(s.key)}
                  className={cn(
                    "rounded-[5px] border px-3 py-1.5 text-[13px] font-medium transition-colors",
                    sections[s.key] ? "border-rose bg-rose/10 text-rose" : "border-border-strong text-text-muted hover:bg-bg-sunken"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-text-muted">Period</p>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-[6px] border border-border-strong bg-bg-sunken p-1">
                {INVOICE_MODES.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setInvoiceMode(m.key)}
                    className={cn(
                      "rounded-[4px] px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                      invoiceMode === m.key ? "bg-bg-elevated text-text shadow-sm" : "text-text-muted hover:text-text"
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              {invoiceMode === "date" && (
                <input
                  type="date"
                  value={specificDate}
                  onChange={(e) => setSpecificDate(e.target.value)}
                  className="h-9 rounded-[5px] border border-border-strong bg-bg-elevated px-3 text-[14px] text-text outline-none focus:border-rose"
                />
              )}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-text-muted">Shop</p>
            <Select value={invoiceShop} onChange={(e) => setInvoiceShop(e.target.value)} className="!h-9 w-44">
              <option value="all">All shops (sales combined)</option>
              <option value="Shop 1">Shop 1 only</option>
              <option value="Shop 2">Shop 2 only</option>
            </Select>
            <p className="mt-1.5 text-[12px] text-text-faint">
              Only the Sales section is shop-specific — costs (payroll, broker, expenses) apply to the whole business.
            </p>
          </div>

          <Button onClick={handleGenerateInvoice} disabled={invoiceLoading || noSectionsChosen}>
            <FileText size={15} /> {invoiceLoading ? "Generating…" : "Generate & download PDF"}
          </Button>
          {noSectionsChosen && <p className="text-[12.5px] text-fault">Choose at least one thing to include.</p>}
        </div>
      </Card>

      {invoice && (
        <Card className="mb-5">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-text">{invoice.company.name}</h2>
              {invoice.company.address && <p className="text-[13px] text-text-muted">{invoice.company.address}</p>}
              {invoice.company.supportEmail && <p className="text-[13px] text-text-muted">{invoice.company.supportEmail}</p>}
              <p className="mt-1.5 text-[13px] text-text-muted">
                Period: <span className="font-medium text-text">{formatDate(invoice.range.start)} – {formatDate(invoice.range.end)}</span>
              </p>
              <p className="text-[13px] text-text-muted">
                Shop: <span className="font-medium text-text">{invoice.shop}</span>
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleDownloadPdf}>
                <FileText size={15} /> Download PDF
              </Button>
              <Button variant="secondary" onClick={() => window.print()}>
                <Printer size={15} /> Print
              </Button>
              <Button variant="secondary" onClick={handleExportInvoice}>
                <Download size={15} /> Export CSV
              </Button>
            </div>
          </div>

          <div className="px-5 py-4">
            {sections.sales && (
              <InvoiceSection
                title="Sales"
                countLabel={`${invoice.sales.count} sale${invoice.sales.count === 1 ? "" : "s"} · ${invoice.sales.quantity} units`}
                total={invoice.sales.total}
                tone="solder"
                columns={["Date", "Product", "Qty", "Unit price", "Total"]}
                rows={invoice.sales.items.map((i) => [formatDate(i.date), i.product, i.quantity, formatCurrency(i.unitPrice), formatCurrency(i.lineTotal)])}
              />
            )}
            {sections.employeeCost && (
              <InvoiceSection
                title="Employee cost"
                countLabel={`${invoice.employeeCost.count} transaction${invoice.employeeCost.count === 1 ? "" : "s"}`}
                total={invoice.employeeCost.total}
                tone="rose"
                columns={["Date", "Employee", "Type", "Amount"]}
                rows={invoice.employeeCost.items.map((i) => [formatDate(i.date), i.employee, i.type, formatCurrency(i.amount)])}
              />
            )}
            {sections.brokerCost && (
              <InvoiceSection
                title="Broker cost"
                countLabel={`${invoice.brokerCost.count} payout${invoice.brokerCost.count === 1 ? "" : "s"}`}
                total={invoice.brokerCost.total}
                tone="rose"
                columns={["Date", "Broker", "Amount"]}
                rows={invoice.brokerCost.items.map((i) => [formatDate(i.date), i.broker, formatCurrency(i.amount)])}
              />
            )}
            {sections.expenses && (
              <InvoiceSection
                title="Expenses"
                countLabel={`${invoice.expenses.count} expense${invoice.expenses.count === 1 ? "" : "s"}`}
                total={invoice.expenses.total}
                tone="rose"
                columns={["Date", "Category", "Description", "Amount"]}
                rows={invoice.expenses.items.map((i) => [formatDate(i.date), i.category, i.description, formatCurrency(i.amount)])}
              />
            )}

            <div className="mt-5 grid gap-3 border-t border-border pt-4 sm:grid-cols-3">
              <div>
                <p className="font-mono text-[10.5px] uppercase tracking-wide text-text-faint">Total revenue</p>
                <p className="mt-1 font-mono text-lg font-semibold text-solder">{formatCurrency(invoiceRevenue)}</p>
              </div>
              <div>
                <p className="font-mono text-[10.5px] uppercase tracking-wide text-text-faint">Total cost</p>
                <p className="mt-1 font-mono text-lg font-semibold text-fault">{formatCurrency(invoiceCost)}</p>
              </div>
              <div>
                <p className="font-mono text-[10.5px] uppercase tracking-wide text-text-faint">Net</p>
                <p className={cn("mt-1 font-mono text-lg font-semibold", invoiceNet >= 0 ? "text-solder" : "text-fault")}>
                  {formatCurrency(invoiceNet)}
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="mb-5 inline-flex rounded-[6px] border border-border-strong bg-bg-sunken p-1">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={cn(
              "rounded-[4px] px-3.5 py-1.5 text-[13px] font-medium transition-colors",
              period === p.key ? "bg-bg-elevated text-text shadow-sm" : "text-text-muted hover:text-text"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[
          { label: "Purchases", value: formatCurrency(totals.purchases) },
          { label: "Stock added", value: `${totals.stockAdded} units` },
          { label: "Expenses", value: formatCurrency(totals.expenses) },
          { label: "Employee payments", value: formatCurrency(totals.employeePayments) },
          { label: "Broker commission paid", value: formatCurrency(totals.brokerPayments) },
          { label: "Due collected", value: formatCurrency(totals.dueCollected) },
        ].map((t) => (
          <Card key={t.label} className="px-4.5 py-3.5">
            <p className="font-mono text-[10.5px] uppercase tracking-wide text-text-faint">{t.label}</p>
            <p className="mt-1.5 font-mono text-lg font-semibold text-text">{t.value}</p>
          </Card>
        ))}
      </div>

      <div className="mt-4 rounded-[6px] border border-border bg-bg-elevated px-4.5 py-3 text-[13px] text-text-muted">
        Current inventory value (as of today): <span className="font-mono font-medium text-text">{formatCurrency(totals.inventoryValue)}</span>
      </div>

      <Card className="mt-5">
        <CardHeader title="Ledger" description="Every purchase, expense, payroll payment, broker payout, and due collection in the selected period" />
        {isLoading ? (
          <SkeletonRows rows={8} cols={4} />
        ) : (
          <DataTable
            columns={[
              { key: "type", header: "Type", render: (r) => <AssetTag tone={TYPE_TONE[r.type] ?? "neutral"}>{r.type}</AssetTag> },
              { key: "detail", header: "Detail" },
              { key: "amount", header: "Amount", align: "right", mono: true, render: (r) => formatCurrency(r.amount) },
              { key: "date", header: "Date", render: (r) => formatDate(r.date) },
            ]}
            rows={rows}
            keyField="id"
            pageSize={10}
            emptyState={<EmptyState icon={FileBarChart2} title="Nothing recorded in this period" description="Try a wider period like monthly or yearly." />}
          />
        )}
      </Card>
    </div>
  );
}
