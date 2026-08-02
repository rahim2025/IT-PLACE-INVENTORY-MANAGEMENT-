import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Menu, Bell, Sun, Moon, ChevronDown, TriangleAlert, CircleX } from "lucide-react";
import GlobalSearch from "./GlobalSearch";
import { selectThemeMode, toggled } from "../../features/theme/themeSlice";
import { selectAuth, loggedOut } from "../../features/auth/authSlice";
import { useGetStockOverviewQuery } from "../../app/apiSlice";
import { cn } from "../../lib/cn";

function initials(name = "") {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function Topbar({ onMenuClick }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const mode = useSelector(selectThemeMode);
  const { user } = useSelector(selectAuth);
  const { data: outOfStockRes } = useGetStockOverviewQuery({ status: "out" });
  const { data: lowStockRes } = useGetStockOverviewQuery({ status: "low" });
  const outOfStock = outOfStockRes?.data ?? [];
  const lowStock = lowStockRes?.data ?? [];
  const alertCount = lowStock.length + outOfStock.length;

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-bg/85 px-4 backdrop-blur sm:px-6">
      <button
        onClick={onMenuClick}
        aria-label="Open menu"
        className="rounded-[5px] p-1.5 text-text-muted hover:bg-bg-sunken hover:text-text lg:hidden"
      >
        <Menu size={19} />
      </button>

      <div className="hidden flex-1 sm:block">
        <GlobalSearch />
      </div>

      <div className="ml-auto flex items-center gap-1.5 sm:ml-0">
        <button
          onClick={() => dispatch(toggled())}
          aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="flex h-9 w-9 items-center justify-center rounded-[6px] text-text-muted hover:bg-bg-sunken hover:text-text"
        >
          {mode === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <div className="relative">
          <button
            onClick={() => {
              setNotifOpen((v) => !v);
              setProfileOpen(false);
            }}
            aria-label="Notifications"
            className="relative flex h-9 w-9 items-center justify-center rounded-[6px] text-text-muted hover:bg-bg-sunken hover:text-text"
          >
            <Bell size={17} />
            {alertCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-fault px-1 font-mono text-[9.5px] font-semibold text-white">
                {alertCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-lg border border-border bg-bg-elevated py-1.5 shadow-xl">
              <p className="px-3.5 py-1.5 font-mono text-[10.5px] uppercase tracking-wide text-text-faint">
                Stock alerts
              </p>
              {alertCount === 0 ? (
                <p className="px-3.5 py-3 text-[13px] text-text-muted">All stock levels are healthy.</p>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  {outOfStock.map((p) => (
                    <button
                      key={p._id}
                      onClick={() => {
                        navigate("/inventory");
                        setNotifOpen(false);
                      }}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left hover:bg-bg-sunken"
                    >
                      <CircleX size={15} className="shrink-0 text-fault" />
                      <span className="min-w-0 flex-1 truncate text-[13.5px] text-text">{p.name}</span>
                      <span className="shrink-0 font-mono text-[11px] text-fault">Out</span>
                    </button>
                  ))}
                  {lowStock.map((p) => (
                    <button
                      key={p._id}
                      onClick={() => {
                        navigate("/inventory");
                        setNotifOpen(false);
                      }}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left hover:bg-bg-sunken"
                    >
                      <TriangleAlert size={15} className="shrink-0 text-trace" />
                      <span className="min-w-0 flex-1 truncate text-[13.5px] text-text">{p.name}</span>
                      <span className="shrink-0 font-mono text-[11px] text-trace">{p.currentStock} left</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="relative ml-1">
          <button
            onClick={() => {
              setProfileOpen((v) => !v);
              setNotifOpen(false);
            }}
            className="flex items-center gap-2 rounded-[6px] py-1 pl-1 pr-2 hover:bg-bg-sunken"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose/15 font-display text-[12px] font-semibold text-rose">
              {initials(user?.name)}
            </span>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block text-[13.5px] font-medium text-text">{user?.name}</span>
              <span className="block font-mono text-[10.5px] uppercase tracking-wide text-text-faint">{user?.role}</span>
            </span>
            <ChevronDown size={14} className="hidden text-text-faint sm:block" />
          </button>
          {profileOpen && (
            <div className="absolute right-0 top-full z-30 mt-2 w-44 rounded-lg border border-border bg-bg-elevated py-1.5 shadow-xl">
              <button
                onClick={() => {
                  navigate("/profile");
                  setProfileOpen(false);
                }}
                className="block w-full px-3.5 py-2 text-left text-[13.5px] text-text hover:bg-bg-sunken"
              >
                Profile
              </button>
              {user?.role === "owner" && (
                <button
                  onClick={() => {
                    navigate("/settings");
                    setProfileOpen(false);
                  }}
                  className="block w-full px-3.5 py-2 text-left text-[13.5px] text-text hover:bg-bg-sunken"
                >
                  Settings
                </button>
              )}
              <div className="my-1 border-t border-border" />
              <button
                onClick={() => {
                  dispatch(loggedOut());
                  navigate("/login");
                }}
                className={cn("block w-full px-3.5 py-2 text-left text-[13px] text-fault hover:bg-bg-sunken")}
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
