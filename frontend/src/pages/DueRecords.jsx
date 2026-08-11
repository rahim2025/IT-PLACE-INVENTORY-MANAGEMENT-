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
import { cn } from "../lib/cn";

const STATUS_TONE = { Due: "rose", Paid: "solder" };
// "due" = they owe the shop (receivable). "credit" = the shop owes them
// (payable). Kept visually distinct from the status tones above so a row's
// Type and Status badges never look identical.
const TYPE_LABEL = { due: "Due", credit: "Credit" };
const TYPE_TONE = { due: "neutral", credit: "trace" };

// presetCustomer, when given, locks the record to that customer instead of
// asking for a name — used when adding another due/credit from inside a
// customer's own history view, so there's no need to re-search for someone
// who's already right there on screen.
function AddDueModal({ open, presetCustomer, onClose }) {
  const dispatch = useDispatch();
  const { data: customersRes } = useGetCustomersQuery();
  const { data: productsRes } = useGetProductsQuery({ limit: 100000 });
  const { data: existingDuesRes } = useGetDuesQuery(
    { customer: presetCustomer?._id, limit: 200 },
    { skip: !presetCustomer }
  );
  const [createCustomer] = useCreateCustomerMutation();
  const [createDue, { isLoading: creating }] = useCreateDueMutation();
  const [updateDue, { isLoading: adjusting }] = useUpdateDueMutation();
  const [createPayment, { isLoading: netting }] = useCreateDuePaymentMutation();
  const saving = creating || adjusting || netting;

  const customers = customersRes?.data ?? [];
  const products = productsRes?.data ?? [];
  const existingDues = existingDuesRes?.data ?? [];

  const [type, setType] = useState("due");
  const [forceNew, setForceNew] = useState(false);
  const [customerName, setCustomerName] = useState(presetCustomer?.name ?? "");
  const [customerEmail, setCustomerEmail] = useState(presetCustomer?.email ?? "");
  const [productId, setProductId] = useState("");
  const [sign, setSign] = useState("add");
  const [dueAmount, setDueAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");

  // If this customer already has an open record of the SAME type, adding
  // "more" should top that one up rather than leaving two separate rows for
  // the same running balance. If instead they have an open record of the
  // OPPOSITE type, the new amount should net against it — a new $200 due
  // against an existing $500 credit means the shop now owes $300, not "$500
  // credit AND $200 due" sitting side by side. forceNew lets the owner opt
  // out of both and create a separate record anyway.
  const sameTypeMatch = useMemo(() => {
    if (!presetCustomer) return null;
    const matches = existingDues.filter((d) => d.type === type);
    return matches.find((d) => d.remainingDue > 0) ?? matches[0] ?? null;
  }, [existingDues, type, presetCustomer]);
  const oppositeTypeMatch = useMemo(() => {
    if (!presetCustomer) return null;
    return existingDues.find((d) => d.type !== type && d.remainingDue > 0) ?? null;
  }, [existingDues, type, presetCustomer]);

  // "adjust" = same-type match, grow/shrink its total directly.
  // "net" = opposite-type match, this amount offsets that balance instead
  // (implemented as a payment against it, so overpaying it auto-flips the
  // excess into a fresh record — same mechanism "Record payment" already uses).
  const matchMode = forceNew ? null : sameTypeMatch ? "adjust" : oppositeTypeMatch ? "net" : null;
  const matchedDue = matchMode === "adjust" ? sameTypeMatch : matchMode === "net" ? oppositeTypeMatch : null;
  const hasAnyMatch = !!(sameTypeMatch || oppositeTypeMatch);

  function reset() {
    setType("due");
    setForceNew(false);
    setCustomerName(presetCustomer?.name ?? "");
    setCustomerEmail(presetCustomer?.email ?? "");
    setProductId("");
    setSign("add");
    setDueAmount("");
    setNotes("");
    setErrors({});
    setError("");
  }

  function validate() {
    const next = {};
    if (!presetCustomer && !customerName.trim()) next.customerName = "Enter the customer's name.";
    if (!dueAmount || Number(dueAmount) <= 0) {
      next.dueAmount = "Enter an amount greater than zero.";
    } else if (matchMode === "adjust" && sign === "subtract" && matchedDue.dueAmount - Number(dueAmount) <= 0) {
      next.dueAmount = `Can't subtract that much — it would bring the total to zero or below. Edit the record directly for that.`;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function resolveCustomerId() {
    if (presetCustomer) return presetCustomer._id;
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
      const name = presetCustomer?.name ?? customerName.trim();

      if (matchMode === "adjust") {
        const delta = sign === "subtract" ? -Number(dueAmount) : Number(dueAmount);
        const newAmount = Math.round((matchedDue.dueAmount + delta) * 100) / 100;
        await updateDue({ id: matchedDue._id, dueAmount: newAmount }).unwrap();
        dispatch(
          pushed({
            message: `${TYPE_LABEL[type]} for ${name} adjusted to ${formatCurrency(newAmount)}.`,
          })
        );
      } else if (matchMode === "net") {
        const result = await createPayment({
          due: matchedDue._id,
          amount: Number(dueAmount),
          notes: notes.trim() || `Offset by a new ${TYPE_LABEL[type].toLowerCase()} entry.`,
        }).unwrap();
        const overflowDue = result.data.overflowDue;
        dispatch(
          pushed({
            message: overflowDue
              ? `${TYPE_LABEL[type]} of ${formatCurrency(Number(dueAmount))} recorded. ${name}'s ${TYPE_LABEL[matchedDue.type].toLowerCase()} was fully settled, and a new ${TYPE_LABEL[overflowDue.type].toLowerCase()} of ${formatCurrency(overflowDue.dueAmount)} was opened for the extra.`
              : `${TYPE_LABEL[type]} of ${formatCurrency(Number(dueAmount))} recorded — offset against ${name}'s ${TYPE_LABEL[matchedDue.type].toLowerCase()} balance.`,
          })
        );
      } else {
        const customerId = await resolveCustomerId();
        await createDue({
          customer: customerId,
          type,
          product: productId || undefined,
          dueAmount: Number(dueAmount),
          notes: notes.trim(),
        }).unwrap();
        dispatch(
          pushed({
            message:
              type === "credit"
                ? `Credit of ${formatCurrency(Number(dueAmount))} recorded — to pay ${name}.`
                : `Due of ${formatCurrency(Number(dueAmount))} recorded for ${name}.`,
          })
        );
      }
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
      title={presetCustomer ? `Add due or credit — ${presetCustomer.name}` : "Add due record"}
      description={
        presetCustomer
          ? "Record another due or credit for this customer."
          : "Type a new customer or company name or match an existing one — no need to add them separately first."
      }
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FieldGroup>
          <Label>Type</Label>
          <div className="inline-flex rounded-[6px] border border-border-strong bg-bg-sunken p-1">
            <button
              type="button"
              onClick={() => setType("due")}
              className={cn(
                "rounded-[4px] px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                type === "due" ? "bg-bg-elevated text-text shadow-sm" : "text-text-muted hover:text-text"
              )}
            >
              Due — to collect
            </button>
            <button
              type="button"
              onClick={() => setType("credit")}
              className={cn(
                "rounded-[4px] px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                type === "credit" ? "bg-bg-elevated text-text shadow-sm" : "text-text-muted hover:text-text"
              )}
            >
              Credit — to pay
            </button>
          </div>
        </FieldGroup>

        {presetCustomer ? (
          <div className="rounded-[6px] border border-border bg-bg-sunken px-3.5 py-2.5">
            <p className="font-mono text-[10px] uppercase tracking-wide text-text-faint">Customer</p>
            <p className="mt-0.5 text-[14px] font-medium text-text">{presetCustomer.name}</p>
          </div>
        ) : null}

        {matchMode === "adjust" && (
          <div className="rounded-[6px] border border-trace/40 bg-trace/10 px-3.5 py-2.5 text-[13px] text-text">
            {presetCustomer.name} already has an open {TYPE_LABEL[type].toLowerCase()} of{" "}
            <span className="font-mono font-medium">{formatCurrency(matchedDue.dueAmount)}</span>{" "}
            ({formatCurrency(matchedDue.remainingDue)} remaining). Adjust it below, or{" "}
            <button type="button" onClick={() => setForceNew(true)} className="font-medium text-rose hover:underline">
              create a separate new record instead
            </button>
            .
          </div>
        )}

        {matchMode === "net" && (
          <div className="rounded-[6px] border border-trace/40 bg-trace/10 px-3.5 py-2.5 text-[13px] text-text">
            {presetCustomer.name} has an open {TYPE_LABEL[matchedDue.type].toLowerCase()} of{" "}
            <span className="font-mono font-medium">{formatCurrency(matchedDue.dueAmount)}</span>{" "}
            ({formatCurrency(matchedDue.remainingDue)} remaining). This {TYPE_LABEL[type].toLowerCase()} will offset it instead of sitting as a separate record, or{" "}
            <button type="button" onClick={() => setForceNew(true)} className="font-medium text-rose hover:underline">
              create a separate new record instead
            </button>
            .
          </div>
        )}

        {presetCustomer && hasAnyMatch && forceNew && (
          <p className="text-[12.5px] text-text-faint">
            Creating a separate new record.{" "}
            <button type="button" onClick={() => setForceNew(false)} className="font-medium text-rose hover:underline">
              Use the existing balance instead
            </button>
          </p>
        )}

        {!presetCustomer && (
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
        )}

        {matchMode === null && (
          <FieldGroup>
            <Label htmlFor="due-product" hint="optional">Product</Label>
            <Select id="due-product" value={productId} onChange={(e) => setProductId(e.target.value)}>
              <option value="">No specific product</option>
              {products.map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </Select>
          </FieldGroup>
        )}

        {matchMode === "adjust" && (
          <FieldGroup>
            <Label>Adjustment</Label>
            <div className="inline-flex rounded-[6px] border border-border-strong bg-bg-sunken p-1">
              <button
                type="button"
                onClick={() => setSign("add")}
                className={cn(
                  "rounded-[4px] px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                  sign === "add" ? "bg-bg-elevated text-text shadow-sm" : "text-text-muted hover:text-text"
                )}
              >
                + Add
              </button>
              <button
                type="button"
                onClick={() => setSign("subtract")}
                className={cn(
                  "rounded-[4px] px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                  sign === "subtract" ? "bg-bg-elevated text-text shadow-sm" : "text-text-muted hover:text-text"
                )}
              >
                − Subtract
              </button>
            </div>
          </FieldGroup>
        )}

        <FieldGroup>
          <Label htmlFor="due-amount">
            {matchMode === "adjust"
              ? `Amount to ${sign === "subtract" ? "subtract" : "add"}`
              : matchMode === "net"
                ? `${TYPE_LABEL[type]} amount`
                : type === "credit"
                  ? "Total amount to pay"
                  : "Total due"}
          </Label>
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
          {matchMode === "adjust" && dueAmount && !errors.dueAmount && (
            <p className="mt-1.5 text-[12.5px] text-text-faint">
              New total: {formatCurrency(Math.max(matchedDue.dueAmount + (sign === "subtract" ? -Number(dueAmount) : Number(dueAmount)), 0))}
            </p>
          )}
          {matchMode === "net" && Number(dueAmount) > 0 && !errors.dueAmount && (
            <p className="mt-1.5 text-[12.5px] text-text-faint">
              {Number(dueAmount) >= matchedDue.remainingDue
                ? `Settles the ${TYPE_LABEL[matchedDue.type].toLowerCase()}${
                    Number(dueAmount) > matchedDue.remainingDue
                      ? ` — the extra ${formatCurrency(Number(dueAmount) - matchedDue.remainingDue)} opens a new ${TYPE_LABEL[type].toLowerCase()} for ${presetCustomer.name}.`
                      : "."
                  }`
                : `New ${TYPE_LABEL[matchedDue.type].toLowerCase()} remaining: ${formatCurrency(matchedDue.remainingDue - Number(dueAmount))}`}
            </p>
          )}
        </FieldGroup>

        {matchMode === null && (
          <FieldGroup>
            <Label htmlFor="due-notes" hint="optional">Notes</Label>
            <Textarea id="due-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payment terms, approval context, etc." />
          </FieldGroup>
        )}

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
  const { data: productsRes } = useGetProductsQuery({ limit: 100000 });
  const [updateDue, { isLoading: saving }] = useUpdateDueMutation();

  const products = productsRes?.data ?? [];

  const [type, setType] = useState(due?.type ?? "due");
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
        type,
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
          <Label htmlFor="edit-due-type">Type</Label>
          <Select id="edit-due-type" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="due">Due — to collect</option>
            <option value="credit">Credit — to pay</option>
          </Select>
        </FieldGroup>

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
          <Label htmlFor="edit-due-amount">{type === "credit" ? "Total amount to pay" : "Total due"}</Label>
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
  const value = Number(amount);
  // Paying more than the remaining balance is no longer blocked — the extra
  // gets carried forward into a brand-new, opposite-type record instead (see
  // createDuePayment on the backend). This just previews that outcome.
  const overflow = value > due.remainingDue ? Math.round((value - due.remainingDue) * 100) / 100 : 0;
  const flippedType = due.type === "credit" ? "Due" : "Credit";

  async function handleSubmit(e) {
    e.preventDefault();
    if (!value || value <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    try {
      const result = await createPayment({ due: due._id, amount: value, notes: notes.trim() }).unwrap();
      const created = result.data.overflowDue;
      dispatch(
        pushed({
          message: created
            ? `Payment of ${formatCurrency(value)} recorded. ${due.customer?.name} settled, and a new ${flippedType.toLowerCase()} of ${formatCurrency(created.dueAmount)} was opened for the extra.`
            : `Payment of ${formatCurrency(value)} recorded for ${due.customer?.name}.`,
        })
      );
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
          {overflow > 0 && (
            <p className="mt-1.5 text-[12.5px] text-trace">
              {formatCurrency(overflow)} more than the remaining balance — this due will be settled, and a new{" "}
              {flippedType.toLowerCase()} of {formatCurrency(overflow)} will be opened for {due.customer?.name}.
            </p>
          )}
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
function CustomerHistoryModal({ customer, onClose, onRecordPayment, onAddDue }) {
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
  const dueRows = dues.filter((d) => d.type !== "credit");
  const creditRows = dues.filter((d) => d.type === "credit");
  const totalDue = dueRows.reduce((s, d) => s + d.remainingDue, 0);
  const totalCredit = creditRows.reduce((s, d) => s + d.remainingDue, 0);
  const net = totalDue - totalCredit;

  return (
    <Modal open={!!customer} onClose={onClose} title={customer.name} description={customer.email || undefined} size="lg">
      <div className="space-y-5">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => onAddDue(customer)}
            className="inline-flex items-center gap-1 text-[12.5px] font-medium text-rose hover:underline"
          >
            <Plus size={13} /> Add due or credit
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-[6px] border border-border bg-bg-sunken px-3 py-2.5">
            <p className="font-mono text-[10px] uppercase tracking-wide text-text-faint">To collect</p>
            <p className="mt-1 font-mono text-[15px] font-semibold text-text">{formatCurrency(totalDue)}</p>
          </div>
          <div className="rounded-[6px] border border-border bg-bg-sunken px-3 py-2.5">
            <p className="font-mono text-[10px] uppercase tracking-wide text-text-faint">To pay</p>
            <p className="mt-1 font-mono text-[15px] font-semibold text-text">{formatCurrency(totalCredit)}</p>
          </div>
          <div className="rounded-[6px] border border-border bg-bg-sunken px-3 py-2.5">
            <p className="font-mono text-[10px] uppercase tracking-wide text-text-faint">Net {net >= 0 ? "(to collect)" : "(to pay)"}</p>
            <p className={`mt-1 font-mono text-[15px] font-semibold ${net > 0 ? "text-rose" : net < 0 ? "text-trace" : "text-solder"}`}>
              {formatCurrency(Math.abs(net))}
            </p>
          </div>
        </div>

        <div>
          <p className="mb-2 font-mono text-[10.5px] uppercase tracking-wide text-text-faint">Due &amp; credit records</p>
          {duesLoading ? (
            <SkeletonRows rows={2} cols={4} />
          ) : dues.length === 0 ? (
            <p className="text-[13px] text-text-muted">No due or credit records for this customer yet.</p>
          ) : (
            <ul className="divide-y divide-border rounded-[6px] border border-border">
              {dues.map((d) => (
                <li key={d._id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] text-text">{d.product?.name ?? "General due"}</p>
                    <p className="text-[11.5px] text-text-faint">
                      {formatDate(d.date)} · {formatCurrency(d.dueAmount)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2.5">
                    <AssetTag tone={TYPE_TONE[d.type]}>{TYPE_LABEL[d.type]}</AssetTag>
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
  const [typeFilter, setTypeFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [addPresetCustomer, setAddPresetCustomer] = useState(null);
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

  // Same swap, but for adding a new due/credit for the customer already
  // being viewed — no need to leave the history view and re-search for them.
  function addDueFromHistory(customer) {
    setHistoryCustomer(null);
    setAddPresetCustomer(customer);
    setAddOpen(true);
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
    (d) =>
      (customerFilter === "all" || d.customer?._id === customerFilter) &&
      (statusFilter === "all" || d.status === statusFilter) &&
      (typeFilter === "all" || d.type === typeFilter)
  );

  const activeDue = rows.find((d) => d._id === activeDueId);
  const editingDue = rows.find((d) => d._id === editingDueId);
  const deletingDue = rows.find((d) => d._id === deletingDueId);
  // Due and credit balances are never summed together — they're opposite
  // directions of money, so "outstanding" is reported per direction plus a
  // net figure, not one blended total.
  const totalReceivable = rows.filter((d) => d.type !== "credit").reduce((s, d) => s + d.remainingDue, 0);
  const totalPayable = rows.filter((d) => d.type === "credit").reduce((s, d) => s + d.remainingDue, 0);
  const netOutstanding = totalReceivable - totalPayable;

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
        description={`${formatCurrency(totalReceivable)} to collect, ${formatCurrency(totalPayable)} to pay — across ${rows.filter((r) => r.remainingDue > 0).length} open records.`}
        action={
          <Button
            onClick={() => {
              setAddPresetCustomer(null);
              setAddOpen(true);
            }}
          >
            <Plus size={16} /> Add due
          </Button>
        }
      />

      <div className="mb-5">
        <StatusStrip
          segments={[
            { label: "Total records", value: rows.length },
            { label: "To collect", value: formatCurrency(totalReceivable), tone: totalReceivable > 0 ? "rose" : "solder" },
            { label: "To pay", value: formatCurrency(totalPayable), tone: totalPayable > 0 ? "trace" : "solder" },
            {
              label: netOutstanding >= 0 ? "Net (to collect)" : "Net (to pay)",
              value: formatCurrency(Math.abs(netOutstanding)),
              tone: netOutstanding > 0 ? "rose" : netOutstanding < 0 ? "trace" : "solder",
            },
          ]}
        />
      </div>

      <Card>
        {isLoading ? (
          <SkeletonRows rows={7} cols={7} />
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
                <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="!h-8.5 w-32 !text-[13px]">
                  <option value="all">Due &amp; credit</option>
                  <option value="due">Due only</option>
                  <option value="credit">Credit only</option>
                </Select>
                <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="!h-8.5 w-32 !text-[13px]">
                  <option value="all">All statuses</option>
                  <option value="Due">Outstanding</option>
                  <option value="Paid">Settled</option>
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
              { key: "type", header: "Type", render: (r) => <AssetTag tone={TYPE_TONE[r.type]}>{TYPE_LABEL[r.type]}</AssetTag> },
              { key: "productLabel", header: "Product", render: (r) => <span className="text-[12.5px] text-text-muted">{r.productLabel || "—"}</span> },
              { key: "dueAmount", header: "Amount", align: "right", mono: true, render: (r) => formatCurrency(r.dueAmount) },
              { key: "paidAmount", header: "Settled", align: "right", mono: true, render: (r) => formatCurrency(r.paidAmount) },
              { key: "remainingDue", header: "Remaining", align: "right", mono: true, render: (r) => formatCurrency(r.remainingDue) },
              { key: "status", header: "Status", render: (r) => <AssetTag tone={STATUS_TONE[r.status]}>{r.status === "Due" ? "Outstanding" : "Settled"}</AssetTag> },
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

      <AddDueModal
        key={addPresetCustomer?._id ?? "new"}
        open={addOpen}
        presetCustomer={addPresetCustomer}
        onClose={() => {
          setAddOpen(false);
          setAddPresetCustomer(null);
        }}
      />
      <PaymentModal due={activeDue} onClose={() => setActiveDueId(null)} />
      <EditDueModal key={editingDueId} due={editingDue} onClose={() => setEditingDueId(null)} />
      <CustomerHistoryModal
        customer={historyCustomer}
        onClose={() => setHistoryCustomer(null)}
        onRecordPayment={recordPaymentFromHistory}
        onAddDue={addDueFromHistory}
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
