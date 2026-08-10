import { useState } from "react";
import { useDispatch } from "react-redux";
import { Plus, Wallet, Banknote, History, Pencil, Trash2 } from "lucide-react";
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
import {
  useGetEmployeesQuery,
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useDeleteEmployeeMutation,
  useGetEmployeeTransactionsQuery,
  useCreateEmployeeTransactionMutation,
} from "../app/apiSlice";
import { pushed } from "../features/toast/toastSlice";
import { formatCurrency, formatDate, toLocalDateInput } from "../lib/format";

const emptyEmployeeForm = { name: "", email: "", position: "", monthlySalary: "", joinDate: toLocalDateInput() };
const TYPE_TONE = { Advance: "trace", Payout: "solder", Other: "neutral" };

function EditEmployeeModal({ employee, onClose }) {
  const dispatch = useDispatch();
  const [updateEmployee, { isLoading: saving }] = useUpdateEmployeeMutation();

  const [form, setForm] = useState(() => ({
    name: employee?.name ?? "",
    email: employee?.email ?? "",
    position: employee?.position ?? "",
    monthlySalary: employee?.monthlySalary ?? "",
    joinDate: employee?.joinDate ? employee.joinDate.slice(0, 10) : toLocalDateInput(),
  }));
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");

  if (!employee) return null;

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function validate() {
    const next = {};
    if (!form.name.trim()) next.name = "Name is required.";
    if (!form.position.trim()) next.position = "Position is required.";
    if (!form.monthlySalary || Number(form.monthlySalary) <= 0) next.monthlySalary = "Enter a monthly salary.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!validate()) return;
    try {
      await updateEmployee({
        id: employee._id,
        name: form.name.trim(),
        email: form.email.trim(),
        position: form.position.trim(),
        monthlySalary: Number(form.monthlySalary),
        joinDate: form.joinDate,
      }).unwrap();
      dispatch(pushed({ message: `${form.name.trim()} updated.` }));
      onClose();
    } catch (err) {
      setError(err?.data?.message ?? "Couldn't update this employee.");
    }
  }

  return (
    <Modal open={!!employee} onClose={onClose} title="Edit employee">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FieldGroup>
          <Label htmlFor="edit-emp-name">Name</Label>
          <Input id="edit-emp-name" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Full name" />
          <FieldError>{errors.name}</FieldError>
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor="edit-emp-email" hint="optional">Email</Label>
          <Input id="edit-emp-email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="name@itplace.shop" />
          <FieldError>{errors.email}</FieldError>
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor="edit-emp-position">Position</Label>
          <Input id="edit-emp-position" value={form.position} onChange={(e) => update("position", e.target.value)} placeholder="e.g. Repair Technician" />
          <FieldError>{errors.position}</FieldError>
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor="edit-emp-salary">Monthly salary</Label>
          <Input id="edit-emp-salary" type="number" min="0" value={form.monthlySalary} onChange={(e) => update("monthlySalary", e.target.value)} placeholder="0.00" />
          <FieldError>{errors.monthlySalary}</FieldError>
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor="edit-emp-join">Join date</Label>
          <Input id="edit-emp-join" type="date" value={form.joinDate} onChange={(e) => update("joinDate", e.target.value)} />
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

export default function Employees() {
  const dispatch = useDispatch();
  const { data: employeesRes, isLoading: employeesLoading } = useGetEmployeesQuery();
  const [createEmployee, { isLoading: savingEmployee }] = useCreateEmployeeMutation();
  const [createTransaction, { isLoading: savingTransaction }] = useCreateEmployeeTransactionMutation();
  const [deleteEmployee] = useDeleteEmployeeMutation();

  const employees = employeesRes?.data ?? [];

  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [employeeForm, setEmployeeForm] = useState(emptyEmployeeForm);
  const [employeeErrors, setEmployeeErrors] = useState({});

  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [txEmployeeId, setTxEmployeeId] = useState("");
  const [txType, setTxType] = useState("Advance");
  const [txAmount, setTxAmount] = useState("");
  const [txNotes, setTxNotes] = useState("");
  const [txErrors, setTxErrors] = useState({});

  const [historyEmployeeId, setHistoryEmployeeId] = useState("all");
  const historyEmployee = employees.find((emp) => emp._id === historyEmployeeId);
  const { data: transactionsRes, isLoading: transactionsLoading } = useGetEmployeeTransactionsQuery({
    employee: historyEmployeeId === "all" ? undefined : historyEmployeeId,
    limit: 100,
  });
  const transactions = transactionsRes?.data ?? [];

  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const editingEmployee = employees.find((emp) => emp._id === editingEmployeeId);
  const [deletingEmployeeId, setDeletingEmployeeId] = useState(null);
  const deletingEmployee = employees.find((emp) => emp._id === deletingEmployeeId);
  const [deleteError, setDeleteError] = useState("");

  function updateEmployeeField(field, value) {
    setEmployeeForm((f) => ({ ...f, [field]: value }));
  }

  function validateEmployee() {
    const next = {};
    if (!employeeForm.name.trim()) next.name = "Name is required.";
    if (!employeeForm.position.trim()) next.position = "Position is required.";
    if (!employeeForm.monthlySalary || Number(employeeForm.monthlySalary) <= 0) next.monthlySalary = "Enter a monthly salary.";
    setEmployeeErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleEmployeeSubmit(e) {
    e.preventDefault();
    if (!validateEmployee()) return;
    try {
      await createEmployee({
        name: employeeForm.name.trim(),
        email: employeeForm.email.trim(),
        position: employeeForm.position.trim(),
        monthlySalary: Number(employeeForm.monthlySalary),
        joinDate: employeeForm.joinDate,
      }).unwrap();
      dispatch(pushed({ message: `${employeeForm.name.trim()} added to the team.` }));
      setEmployeeModalOpen(false);
      setEmployeeForm(emptyEmployeeForm);
    } catch (err) {
      dispatch(pushed({ message: err?.data?.message ?? "Couldn't add this employee.", variant: "error" }));
    }
  }

  const txEmployee = employees.find((emp) => emp._id === txEmployeeId);

  // Opens the transaction modal, optionally pre-selecting an employee —
  // lets clicking a name in the table skip straight past the dropdown.
  function openTransactionModal(employeeId = "") {
    setTxType("Advance");
    setTxEmployeeId(employeeId);
    setTxAmount("");
    setTxNotes("");
    setTransactionModalOpen(true);
  }

  // "Pay out" is the same transaction form, pre-loaded as a Payout for
  // whatever's still owed overall — one click to record it as cleared,
  // or the amount can be edited for a partial payout.
  function openPayoutModal(employee) {
    setTxType("Payout");
    setTxEmployeeId(employee._id);
    setTxAmount(employee.remainingSalary > 0 ? String(Math.round(employee.remainingSalary * 100) / 100) : "");
    setTxNotes("");
    setTransactionModalOpen(true);
  }

  function closeTransactionModal() {
    setTransactionModalOpen(false);
    setTxErrors({});
  }

  function validateTransaction() {
    const next = {};
    if (!txEmployeeId) next.employeeId = "Choose an employee.";
    if (!txAmount || Number(txAmount) <= 0) next.amount = "Enter an amount greater than zero.";
    if (txType === "Payout" && txEmployee && !next.amount) {
      if (txEmployee.remainingSalary <= 0) {
        next.amount = "Nothing is owed — record an Advance instead.";
      } else if (Number(txAmount) > txEmployee.remainingSalary) {
        next.amount = `Can't exceed the ${formatCurrency(txEmployee.remainingSalary)} owed.`;
      }
    }
    setTxErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleTransactionSubmit(e) {
    e.preventDefault();
    if (!validateTransaction()) return;
    const employee = employees.find((emp) => emp._id === txEmployeeId);
    try {
      await createTransaction({ employee: txEmployeeId, type: txType, amount: Number(txAmount), notes: txNotes.trim() }).unwrap();
      dispatch(pushed({ message: `${txType} of ${formatCurrency(Number(txAmount))} recorded for ${employee?.name}.` }));
      closeTransactionModal();
      setTxEmployeeId("");
      setTxType("Advance");
      setTxAmount("");
      setTxNotes("");
    } catch (err) {
      dispatch(pushed({ message: err?.data?.message ?? "Couldn't save this transaction.", variant: "error" }));
    }
  }

  async function handleDeleteEmployee() {
    if (!deletingEmployee) return;
    try {
      await deleteEmployee(deletingEmployee._id).unwrap();
      dispatch(pushed({ message: `${deletingEmployee.name} removed from the team.` }));
      setDeleteError("");
    } catch (err) {
      setDeleteError(err?.data?.message ?? "Couldn't delete this employee.");
      throw err;
    }
  }

  return (
    <div>
      <PageHeader
        title="Employees"
        description={`${employees.length} people on payroll · salary accrues monthly and builds up until a payout is recorded.`}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => openTransactionModal()}>
              <Wallet size={16} /> Add transaction
            </Button>
            <Button onClick={() => setEmployeeModalOpen(true)}>
              <Plus size={16} /> Add employee
            </Button>
          </div>
        }
      />

      <Card className="mb-5">
        {employeesLoading ? (
          <SkeletonRows rows={5} cols={6} />
        ) : (
          <DataTable
            searchKeys={["name", "email", "position"]}
            searchPlaceholder="Search employees…"
            columns={[
              { key: "name", header: "Employee", render: (r) => (
                  <button
                    type="button"
                    onClick={() => openTransactionModal(r._id)}
                    aria-label={`Add transaction for ${r.name}`}
                    className="text-left"
                  >
                    <p className="font-medium text-text hover:underline">{r.name}</p>
                    <p className="text-[12.5px] text-text-faint">{r.email}</p>
                  </button>
                ) },
              { key: "position", header: "Position" },
              { key: "monthlySalary", header: "Monthly salary", align: "right", mono: true, render: (r) => formatCurrency(r.monthlySalary) },
              { key: "totalAdvance", header: "Paid out this month", align: "right", mono: true, render: (r) => formatCurrency(r.totalAdvance) },
              {
                key: "remainingSalary",
                header: "Remaining salary",
                align: "right",
                render: (r) =>
                  r.remainingSalary <= 0 ? (
                    <AssetTag tone={r.remainingSalary < 0 ? "fault" : "solder"}>
                      {r.remainingSalary < 0 ? formatCurrency(r.remainingSalary) : "Settled"}
                    </AssetTag>
                  ) : (
                    // Owed builds up until a Payout is recorded, so more owed reads
                    // worse the bigger it gets relative to one month's salary.
                    <AssetTag tone={r.remainingSalary >= r.monthlySalary ? "fault" : r.remainingSalary >= r.monthlySalary * 0.5 ? "trace" : "solder"}>
                      {formatCurrency(r.remainingSalary)}
                    </AssetTag>
                  ),
              },
              {
                key: "actions",
                header: "",
                render: (r) => (
                  <div className="flex items-center justify-end gap-3">
                    {r.remainingSalary > 0 && (
                      <button
                        onClick={() => openPayoutModal(r)}
                        className="inline-flex items-center gap-1 text-[12.5px] font-medium text-solder hover:underline"
                      >
                        <Banknote size={13} /> Pay out
                      </button>
                    )}
                    <button
                      onClick={() => setHistoryEmployeeId(r._id)}
                      className="inline-flex items-center gap-1 text-[12.5px] font-medium text-rose hover:underline"
                    >
                      <History size={13} /> History
                    </button>
                    <button
                      onClick={() => setEditingEmployeeId(r._id)}
                      aria-label={`Edit ${r.name}`}
                      className="rounded-[5px] p-1.5 text-text-faint hover:bg-bg-sunken hover:text-text"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => {
                        setDeletingEmployeeId(r._id);
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
            rows={employees}
            keyField="_id"
            pageSize={8}
          />
        )}
      </Card>

      <Card>
        <CardHeader
          title="Transactions"
          description={historyEmployee ? `Showing all records for ${historyEmployee.name}.` : "Salary advances, payouts, and other payments across the team."}
        />
        {transactionsLoading ? (
          <SkeletonRows rows={7} cols={5} />
        ) : (
          <DataTable
            filters={
              <Select value={historyEmployeeId} onChange={(e) => setHistoryEmployeeId(e.target.value)} className="!h-8.5 w-48 !text-[13px]">
                <option value="all">All employees</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>{emp.name}</option>
                ))}
              </Select>
            }
            columns={[
              { key: "employee", header: "Employee", render: (r) => r.employee?.name ?? "—" },
              { key: "type", header: "Type", render: (r) => <AssetTag tone={TYPE_TONE[r.type] ?? "neutral"}>{r.type}</AssetTag> },
              { key: "amount", header: "Amount", align: "right", mono: true, render: (r) => formatCurrency(r.amount) },
              { key: "date", header: "Date", render: (r) => formatDate(r.date) },
              { key: "notes", header: "Notes", render: (r) => r.notes || "—" },
            ]}
            rows={transactions}
            keyField="_id"
            pageSize={9}
            emptyState={<EmptyState icon={Wallet} title="No transactions" description="Advances, payouts, and other payments will appear here." />}
          />
        )}
      </Card>

      <Modal open={employeeModalOpen} onClose={() => setEmployeeModalOpen(false)} title="Add employee">
        <form onSubmit={handleEmployeeSubmit} className="space-y-4">
          <FieldGroup>
            <Label htmlFor="emp-name">Name</Label>
            <Input id="emp-name" value={employeeForm.name} onChange={(e) => updateEmployeeField("name", e.target.value)} placeholder="Full name" />
            <FieldError>{employeeErrors.name}</FieldError>
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="emp-email" hint="optional">Email</Label>
            <Input id="emp-email" type="email" value={employeeForm.email} onChange={(e) => updateEmployeeField("email", e.target.value)} placeholder="name@itplace.shop" />
            <FieldError>{employeeErrors.email}</FieldError>
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="emp-position">Position</Label>
            <Input id="emp-position" value={employeeForm.position} onChange={(e) => updateEmployeeField("position", e.target.value)} placeholder="e.g. Repair Technician" />
            <FieldError>{employeeErrors.position}</FieldError>
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="emp-salary">Monthly salary</Label>
            <Input id="emp-salary" type="number" min="0" value={employeeForm.monthlySalary} onChange={(e) => updateEmployeeField("monthlySalary", e.target.value)} placeholder="0.00" />
            <FieldError>{employeeErrors.monthlySalary}</FieldError>
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="emp-join">Join date</Label>
            <Input id="emp-join" type="date" value={employeeForm.joinDate} onChange={(e) => updateEmployeeField("joinDate", e.target.value)} />
          </FieldGroup>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setEmployeeModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={savingEmployee}>{savingEmployee ? "Saving…" : "Save employee"}</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={transactionModalOpen}
        onClose={closeTransactionModal}
        title={txType === "Payout" ? "Record salary payout" : "Add employee transaction"}
        description={txType === "Payout" ? "Marks this much of the month's salary as paid out." : undefined}
      >
        <form onSubmit={handleTransactionSubmit} className="space-y-4">
          <FieldGroup>
            <Label htmlFor="tx-employee">Employee</Label>
            <Select
              id="tx-employee"
              value={txEmployeeId}
              onChange={(e) => {
                const nextEmployee = employees.find((emp) => emp._id === e.target.value);
                setTxEmployeeId(e.target.value);
                if (txType === "Payout" && (!nextEmployee || nextEmployee.remainingSalary <= 0)) {
                  setTxType("Advance");
                }
              }}
            >
              <option value="">Select an employee</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>{emp.name}</option>
              ))}
            </Select>
            <FieldError>{txErrors.employeeId}</FieldError>
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="tx-type">Type</Label>
            <Select id="tx-type" value={txType} onChange={(e) => setTxType(e.target.value)}>
              <option>Advance</option>
              <option value="Payout" disabled={!!txEmployee && txEmployee.remainingSalary <= 0}>
                Payout{txEmployee && txEmployee.remainingSalary <= 0 ? " (nothing owed)" : ""}
              </option>
              <option>Other</option>
            </Select>
          </FieldGroup>
          <FieldGroup>
            <Label
              htmlFor="tx-amount"
              hint={txEmployee ? `Balance owed: ${formatCurrency(txEmployee.remainingSalary)}` : undefined}
            >
              Amount
            </Label>
            <Input
              id="tx-amount"
              type="number"
              min="0"
              step="0.01"
              max={txType === "Payout" && txEmployee ? Math.max(txEmployee.remainingSalary, 0) : undefined}
              value={txAmount}
              onChange={(e) => setTxAmount(e.target.value)}
              placeholder="0.00"
            />
            <FieldError>{txErrors.amount}</FieldError>
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="tx-notes" hint="optional">Notes</Label>
            <Textarea id="tx-notes" value={txNotes} onChange={(e) => setTxNotes(e.target.value)} placeholder="Repayment terms, reason, etc." />
          </FieldGroup>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={closeTransactionModal}>Cancel</Button>
            <Button type="submit" disabled={savingTransaction}>{savingTransaction ? "Saving…" : "Save transaction"}</Button>
          </div>
        </form>
      </Modal>

      <EditEmployeeModal key={editingEmployeeId} employee={editingEmployee} onClose={() => setEditingEmployeeId(null)} />

      <ConfirmDialog
        open={!!deletingEmployee}
        onClose={() => setDeletingEmployeeId(null)}
        onConfirm={handleDeleteEmployee}
        title={`Delete ${deletingEmployee?.name ?? "this employee"}?`}
        description={
          deleteError || "This can't be undone. Any transactions recorded for this employee will be deleted along with them."
        }
        confirmLabel="Delete employee"
      />
    </div>
  );
}
