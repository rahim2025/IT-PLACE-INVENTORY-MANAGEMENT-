import { useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { Plus, HandCoins, History, Pencil, Trash2 } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import { Card } from "../components/ui/Card";
import { Select, Input, Textarea, Label, FieldGroup, FieldError } from "../components/ui/Field";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import AssetTag from "../components/ui/AssetTag";
import DataTable from "../components/ui/DataTable";
import EmptyState from "../components/ui/EmptyState";
import { SkeletonRows } from "../components/ui/Skeleton";
import StatusStrip from "../components/dashboard/StatusStrip";
import {
  useGetCustomersQuery,
  useCreateCustomerMutation,
  useGetProductsQuery,
  useGetDuesQuery,
  useCreateDueMutation,
  useUpdateDueMutation,
  useDeleteDueMutation,
  useGetDuePaymentsQuery,
  useCreateDuePaymentMutation,
} from "../app/apiSlice";
import { pushed } from "../features/toast/toastSlice";
import { formatCurrency, formatDate } from "../lib/format";

const STATUS_TONE = { Due: "rose", Paid: "solder" };

function AddDueModal({ open, onClose }) {
  const dispatch = useDispatch();
  const { data: customersRes } = useGetCustomersQuery();
  const { data: productsRes } = useGetProductsQuery({ limit: 200 });
  const [createCustomer] = useCreateCustomerMutation();
  const [createDue, { isLoading: saving }] = useCreateDueMutation();

  const customers = customersRes?.data ?? [];
  const products = productsRes?.data ?? [];

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [productId, setProductId] = useState("");
  const [dueAmount, setDueAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");

  function reset() {
    setCustomerName("");
    setCustomerEmail("");
    setProductId("");
    setDueAmount("");
    setNotes("");
    setErrors({});
    setError("");
  }

  function validate() {
    const next = {};
    if (!customerName.trim()) next.customerName = "Enter the customer's name.";
    if (!dueAmount || Number(dueAmount) <= 0) next.dueAmount = "Enter a due amount greater than zero.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function resolveCustomerId() {
    const existing = customers.find((c) => c.name.toLowerCase() === customerName.trim().toLowerCase());
    if (existing) return existing._id;
    const res = await createCustomer({
      name: customerName.trim(),
      email: customerEmail.trim() || undefined,
    }).unwrap();
    return res.data._id;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!validate()) return;
    try {
      const customerId = await resolveCustomerId();
      await createDue({
        customer: customerId,
        product: productId || undefined,
        dueAmount: Number(dueAmount),
        notes: notes.trim(),
      }).unwrap();
      dispatch(pushed({ message: `Due of ${formatCurrency(Number(dueAmount))} recorded for ${customerName.trim()}.` }));
      reset();
      onClose();
    } catch (err) {
      setError(err?.data?.message ?? "Couldn't save this due record.");
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Add customer due"
      description="Type a new customer's name or match an existing one — no need to add them separately first."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldGroup>
            <Label htmlFor="due-customer-name" hint="type to add new">Customer or Company name</Label>
            <Input
              id="due-customer-name"
              list="due-customer-options"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Select or type a customer"
            />
            <datalist id="due-customer-options">
              {customers.map((c) => (
                <option key={c._id} value={c.name} />
              ))}
            </datalist>
            <FieldError>{errors.customerName}</FieldError>
          </FieldGroup>

          <FieldGroup>
            <Label htmlFor="due-customer-email" hint="optional">Customer email</Label>
            <Input
              id="due-customer-email"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="name@example.com"
            />
          </FieldGroup>
        </div>

        <FieldGroup>
          <Label htmlFor="due-product" hint="optional">Product</Label>
          <Select id="due-product" value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">No specific product</option>
            {products.map((p) => (
              <option key={p._id} value={p._id}>{p.name}</option>
            ))}
          </Select>
        </FieldGroup>

        <FieldGroup>
          <Label htmlFor="due-amount">Total due</Label>
          <Input
            id="due-amount"
            type="number"
            min="0"
            step="0.01"
            value={dueAmount}
            onChange={(e) => setDueAmount(e.target.value)}
            placeholder="0.00"
          />
          <FieldError>{errors.dueAmount}</FieldError>
        </FieldGroup>

        <FieldGroup>
          <Label htmlFor="due-notes" hint="optional">Notes</Label>
          <Textarea id="due-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payment terms, approval context, etc." />
        </FieldGroup>

        {error && <p className="text-[12.5px] text-fault">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save due record"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function EditDueModal({ due, onClose }) {
  const dispatch = useDispatch();
  const { data: productsRes } = useGetProductsQuery({ limit: 200 });
  const [updateDue, { isLoading: saving }] = useUpdateDueMutation();

  const products = productsRes?.data ?? [];

  const [productId, setProductId] = useState(due?.product?._id ?? "");
  const [dueAmount, setDueAmount] = useState(due?.dueAmount ?? "");
  const [notes, setNotes] = useState(due?.notes ?? "");
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");

  if (!due) return null;

  function validate() {
    const next = {};
    if (!dueAmount || Number(dueAmount) <= 0) next.dueAmount = "Enter a due amount greater than zero.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!validate()) return;
    try {
      await updateDue({
        id: due._id,
        product: productId || undefined,
        dueAmount: Number(dueAmount),
        notes: notes.trim(),
      }).unwrap();
      dispatch(pushed({ message: `Due record updated for ${due.customer?.name}.` }));
      onClose();
    } catch (err) {
      setError(err?.data?.message ?? "Couldn't update this due record.");
    }
  }

  return (
    <Modal open={!!due} onClose={onClose} title={`Edit due — ${due.customer?.name}`} description="Paid amount isn't editable here — it follows recorded payments." size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FieldGroup>
          <Label htmlFor="edit-due-product" hint="optional">Product</Label>
          <Select id="edit-due-product" value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">No specific product</option>
            {products.map((p) => (
              <option key={p._id} value={p._id}>{p.name}</option>
            ))}
          </Select>
        </FieldGroup>

        <FieldGroup>
          <Label htmlFor="edit-due-amount">Total due</Label>
          <Input
            id="edit-due-amount"
            type="number"
            min="0"
            step="0.01"
            value={dueAmount}
            onChange={(e) => setDueAmount(e.target.value)}
            placeholder="0.00"
          />
          <FieldError>{errors.dueAmount}</FieldError>
        </FieldGroup>

        <FieldGroup>
          <Label htmlFor="edit-due-notes" hint="optional">Notes</Label>
          <Textarea id="edit-due-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payment terms, approval context, etc." />
        </FieldGroup>

        {error && <p className="text-[12.5px] text-fault">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function PaymentModal({ due, onClose }) {
  const dispatch = useDispatch();
  const { data: paymentsRes } = useGetDuePaymentsQuery({ due: due?._id }, { skip: !due });
  const [createPayment, { isLoading: saving }] = useCreateDuePaymentMutation();
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  if (!due) return null;

  const payments = paymentsRes?.data ?? [];

  async function handleSubmit(e) {
    e.preventDefault();
    const value = Number(amount);
    if (!value || value <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (value > due.remainingDue) {
      setError(`Amount exceeds the remaining balance of ${formatCurrency(due.remainingDue)}.`);
      return;
    }
    try {
      await createPayment({ due: due._id, amount: value, notes: notes.trim() }).unwrap();
      dispatch(pushed({ message: `Payment of ${formatCurrency(value)} recorded for ${due.customer?.name}.` }));
      setAmount("");
      setNotes("");
      setError("");
      onClose();
    } catch (err) {
      setError(err?.data?.message ?? "Couldn't record this payment.");
    }
  }

  return (
    <Modal open={!!due} onClose={onClose} title={`Record payment — ${due.customer?.name}`} description={`Remaining balance: ${formatCurrency(due.remainingDue)}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FieldGroup>
          <Label htmlFor="pay-amount">Amount</Label>
          <Input id="pay-amount" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          <FieldError>{error}</FieldError>
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor="pay-notes" hint="optional">Notes</Label>
          <Textarea id="pay-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Cash, card, partial payment, etc." />
        </FieldGroup>

        {payments.length > 0 && (
          <div>
            <p className="mb-1.5 font-mono text-[10.5px] uppercase tracking-wide text-text-faint">Payment history</p>
            <ul className="space-y-1.5 rounded-[6px] border border-border bg-bg-sunken p-2.5">
              {payments.map((p) => (
                <li key={p._id} className="flex justify-between text-[12.5px]">
                  <span className="text-text-muted">{formatDate(p.date)} {p.notes && `· ${p.notes}`}</span>
                  <span className="font-mono text-text">{formatCurrency(p.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save payment"}</Button>
        </div>
      </form>
    </Modal>
  );
}

// Consolidated view for one customer — every due record they have and every
// payment they've ever made, in one place, with a way to record a new
// payment right from here instead of hunting for the right row in the table.
function CustomerHistoryModal({ customer, onClose, onRecordPayment }) {
  const { data: duesRes, isLoading: duesLoading } = useGetDuesQuery(
    { customer: customer?._id, limit: 200 },
    { skip: !customer }
  );
  const { data: paymentsRes, isLoading: paymentsLoading } = useGetDuePaymentsQuery(
    { customer: customer?._id },
    { skip: !customer }
  );

  if (!customer) return null;

  const dues = duesRes?.data ?? [];
  const payments = paymentsRes?.data ?? [];
  const totalDue = dues.reduce((s, d) => s + d.dueAmount, 0);
  const totalPaid = dues.reduce((s, d) => s + d.paidAmount, 0);
  const totalRemaining = dues.reduce((s, d) => s + d.remainingDue, 0);

  return (
    <Modal open={!!customer} onClose={onClose} title={customer.name} description={customer.email || undefined} size="lg">
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-[6px] border border-border bg-bg-sunken px-3 py-2.5">
            <p className="font-mono text-[10px] uppercase tracking-wide text-text-faint">Total due</p>
            <p className="mt-1 font-mono text-[15px] font-semibold text-text">{formatCurrency(totalDue)}</p>
          </div>
          <div className="rounded-[6px] border border-border bg-bg-sunken px-3 py-2.5">
            <p className="font-mono text-[10px] uppercase tracking-wide text-text-faint">Total paid</p>
            <p className="mt-1 font-mono text-[15px] font-semibold text-solder">{formatCurrency(totalPaid)}</p>
          </div>
          <div className="rounded-[6px] border border-border bg-bg-sunken px-3 py-2.5">
            <p className="font-mono text-[10px] uppercase tracking-wide text-text-faint">Outstanding</p>
            <p className={`mt-1 font-mono text-[15px] font-semibold ${totalRemaining > 0 ? "text-rose" : "text-solder"}`}>
              {formatCurrency(totalRemaining)}
            </p>
          </div>
        </div>

        <div>
          <p className="mb-2 font-mono text-[10.5px] uppercase tracking-wide text-text-faint">Due records</p>
          {duesLoading ? (
            <SkeletonRows rows={2} cols={4} />
          ) : dues.length === 0 ? (
            <p className="text-[13px] text-text-muted">No due records for this customer yet.</p>
          ) : (
            <ul className="divide-y divide-border rounded-[6px] border border-border">
              {dues.map((d) => (
                <li key={d._id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] text-text">{d.product?.name ?? "General due"}</p>
                    <p className="text-[11.5px] text-text-faint">
                      {formatDate(d.date)} · {formatCurrency(d.dueAmount)} due
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2.5">
                    <AssetTag tone={STATUS_TONE[d.status]}>{d.status}</AssetTag>
                    {d.remainingDue > 0 && (
                      <button
                        onClick={() => onRecordPayment(d)}
                        className="text-[12.5px] font-medium text-rose hover:underline"
                      >
                        Record payment
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="mb-2 font-mono text-[10.5px] uppercase tracking-wide text-text-faint">Payment history</p>
          {paymentsLoading ? (
            <SkeletonRows rows={3} cols={3} />
          ) : payments.length === 0 ? (
            <p className="text-[13px] text-text-muted">No payments recorded yet.</p>
          ) : (
            <ul className="max-h-60 space-y-1.5 overflow-y-auto rounded-[6px] border border-border bg-bg-sunken p-2.5">
              {payments.map((p) => (
                <li key={p._id} className="flex items-center justify-between gap-3 text-[12.5px]">
                  <span className="min-w-0 truncate text-text-muted">
                    {formatDate(p.date)}
                    {p.due?.product?.name ? ` · ${p.due.product.name}` : ""}
                    {p.notes ? ` · ${p.notes}` : ""}
                  </span>
                  <span className="shrink-0 font-mono text-text">{formatCurrency(p.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}

export default function DueRecords() {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const { data: customersRes } = useGetCustomersQuery();
  const { data: duesRes, isLoading } = useGetDuesQuery({ limit: 200 });
  const [deleteDue] = useDeleteDueMutation();

  const customers = customersRes?.data ?? [];
  const dues = duesRes?.data ?? [];

  const [customerFilter, setCustomerFilter] = useState(searchParams.get("customer") ?? "all");
  const [statusFilter, setStatusFilter] = useState("Due");
  const [addOpen, setAddOpen] = useState(false);
  const [activeDueId, setActiveDueId] = useState(null);
  const [editingDueId, setEditingDueId] = useState(null);
  const [deletingDueId, setDeletingDueId] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [historyCustomer, setHistoryCustomer] = useState(null);

  // Opens the payment modal for one specific due from inside the customer
  // history view, swapping that modal out for this one.
  function recordPaymentFromHistory(due) {
    setHistoryCustomer(null);
    setActiveDueId(due._id);
  }

  const rows = useMemo(
    () =>
      dues
        .map((d) => ({
          ...d,
          customerName: d.customer?.name ?? "",
          productLabel: d.product?.name ?? "",
        }))
        .sort((a, b) => a.customerName.localeCompare(b.customerName)),
    [dues]
  );

  const filtered = rows.filter(
    (d) => (customerFilter === "all" || d.customer?._id === customerFilter) && (statusFilter === "all" || d.status === statusFilter)
  );

  const activeDue = rows.find((d) => d._id === activeDueId);
  const editingDue = rows.find((d) => d._id === editingDueId);
  const deletingDue = rows.find((d) => d._id === deletingDueId);
  const totalDue = rows.reduce((s, d) => s + d.dueAmount, 0);
  const totalPaid = rows.reduce((s, d) => s + d.paidAmount, 0);
  const totalOutstanding = rows.reduce((s, d) => s + d.remainingDue, 0);

  async function handleDelete() {
    if (!deletingDue) return;
    try {
      await deleteDue(deletingDue._id).unwrap();
      dispatch(pushed({ message: `Due record for ${deletingDue.customer?.name} deleted.` }));
      setDeleteError("");
    } catch (err) {
      setDeleteError(err?.data?.message ?? "Couldn't delete this due record.");
      throw err;
    }
  }

  return (
    <div>
      <PageHeader
        title="Due records"
        description={`${formatCurrency(totalOutstanding)} outstanding across ${rows.filter((r) => r.remainingDue > 0).length} open dues.`}
        action={
          <Button onClick={() => setAddOpen(true)}>
            <Plus size={16} /> Add due
          </Button>
        }
      />

      <div className="mb-5">
        <StatusStrip
          segments={[
            { label: "Total records", value: rows.length },
            { label: "Total due", value: formatCurrency(totalDue) },
            { label: "Total paid", value: formatCurrency(totalPaid) },
            { label: "Total outstanding", value: formatCurrency(totalOutstanding), tone: totalOutstanding > 0 ? "rose" : "solder" },
          ]}
        />
      </div>

      <Card>
        {isLoading ? (
          <SkeletonRows rows={7} cols={6} />
        ) : (
          <DataTable
            searchKeys={["customerName"]}
            searchPlaceholder="Search by customer/company"
            filters={
              <>
                <Select value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)} className="!h-8.5 w-44 !text-[13px]">
                  <option value="all">All customers</option>
                  {customers.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </Select>
                <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="!h-8.5 w-32 !text-[13px]">
                  <option value="all">All statuses</option>
                  <option value="Due">Due</option>
                  <option value="Paid">Paid</option>
                </Select>
              </>
            }
            columns={[
              {
                key: "customer",
                header: "Customer/Company",
                render: (r) =>
                  r.customer ? (
                    <button
                      type="button"
                      onClick={() => setHistoryCustomer(r.customer)}
                      className="inline-flex items-center gap-1 font-medium text-text hover:underline"
                    >
                      <History size={12} className="text-text-faint" />
                      {r.customer.name}
                    </button>
                  ) : (
                    "—"
                  ),
              },
              { key: "productLabel", header: "Product", render: (r) => <span className="text-[12.5px] text-text-muted">{r.productLabel || "—"}</span> },
              { key: "dueAmount", header: "Due", align: "right", mono: true, render: (r) => formatCurrency(r.dueAmount) },
              { key: "paidAmount", header: "Paid", align: "right", mono: true, render: (r) => formatCurrency(r.paidAmount) },
              { key: "remainingDue", header: "Remaining", align: "right", mono: true, render: (r) => formatCurrency(r.remainingDue) },
              { key: "status", header: "Status", render: (r) => <AssetTag tone={STATUS_TONE[r.status]}>{r.status}</AssetTag> },
              { key: "date", header: "Date", render: (r) => formatDate(r.date) },
              {
                key: "actions",
                header: "",
                render: (r) => (
                  <div className="flex items-center justify-end gap-3">
                    {r.remainingDue > 0 && (
                      <button onClick={() => setActiveDueId(r._id)} className="text-[12.5px] font-medium text-rose hover:underline">
                        Record payment
                      </button>
                    )}
                    <button
                      onClick={() => setEditingDueId(r._id)}
                      aria-label={`Edit due for ${r.customer?.name}`}
                      className="rounded-[5px] p-1.5 text-text-faint hover:bg-bg-sunken hover:text-text"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => {
                        setDeletingDueId(r._id);
                        setDeleteError("");
                      }}
                      aria-label={`Delete due for ${r.customer?.name}`}
                      className="rounded-[5px] p-1.5 text-text-faint hover:bg-fault/10 hover:text-fault"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ),
              },
            ]}
            rows={filtered}
            keyField="_id"
            pageSize={8}
            emptyState={<EmptyState icon={HandCoins} title="No due records match" description="Try clearing the customer or status filters." />}
          />
        )}
      </Card>

      <AddDueModal open={addOpen} onClose={() => setAddOpen(false)} />
      <PaymentModal due={activeDue} onClose={() => setActiveDueId(null)} />
      <EditDueModal key={editingDueId} due={editingDue} onClose={() => setEditingDueId(null)} />
      <CustomerHistoryModal
        customer={historyCustomer}
        onClose={() => setHistoryCustomer(null)}
        onRecordPayment={recordPaymentFromHistory}
      />

      <ConfirmDialog
        open={!!deletingDue}
        onClose={() => setDeletingDueId(null)}
        onConfirm={handleDelete}
        title={`Delete due for ${deletingDue?.customer?.name ?? "this customer"}?`}
        description={
          deleteError || "This can't be undone. Any payments recorded against this due will be deleted along with it."
        }
        confirmLabel="Delete due"
      />
    </div>
  );
}
