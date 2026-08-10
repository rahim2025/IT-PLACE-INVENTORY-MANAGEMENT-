import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency, formatDate, toLocalDateInput } from "./format";

const PAGE_BOTTOM = 280;
const MARGIN_LEFT = 14;

function ensureSpace(doc, y, needed = 20) {
  if (y + needed > PAGE_BOTTOM) {
    doc.addPage();
    return 16;
  }
  return y;
}

function renderSection(doc, y, { title, countLabel, total, head, body }) {
  y = ensureSpace(doc, y, 26);

  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text(title, MARGIN_LEFT, y);
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text(countLabel, MARGIN_LEFT, y + 5);
  doc.setTextColor(0);
  y += 8;

  if (body.length === 0) {
    doc.setFontSize(9.5);
    doc.setTextColor(140);
    doc.text("Nothing in this period.", MARGIN_LEFT, y);
    doc.setTextColor(0);
    return y + 10;
  }

  autoTable(doc, {
    startY: y,
    head: [head],
    body,
    foot: [[...Array(head.length - 1).fill(""), `Subtotal: ${formatCurrency(total)}`]],
    theme: "striped",
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [30, 30, 30] },
    footStyles: { fillColor: [245, 245, 245], textColor: 20, fontStyle: "bold" },
    margin: { left: MARGIN_LEFT, right: MARGIN_LEFT },
  });

  return doc.lastAutoTable.finalY + 10;
}

// Builds and immediately downloads a PDF for the currently generated invoice
// data, respecting exactly which sections the user has toggled on.
export function downloadInvoicePdf(invoice, sections, totals) {
  const doc = new jsPDF();
  let y = 18;

  doc.setFontSize(17);
  doc.text(invoice.company.name || "Invoice", MARGIN_LEFT, y);
  y += 7;

  doc.setFontSize(9.5);
  doc.setTextColor(110);
  if (invoice.company.address) {
    doc.text(invoice.company.address, MARGIN_LEFT, y);
    y += 5;
  }
  if (invoice.company.supportEmail) {
    doc.text(invoice.company.supportEmail, MARGIN_LEFT, y);
    y += 5;
  }
  doc.setTextColor(0);

  doc.setFontSize(10.5);
  doc.text(`Period: ${formatDate(invoice.range.start)} - ${formatDate(invoice.range.end)}`, MARGIN_LEFT, y + 3);
  y += 5;
  doc.text(`Shop: ${invoice.shop ?? "All shops"}`, MARGIN_LEFT, y + 3);
  y += 12;

  if (sections.sales) {
    y = renderSection(doc, y, {
      title: "Sales",
      countLabel: `${invoice.sales.count} sale${invoice.sales.count === 1 ? "" : "s"} · ${invoice.sales.quantity} units`,
      total: invoice.sales.total,
      head: ["Date", "Product", "Qty", "Unit price", "Total"],
      body: invoice.sales.items.map((i) => [formatDate(i.date), i.product, String(i.quantity), formatCurrency(i.unitPrice), formatCurrency(i.lineTotal)]),
    });
  }

  if (sections.employeeCost) {
    y = renderSection(doc, y, {
      title: "Employee cost",
      countLabel: `${invoice.employeeCost.count} transaction${invoice.employeeCost.count === 1 ? "" : "s"}`,
      total: invoice.employeeCost.total,
      head: ["Date", "Employee", "Type", "Amount"],
      body: invoice.employeeCost.items.map((i) => [formatDate(i.date), i.employee, i.type, formatCurrency(i.amount)]),
    });
  }

  if (sections.brokerCost) {
    y = renderSection(doc, y, {
      title: "Broker cost",
      countLabel: `${invoice.brokerCost.count} payout${invoice.brokerCost.count === 1 ? "" : "s"}`,
      total: invoice.brokerCost.total,
      head: ["Date", "Broker", "Amount"],
      body: invoice.brokerCost.items.map((i) => [formatDate(i.date), i.broker, formatCurrency(i.amount)]),
    });
  }

  if (sections.expenses) {
    y = renderSection(doc, y, {
      title: "Expenses",
      countLabel: `${invoice.expenses.count} expense${invoice.expenses.count === 1 ? "" : "s"}`,
      total: invoice.expenses.total,
      head: ["Date", "Category", "Description", "Amount"],
      body: invoice.expenses.items.map((i) => [formatDate(i.date), i.category, i.description, formatCurrency(i.amount)]),
    });
  }

  y = ensureSpace(doc, y, 30);
  doc.setDrawColor(200);
  doc.line(MARGIN_LEFT, y, 196, y);
  y += 8;

  doc.setFontSize(11);
  doc.text(`Total revenue: ${formatCurrency(totals.revenue)}`, MARGIN_LEFT, y);
  y += 6;
  doc.text(`Total cost: ${formatCurrency(totals.cost)}`, MARGIN_LEFT, y);
  y += 8;
  doc.setFontSize(13);
  doc.setFont(undefined, "bold");
  doc.text(`Net: ${formatCurrency(totals.net)}`, MARGIN_LEFT, y);
  doc.setFont(undefined, "normal");

  const shopSlug = invoice.shop && invoice.shop !== "All shops" ? `-${invoice.shop.toLowerCase().replace(/\s+/g, "-")}` : "";
  doc.save(`invoice${shopSlug}-${toLocalDateInput()}.pdf`);
}
