import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Plus, Receipt } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import { Card, CardHeader, CardBody } from "../components/ui/Card";
import { Select, Input, Textarea, Label, FieldGroup, FieldError } from "../components/ui/Field";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import DataTable from "../components/ui/DataTable";
import EmptyState from "../components/ui/EmptyState";
import { SkeletonRows } from "../components/ui/Skeleton";
import { useGetExpensesQuery, useGetEmployeesQuery, useCreateExpenseMutation } from "../app/apiSlice";
import { selectThemeMode } from "../features/theme/themeSlice";
import { pushed } from "../features/toast/toastSlice";
import { formatCurrency, formatDate } from "../lib/format";
import { CHART_COLORS, CHART_GRID_LIGHT, CHART_GRID_DARK } from "../lib/colors";

const today = () => new Date().toISOString().slice(0, 10);

export default function Expenses() {
  const dispatch = useDispatch();
  const mode = useSelector(selectThemeMode);
  const { data: expensesRes, isLoading } = useGetExpensesQuery({ limit: 200 });
  const { data: employeesRes } = useGetEmployeesQuery();
  const [createExpense, { isLoading: saving }] = useCreateExpenseMutation();

  const expenses = expensesRes?.data ?? [];
  const categories = expensesRes?.meta?.categories ?? [];
  const employees = employeesRes?.data ?? [];

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [description, setDescription] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [errors, setErrors] = useState({});

  const thisMonthTotal = useMemo(() => {
    const monthKey = today().slice(0, 7);
    return expenses.filter((e) => e.date.startsWith(monthKey)).reduce((s, e) => s + e.amount, 0);
  }, [expenses]);

  const todaysCount = useMemo(() => expenses.filter((e) => e.date.startsWith(today())).length, [expenses]);

  // Month filter narrows both the category chart and the table below; the
  // header stats above always reflect the real current month regardless.
  const monthFiltered = useMemo(
    () => (monthFilter ? expenses.filter((e) => e.date.startsWith(monthFilter)) : expenses),
    [expenses, monthFilter]
  );

  const byCategory = useMemo(() => {
    const totals = Object.fromEntries(categories.map((c) => [c, 0]));
    monthFiltered.forEach((e) => {
      totals[e.category] = (totals[e.category] ?? 0) + e.amount;
    });
    return categories.map((c) => ({ label: c, value: totals[c] }));
  }, [monthFiltered, categories]);

  const filtered = categoryFilter === "all" ? monthFiltered : monthFiltered.filter((e) => e.category === categoryFilter);
  const grid = mode === "dark" ? CHART_GRID_DARK : CHART_GRID_LIGHT;
  const tickColor = mode === "dark" ? "#9aa2a4" : "#5b6266";

  function validate() {
    const next = {};
    if (!category.trim()) next.category = "Enter a category.";
    if (!amount || Number(amount) <= 0) next.amount = "Enter an amount greater than zero.";
    if (!date) next.date = "Choose a date.";
    if (!description.trim()) next.description = "Add a short description.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    try {
      await createExpense({
        category: category.trim(),
        amount: Number(amount),
        date,
        description: description.trim(),
        employee: employeeId || undefined,
      }).unwrap();
      dispatch(pushed({ message: `${category} expense of ${formatCurrency(Number(amount))} recorded.` }));
      setModalOpen(false);
      setCategory("");
      setAmount("");
      setDescription("");
      setEmployeeId("");
      setDate(today());
    } catch (err) {
      dispatch(pushed({ message: err?.data?.message ?? "Couldn't save this expense.", variant: "error" }));
    }
  }

  return (
    <div>
      <PageHeader
        title="Company Expenses"
        description={`${formatCurrency(thisMonthTotal)} spent this month · ${todaysCount} logged today.`}
        action={
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Add expense
          </Button>
        }
      />

      <Card className="mb-5">
        <CardHeader title="Spend by category" />
        <CardBody>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byCategory} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: grid }} tick={{ fontFamily: "IBM Plex Mono", fontSize: 10.5, fill: tickColor }} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis tickLine={false} axisLine={false} width={56} tick={{ fontFamily: "IBM Plex Mono", fontSize: 10.5, fill: tickColor }} tickFormatter={(v) => `SAR ${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`} />
              <Tooltip
                cursor={{ fill: "transparent" }}
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <div className="rounded-[6px] border border-border bg-bg-elevated px-3 py-2 shadow-lg">
                      <p className="font-mono text-[10.5px] uppercase tracking-wide text-text-faint">{label}</p>
                      <p className="mt-0.5 font-mono text-[13px] font-medium text-text">{formatCurrency(payload[0].value)}</p>
                    </div>
                  ) : null
                }
              />
              <Bar dataKey="value" fill={CHART_COLORS.trace} radius={[3, 3, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>

      <Card>
        {isLoading ? (
          <SkeletonRows rows={7} cols={5} />
        ) : (
          <DataTable
            searchKeys={["description"]}
            searchPlaceholder="Search descriptions…"
            filters={
              <>
                <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="!h-8.5 w-40 !text-[13px]">
                  <option value="all">All categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Select>
                <Input
                  type="month"
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="!h-8.5 w-36 !text-[13px]"
                />
                {monthFilter && (
                  <button
                    type="button"
                    onClick={() => setMonthFilter("")}
                    className="text-[12.5px] font-medium text-text-faint hover:text-text hover:underline"
                  >
                    Clear month
                  </button>
                )}
              </>
            }
            columns={[
              { key: "category", header: "Category" },
              { key: "description", header: "Description" },
              { key: "employee", header: "Employee", render: (r) => r.employee?.name ?? "—" },
              { key: "amount", header: "Amount", align: "right", mono: true, render: (r) => formatCurrency(r.amount) },
              { key: "date", header: "Date", render: (r) => formatDate(r.date) },
            ]}
            rows={filtered}
            keyField="_id"
            pageSize={9}
            emptyState={<EmptyState icon={Receipt} title="No expenses match" description="Try a different category filter." />}
          />
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add expense">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FieldGroup>
            <Label htmlFor="exp-category" hint="type to add new">Category</Label>
            <Input id="exp-category" list="exp-category-options" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Select or type a category" />
            <datalist id="exp-category-options">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <FieldError>{errors.category}</FieldError>
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="exp-amount">Amount</Label>
            <Input id="exp-amount" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
            <FieldError>{errors.amount}</FieldError>
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="exp-date">Date</Label>
            <Input id="exp-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <FieldError>{errors.date}</FieldError>
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="exp-description">Description</Label>
            <Textarea id="exp-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What was this for?" />
            <FieldError>{errors.description}</FieldError>
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="exp-employee" hint="optional">Related employee</Label>
            <Select id="exp-employee" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              <option value="">None</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>{emp.name}</option>
              ))}
            </Select>
          </FieldGroup>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save expense"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
