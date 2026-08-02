import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import PageHeader from "../components/ui/PageHeader";
import { Card, CardHeader, CardBody } from "../components/ui/Card";
import { Input, Label, FieldGroup } from "../components/ui/Field";
import Button from "../components/ui/Button";
import AssetTag from "../components/ui/AssetTag";
import { useGetSettingsQuery, useUpdateSettingsMutation } from "../app/apiSlice";
import { pushed } from "../features/toast/toastSlice";

const emptyForm = { shopName: "", address: "", supportEmail: "", lowStockThreshold: 10 };

export default function Settings() {
  const dispatch = useDispatch();
  const { data: settingsRes } = useGetSettingsQuery();
  const [updateSettings, { isLoading: saving }] = useUpdateSettingsMutation();
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (settingsRes?.data) setForm(settingsRes.data);
  }, [settingsRes]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await updateSettings({ ...form, lowStockThreshold: Number(form.lowStockThreshold) }).unwrap();
      dispatch(pushed({ message: "Settings saved." }));
    } catch (err) {
      dispatch(pushed({ message: err?.data?.message ?? "Couldn't save settings.", variant: "error" }));
    }
  }

  return (
    <div>
      <PageHeader title="Settings" description="Shop details and system behavior — owner access only." />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Shop profile" description="Shown on printed reports" />
          <CardBody>
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              <FieldGroup className="sm:col-span-2">
                <Label htmlFor="shopName">Shop name</Label>
                <Input id="shopName" value={form.shopName} onChange={(e) => update("shopName", e.target.value)} />
              </FieldGroup>
              <FieldGroup className="sm:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" value={form.address} onChange={(e) => update("address", e.target.value)} />
              </FieldGroup>
              <FieldGroup>
                <Label htmlFor="supportEmail">Contact email</Label>
                <Input id="supportEmail" type="email" value={form.supportEmail} onChange={(e) => update("supportEmail", e.target.value)} />
              </FieldGroup>
              <FieldGroup>
                <Label htmlFor="lowStockThreshold" hint="units">Low-stock threshold</Label>
                <Input
                  id="lowStockThreshold"
                  type="number"
                  min="0"
                  value={form.lowStockThreshold}
                  onChange={(e) => update("lowStockThreshold", e.target.value)}
                />
              </FieldGroup>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save settings"}</Button>
              </div>
            </form>
          </CardBody>
        </Card>

        <Card className="h-fit">
          <CardHeader title="Roles & access" />
          <CardBody className="space-y-3 text-[13px] text-text-muted">
            <div className="flex items-center justify-between">
              <span>Owner</span>
              <AssetTag tone="rose">Full access</AssetTag>
            </div>
            <p>Manages inventory, employees, expenses, customer dues, reports, and settings.</p>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <span>Employee</span>
              <AssetTag tone="neutral">Limited</AssetTag>
            </div>
            <p>Views products and stock, records purchases and stock adjustments. Can't delete records or reach financial pages.</p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
