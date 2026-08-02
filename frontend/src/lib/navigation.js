import {
  LayoutDashboard,
  Package,
  PackagePlus,
  History,
  ShoppingCart,
  Boxes,
  Users,
  Handshake,
  Receipt,
  HandCoins,
  Percent,
  FileBarChart2,
  Settings,
} from "lucide-react";

export const NAV_GROUPS = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", to: "/", icon: LayoutDashboard, roles: ["owner", "employee"] }],
  },
  {
    label: "Catalog",
    items: [{ label: "Products", to: "/products", icon: Package, roles: ["owner", "employee"] }],
  },
  {
    label: "Stock",
    items: [
      { label: "Purchase Entry", to: "/purchases/new", icon: PackagePlus, roles: ["owner", "employee"] },
      { label: "Purchase History", to: "/purchases", icon: History, roles: ["owner", "employee"] },
      { label: "Sale Update", to: "/sales", icon: ShoppingCart, roles: ["owner", "employee"] },
      { label: "Inventory", to: "/inventory", icon: Boxes, roles: ["owner", "employee"] },
    ],
  },
  {
    label: "People",
    items: [
      { label: "Employees", to: "/employees", icon: Users, roles: ["owner"] },
      { label: "Brokers", to: "/brokers", icon: Handshake, roles: ["owner"] },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Company Expenses", to: "/expenses", icon: Receipt, roles: ["owner"] },
      { label: "Due Records", to: "/customers/dues", icon: HandCoins, roles: ["owner"] },
    ],
  },
  {
    label: "Reporting",
    items: [
      { label: "Reports", to: "/reports", icon: FileBarChart2, roles: ["owner"] },
      { label: "Brand Commission", to: "/brand-commission", icon: Percent, roles: ["owner"] },
      { label: "Settings", to: "/settings", icon: Settings, roles: ["owner"] },
    ],
  },
];

export const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);
