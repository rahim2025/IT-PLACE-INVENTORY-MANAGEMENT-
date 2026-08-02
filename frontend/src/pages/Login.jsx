import { useState } from "react";
import { useSelector } from "react-redux";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useLoginMutation } from "../app/apiSlice";
import { selectIsAuthenticated } from "../features/auth/authSlice";
import { Input, Label, FieldGroup } from "../components/ui/Field";
import Button from "../components/ui/Button";

function BrandPane() {
  return (
    <div className="relative hidden flex-col justify-between overflow-hidden bg-ink px-10 py-10 text-aluminum lg:flex lg:w-[42%]">
      <div className="flex items-center gap-2.5">
        <svg viewBox="0 0 48 48" className="h-8 w-8">
          <rect x="4" y="4" width="40" height="40" rx="8" fill="#0e1112" />
          <path
            d="M15 14h17a2.4 2.4 0 0 1 2.4 2.4v15.2a2.4 2.4 0 0 1-2.4 2.4H15a2.4 2.4 0 0 1-2.4-2.4v-6.13L9 24l3.6-6.47V16.4A2.4 2.4 0 0 1 15 14Z"
            fill="#C13C6B"
          />
          <circle cx="18.6" cy="24" r="2.7" fill="#0e1112" />
        </svg>
        <div className="leading-tight">
          <p className="font-display text-[15px] font-bold tracking-tight">IT PLACE</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-aluminum/45">Inventory</p>
        </div>
      </div>

      <div>
        <h1 className="font-display text-[32px] font-semibold leading-[1.15] tracking-tight">
          Every part, priced,
          <br />
          tracked, and tagged.
        </h1>
        <p className="mt-3 max-w-xs text-[14px] leading-relaxed text-aluminum/55">
          Stock, purchases, payroll advances, and customer credit for the shop
          floor — one ledger, no guesswork.
        </p>
      </div>

      <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-4 font-mono text-[11px]">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
          <span className="uppercase tracking-wide text-aluminum/40">Live stock readout</span>
          <span className="flex items-center gap-1.5 text-solder">
            <span className="h-[6px] w-[6px] rounded-full bg-solder shadow-[0_0_6px_var(--color-solder)]" />
            nominal
          </span>
        </div>
        <div className="mt-2.5 space-y-1.5 text-aluminum/70">
          <div className="flex justify-between">
            <span>PRODUCTS TRACKED</span>
            <span className="text-aluminum">live from API</span>
          </div>
          <div className="flex justify-between">
            <span>WEIGHTED AVG COST</span>
            <span className="text-aluminum">auto-calculated</span>
          </div>
          <div className="flex justify-between">
            <span>LOW-STOCK WATCH</span>
            <span className="text-trace">on the dashboard</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const [login, { isLoading }] = useLoginMutation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  if (isAuthenticated) {
    const from = location.state?.from?.pathname ?? "/";
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Enter an email and password to continue.");
      return;
    }
    try {
      await login({ email: email.trim(), password }).unwrap();
      navigate("/", { replace: true });
    } catch (err) {
      setError(err?.data?.message ?? "That email or password isn't right.");
    }
  }

  return (
    <div className="flex min-h-svh bg-bg">
      <BrandPane />

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <svg viewBox="0 0 48 48" className="h-8 w-8">
              <rect x="4" y="4" width="40" height="40" rx="8" fill="#14181A" />
              <path
                d="M15 14h17a2.4 2.4 0 0 1 2.4 2.4v15.2a2.4 2.4 0 0 1-2.4 2.4H15a2.4 2.4 0 0 1-2.4-2.4v-6.13L9 24l3.6-6.47V16.4A2.4 2.4 0 0 1 15 14Z"
                fill="#C13C6B"
              />
              <circle cx="18.6" cy="24" r="2.7" fill="#14181A" />
            </svg>
            <div className="leading-tight">
              <p className="font-display text-[15px] font-bold tracking-tight text-text">IT PLACE</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-faint">Inventory</p>
            </div>
          </div>

          <h2 className="font-display text-[24px] font-semibold tracking-tight text-text">Sign in</h2>
          <p className="mt-1 text-[14.5px] text-text-muted">Access your shop's inventory workspace.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <FieldGroup>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="owner@itplace.shop"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </FieldGroup>

            <FieldGroup>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-faint hover:text-text"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </FieldGroup>

            {error && (
              <p role="alert" className="rounded-[5px] border border-fault/30 bg-fault/10 px-3 py-2 text-[13px] text-fault-dark dark:text-fault">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="mt-5 rounded-[6px] border border-border bg-bg-sunken px-3.5 py-2.5 text-[12.5px] leading-relaxed text-text-faint">
            Seeded accounts — owner:{" "}
            <span className="font-mono text-text-muted">owner@itplace.shop / ChangeMe123!</span>, employee:{" "}
            <span className="font-mono text-text-muted">rafael.costa@itplace.shop / Employee123!</span>
          </p>
        </div>
      </div>
    </div>
  );
}
