import { useEffect } from "react";
import { useSelector } from "react-redux";
import { Routes, Route } from "react-router-dom";
import { selectThemeMode } from "./features/theme/themeSlice";
import AppShell from "./components/layout/AppShell";
import AuthGate from "./components/layout/AuthGate";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import RoleRoute from "./components/layout/RoleRoute";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import AddProduct from "./pages/AddProduct";
import PurchaseEntry from "./pages/PurchaseEntry";
import PurchaseHistory from "./pages/PurchaseHistory";
import SaleUpdate from "./pages/SaleUpdate";
import Inventory from "./pages/Inventory";
import Employees from "./pages/Employees";
import Brokers from "./pages/Brokers";
import Expenses from "./pages/Expenses";
import DueRecords from "./pages/DueRecords";
import BrandCommission from "./pages/BrandCommission";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

export default function App() {
  const mode = useSelector(selectThemeMode);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", mode === "dark");
  }, [mode]);

  return (
    <AuthGate>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route index element={<Dashboard />} />
            <Route path="products" element={<Products />} />
            <Route path="purchases/new" element={<PurchaseEntry />} />
            <Route path="purchases" element={<PurchaseHistory />} />
            <Route path="sales" element={<SaleUpdate />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="profile" element={<Profile />} />

            <Route element={<RoleRoute roles={["owner"]} />}>
              <Route path="products/new" element={<AddProduct />} />
              <Route path="employees" element={<Employees />} />
              <Route path="brokers" element={<Brokers />} />
              <Route path="expenses" element={<Expenses />} />
              <Route path="customers/dues" element={<DueRecords />} />
              <Route path="brand-commission" element={<BrandCommission />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthGate>
  );
}
