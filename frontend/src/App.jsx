import { lazy, Suspense, useEffect } from "react";
import { useSelector } from "react-redux";
import { Routes, Route } from "react-router-dom";
import { selectThemeMode } from "./features/theme/themeSlice";
import AppShell from "./components/layout/AppShell";
import AuthGate from "./components/layout/AuthGate";
import FullPageLoader from "./components/layout/FullPageLoader";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import RoleRoute from "./components/layout/RoleRoute";
import AccessGate from "./components/layout/AccessGate";

// Lazy-loaded so each route's code (and heavy per-page deps like jspdf/
// recharts) is fetched on demand instead of bundled into the initial load.
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const PendingAccess = lazy(() => import("./pages/PendingAccess"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Products = lazy(() => import("./pages/Products"));
const AddProduct = lazy(() => import("./pages/AddProduct"));
const PurchaseEntry = lazy(() => import("./pages/PurchaseEntry"));
const PurchaseHistory = lazy(() => import("./pages/PurchaseHistory"));
const SaleUpdate = lazy(() => import("./pages/SaleUpdate"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Employees = lazy(() => import("./pages/Employees"));
const Brokers = lazy(() => import("./pages/Brokers"));
const Expenses = lazy(() => import("./pages/Expenses"));
const DueRecords = lazy(() => import("./pages/DueRecords"));
const BrandCommission = lazy(() => import("./pages/BrandCommission"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const Users = lazy(() => import("./pages/Users"));
const Profile = lazy(() => import("./pages/Profile"));
const NotFound = lazy(() => import("./pages/NotFound"));

export default function App() {
  const mode = useSelector(selectThemeMode);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", mode === "dark");
  }, [mode]);

  return (
    <AuthGate>
      <Suspense fallback={<FullPageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/pending" element={<PendingAccess />} />

            <Route element={<AccessGate />}>
              <Route element={<AppShell />}>
                <Route index element={<Dashboard />} />
                <Route path="products" element={<Products />} />
                <Route path="purchases/new" element={<PurchaseEntry />} />
                <Route path="purchases" element={<PurchaseHistory />} />
                <Route path="sales" element={<SaleUpdate />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="profile" element={<Profile />} />

                <Route element={<RoleRoute roles={["owner", "employee"]} />}>
                  <Route path="products/new" element={<AddProduct />} />
                </Route>

                <Route element={<RoleRoute roles={["owner"]} />}>
                  <Route path="employees" element={<Employees />} />
                  <Route path="brokers" element={<Brokers />} />
                  <Route path="expenses" element={<Expenses />} />
                  <Route path="customers/dues" element={<DueRecords />} />
                  <Route path="brand-commission" element={<BrandCommission />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="users" element={<Users />} />
                </Route>
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AuthGate>
  );
}
