import { useState } from "react";
import { useDispatch } from "react-redux";
import { Plus, Wallet, History, Pencil, Trash2 } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import { Card, CardHeader } from "../components/ui/Card";
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
  useGetBrokersQuery,
  useCreateBrokerMutation,
  useUpdateBrokerMutation,
  useDeleteBrokerMutation,
  useGetBrokerTransactionsQuery,
  useCreateBrokerTransactionMutation,
} from "../app/apiSlice";
import { pushed } from "../features/toast/toastSlice";
import { formatCurrency, formatDate } from "../lib/format";

const emptyBrokerForm = { name: "", phone: "", notes: "" };
const TYPE_LABEL = { Credit: "Commission added", Payment: "Paid out" };
const TYPE_TONE = { Credit: "rose", Payment: "solder" };

function EditBrokerModal({ broker, onClose }) {
  const dispatch = useDispatch();
  const [updateBroker, { isLoading: saving }] = useUpdateBrokerMutation();

  const [form, setForm] = useState(() => ({
    name: broker?.name ?? "",
    phone: broker?.phone ?? "",
    notes: broker?.notes ?? "",
  }));
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");

  if (!broker) return null;

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function validate() {
    const next = {};
    if (!form.name.trim()) next.name = "Name is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!validate()) return;
    try {
      await updateBroker({
        id: broker._id,
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        notes: form.notes.trim() || undefined,
      }).unwrap();
      dispatch(pushed({ message: `${form.name.trim()} updated.` }));
      onClose();
    } catch (err) {
      setError(err?.data?.message ?? "Couldn't update this broker.");
    }
  }

  return (
    <Modal open={!!broker} onClose={onClose} title="Edit broker">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FieldGroup>
          <Label htmlFor="edit-broker-name">Name</Label>
          <Input id="edit-broker-name" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Full name" />
          <FieldError>{errors.name}</FieldError>
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor="edit-broker-phone" hint="optional">Phone</Label>
          <Input id="edit-broker-phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+1 (555) 555-0100" />
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor="edit-broker-notes" hint="optional">Notes</Label>
          <Textarea id="edit-broker-notes" value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Commission terms, how they refer customers, etc." />
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

export default function Brokers() {
  const dispatch = useDispatch();
  const { data: brokersRes, isLoading: brokersLoading } = useGetBrokersQuery();
  const [createBroker, { isLoading: savingBroker }] = useCreateBrokerMutation();
  const [createTransaction, { isLoading: savingTransaction }] = useCreateBrokerTransactionMutation();
  const [deleteBroker] = useDeleteBrokerMutation();

  const brokers = brokersRes?.data ?? [];

  const [brokerModalOpen, setBrokerModalOpen] = useState(false);
  const [brokerForm, setBrokerForm] = useState(emptyBrokerForm);
  const [brokerErrors, setBrokerErrors] = useState({});

  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [txBrokerId, setTxBrokerId] = useState("");
  const [txType, setTxType] = useState("Credit");
  const [txAmount, setTxAmount] = useState("");
  const [txNotes, setTxNotes] = useState("");
  const [txErrors, setTxErrors] = useState({});
  const [txError, setTxError] = useState("");

  const [historyBrokerId, setHistoryBrokerId] = useState("all");
  const historyBroker = brokers.find((b) => b._id === historyBrokerId);
  const { data: transactionsRes, isLoading: transactionsLoading } = useGetBrokerTransactionsQuery({
    broker: historyBrokerId === "all" ? undefined : historyBrokerId,
    limit: 100,
  });
  const transactions = transactionsRes?.data ?? [];

  const totalOwed = brokers.reduce((s, b) => s + Math.max(b.balance, 0), 0);

  const [editingBrokerId, setEditingBrokerId] = useState(null);
  const editingBroker = brokers.find((b) => b._id === editingBrokerId);
  const [deletingBrokerId, setDeletingBrokerId] = useState(null);
  const deletingBroker = brokers.find((b) => b._id === deletingBrokerId);
  const [deleteError, setDeleteError] = useState("");

  function updateBrokerField(field, value) {
    setBrokerForm((f) => ({ ...f, [field]: value }));
  }

  function validateBroker() {
    const next = {};
    if (!brokerForm.name.trim()) next.name = "Name is required.";
    setBrokerErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleBrokerSubmit(e) {
    e.preventDefault();
    if (!validateBroker()) return;
    try {
      await createBroker({
        name: brokerForm.name.trim(),
        phone: brokerForm.phone.trim() || undefined,
        notes: brokerForm.notes.trim() || undefined,
      }).unwrap();
      dispatch(pushed({ message: `${brokerForm.name.trim()} added as a broker.` }));
      setBrokerModalOpen(false);
      setBrokerForm(emptyBrokerForm);
    } catch (err) {
      dispatch(pushed({ message: err?.data?.message ?? "Couldn't add this broker.", variant: "error" }));
    }
  }

  // Opens the transaction modal, optionally pre-selecting a broker — lets
  // clicking a name in the table skip straight past the dropdown.
  function openTransactionModal(brokerId = "") {
    setTxBrokerId(brokerId);
    setTxError("");
    setTransactionModalOpen(true);
  }

  function validateTransaction() {
    const next = {};
    if (!txBrokerId) next.brokerId = "Choose a broker.";
    if (!txAmount || Number(txAmount) <= 0) next.amount = "Enter an amount greater than zero.";
    setTxErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleTransactionSubmit(e) {
    e.preventDefault();
    setTxError("");
    if (!validateTransaction()) return;
    const broker = brokers.find((b) => b._id === txBrokerId);
    try {
      await createTransaction({ broker: txBrokerId, type: txType, amount: Number(txAmount), notes: txNotes.trim() }).unwrap();
      dispatch(
        pushed({
          message: `${txType === "Credit" ? "Added" : "Paid"} ${formatCurrency(Number(txAmount))} ${txType === "Credit" ? "for" : "to"} ${broker?.name}.`,
        })
      );
      setTransactionModalOpen(false);
      setTxBrokerId("");
      setTxType("Credit");
      setTxAmount("");
      setTxNotes("");
    } catch (err) {
      setTxError(err?.data?.message ?? "Couldn't save this transaction.");
    }
  }

  async function handleDeleteBroker() {
    if (!deletingBroker) return;
    try {
      await deleteBroker(deletingBroker._id).unwrap();
      dispatch(pushed({ message: `${deletingBroker.name} removed from brokers.` }));
      setDeleteError("");
    } catch (err) {
      setDeleteError(err?.data?.message ?? "Couldn't delete this broker.");
      throw err;
    }
  }

  return (
    <div>
      <PageHeader
        title="Brokers"
        description={`${brokers.length} brokers on file · commissions owed for customers they've brought in.`}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => openTransactionModal()}>
              <Wallet size={16} /> Add transaction
            </Button>
            <Button onClick={() => setBrokerModalOpen(true)}>
              <Plus size={16} /> Add broker
            </Button>
          </div>
        }
      />

      <div className="mb-5">
        <StatusStrip
          segments={[
            { label: "Total brokers", value: brokers.length },
            { label: "Total owed", value: formatCurrency(totalOwed), tone: totalOwed > 0 ? "rose" : "solder" },
          ]}
        />
      </div>

      <Card className="mb-5">
        {brokersLoading ? (
          <SkeletonRows rows={5} cols={5} />
        ) : (
          <DataTable
            searchKeys={["name", "phone"]}
            searchPlaceholder="Search brokers…"
            columns={[
              { key: "name", header: "Broker", render: (r) => (
                  <button
                    type="button"
                    onClick={() => openTransactionModal(r._id)}
                    aria-label={`Add transaction for ${r.name}`}
                    className="text-left"
                  >
                    <p className="font-medium text-text hover:underline">{r.name}</p>
                    {r.phone && <p className="text-[12.5px] text-text-faint">{r.phone}</p>}
                  </button>
                ) },
              { key: "totalCredited", header: "Total credited", align: "right", mono: true, render: (r) => formatCurrency(r.totalCredited) },
              { key: "totalPaid", header: "Total paid", align: "right", mono: true, render: (r) => formatCurrency(r.totalPaid) },
              {
                key: "balance",
                header: "Balance owed",
                align: "right",
                render: (r) => (
                  <AssetTag tone={r.balance > 0 ? "rose" : "solder"}>{formatCurrency(r.balance)}</AssetTag>
                ),
              },
              {
                key: "actions",
                header: "",
                render: (r) => (
                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => setHistoryBrokerId(r._id)}
                      className="inline-flex items-center gap-1 text-[12.5px] font-medium text-rose hover:underline"
                    >
                      <History size={13} /> History
                    </button>
                    <button
                      onClick={() => setEditingBrokerId(r._id)}
                      aria-label={`Edit ${r.name}`}
                      className="rounded-[5px] p-1.5 text-text-faint hover:bg-bg-sunken hover:text-text"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => {
                        setDeletingBrokerId(r._id);
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
            ]}
            rows={brokers}
            keyField="_id"
            pageSize={8}
            emptyState={<EmptyState icon={Wallet} title="No brokers yet" description="Add a broker to start tracking commissions owed." />}
          />
        )}
      </Card>

      <Card>
        <CardHeader
          title="Transactions"
          description={historyBroker ? `Showing all records for ${historyBroker.name}.` : "Commission credits and payouts across all brokers."}
        />
        {transactionsLoading ? (
          <SkeletonRows rows={7} cols={5} />
        ) : (
          <DataTable
            filters={
              <Select value={historyBrokerId} onChange={(e) => setHistoryBrokerId(e.target.value)} className="!h-8.5 w-48 !text-[13px]">
                <option value="all">All brokers</option>
                {brokers.map((b) => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </Select>
            }
            columns={[
              { key: "broker", header: "Broker", render: (r) => r.broker?.name ?? "—" },
              { key: "type", header: "Type", render: (r) => <AssetTag tone={TYPE_TONE[r.type] ?? "neutral"}>{TYPE_LABEL[r.type] ?? r.type}</AssetTag> },
              { key: "amount", header: "Amount", align: "right", mono: true, render: (r) => formatCurrency(r.amount) },
              { key: "date", header: "Date", render: (r) => formatDate(r.date) },
              { key: "notes", header: "Notes", render: (r) => r.notes || "—" },
            ]}
            rows={transactions}
            keyField="_id"
            pageSize={9}
            emptyState={<EmptyState icon={Wallet} title="No transactions" description="Commission credits and payouts will appear here." />}
          />
        )}
      </Card>

      <Modal open={brokerModalOpen} onClose={() => setBrokerModalOpen(false)} title="Add broker">
        <form onSubmit={handleBrokerSubmit} className="space-y-4">
          <FieldGroup>
            <Label htmlFor="broker-name">Name</Label>
            <Input id="broker-name" value={brokerForm.name} onChange={(e) => updateBrokerField("name", e.target.value)} placeholder="Full name" />
            <FieldError>{brokerErrors.name}</FieldError>
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="broker-phone" hint="optional">Phone</Label>
            <Input id="broker-phone" value={brokerForm.phone} onChange={(e) => updateBrokerField("phone", e.target.value)} placeholder="+1 (555) 555-0100" />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="broker-notes" hint="optional">Notes</Label>
            <Textarea id="broker-notes" value={brokerForm.notes} onChange={(e) => updateBrokerField("notes", e.target.value)} placeholder="Commission terms, how they refer customers, etc." />
          </FieldGroup>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setBrokerModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={savingBroker}>{savingBroker ? "Saving…" : "Save broker"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={transactionModalOpen} onClose={() => setTransactionModalOpen(false)} title="Add broker transaction">
        <form onSubmit={handleTransactionSubmit} className="space-y-4">
          <FieldGroup>
            <Label htmlFor="btx-broker">Broker</Label>
            <Select id="btx-broker" value={txBrokerId} onChange={(e) => setTxBrokerId(e.target.value)}>
              <option value="">Select a broker</option>
              {brokers.map((b) => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </Select>
            <FieldError>{txErrors.brokerId}</FieldError>
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="btx-type">Type</Label>
            <Select id="btx-type" value={txType} onChange={(e) => setTxType(e.target.value)}>
              <option value="Credit">Add money (New Comission add )</option>
              <option value="Payment">Pay broker (reduces balance)</option>
            </Select>
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="btx-amount">Amount</Label>
            <Input id="btx-amount" type="number" min="0" step="0.01" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} placeholder="0.00" />
            <FieldError>{txErrors.amount}</FieldError>
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="btx-notes" hint="optional">Notes</Label>
            <Textarea id="btx-notes" value={txNotes} onChange={(e) => setTxNotes(e.target.value)} placeholder="Which customer, terms, etc." />
          </FieldGroup>
          {txError && <p className="text-[12.5px] text-fault">{txError}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setTransactionModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={savingTransaction}>{savingTransaction ? "Saving…" : "Save transaction"}</Button>
          </div>
        </form>
      </Modal>

      <EditBrokerModal key={editingBrokerId} broker={editingBroker} onClose={() => setEditingBrokerId(null)} />

      <ConfirmDialog
        open={!!deletingBroker}
        onClose={() => setDeletingBrokerId(null)}
        onConfirm={handleDeleteBroker}
        title={`Delete ${deletingBroker?.name ?? "this broker"}?`}
        description={
          deleteError || "This can't be undone. Any transactions recorded for this broker will be deleted along with them."
        }
        confirmLabel="Delete broker"
      />
    </div>
  );
}
