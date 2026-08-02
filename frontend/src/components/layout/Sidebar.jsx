import { NavLink } from "react-router-dom";
import { useSelector } from "react-redux";
import { X } from "lucide-react";
import { NAV_GROUPS } from "../../lib/navigation";
import { selectAuth } from "../../features/auth/authSlice";
import { cn } from "../../lib/cn";

function Logo() {
  return (
    <div className="flex items-center gap-2.5 px-5 py-5">
      <svg viewBox="0 0 48 48" className="h-8 w-8 shrink-0">
        <rect x="4" y="4" width="40" height="40" rx="8" fill="#0e1112" />
        <path
          d="M15 14h17a2.4 2.4 0 0 1 2.4 2.4v15.2a2.4 2.4 0 0 1-2.4 2.4H15a2.4 2.4 0 0 1-2.4-2.4v-6.13L9 24l3.6-6.47V16.4A2.4 2.4 0 0 1 15 14Z"
          fill="#C13C6B"
        />
        <circle cx="18.6" cy="24" r="2.7" fill="#0e1112" />
      </svg>
      <div className="leading-tight">
        <p className="font-display text-[15px] font-bold tracking-tight text-aluminum">IT PLACE</p>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-aluminum/45">Inventory</p>
      </div>
    </div>
  );
}

function NavItem({ item, onNavigate }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "group relative flex items-center gap-2.5 rounded-[5px] px-3 py-2.5 text-[14.5px] font-medium transition-colors",
          isActive ? "bg-white/[0.08] text-aluminum" : "text-aluminum/55 hover:bg-white/[0.05] hover:text-aluminum/90"
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              "absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-rose transition-opacity",
              isActive ? "opacity-100" : "opacity-0"
            )}
          />
          <Icon size={16} strokeWidth={2} className="shrink-0" />
          <span className="truncate">{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar({ mobileOpen, onClose }) {
  const { user } = useSelector(selectAuth);
  const role = user?.role ?? "employee";

  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.roles.includes(role)),
  })).filter((group) => group.items.length > 0);

  const content = (
    <div className="flex h-full flex-col bg-ink">
      <div className="flex items-center justify-between">
        <Logo />
        <button
          onClick={onClose}
          aria-label="Close menu"
          className="mr-4 rounded-[5px] p-1.5 text-aluminum/60 hover:bg-white/5 lg:hidden"
        >
          <X size={18} />
        </button>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {visibleGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-aluminum/30">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavItem key={item.to} item={item} onNavigate={onClose} />
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/[0.06] px-5 py-4">
        <p className="font-mono text-[10.5px] text-aluminum/35">
          Signed in as <span className="text-aluminum/60">{role}</span>
        </p>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden w-[236px] shrink-0 lg:block">
        <div className="fixed h-svh w-[236px]">{content}</div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/70" onClick={onClose} />
          <aside className="absolute inset-y-0 left-0 w-[260px]">{content}</aside>
        </div>
      )}
    </>
  );
}
