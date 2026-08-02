import { useState } from "react";
import { useSelector } from "react-redux";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useSignupMutation } from "../app/apiSlice";
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
          Request access,
          <br />
          get to work.
        </h1>
        <p className="mt-3 max-w-xs text-[14px] leading-relaxed text-aluminum/55">
          Create an account and the shop owner will grant you access once
          they've reviewed it.
        </p>
      </div>

      <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-4 font-mono text-[11px]">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
          <span className="uppercase tracking-wide text-aluminum/40">Access flow</span>
        </div>
        <div className="mt-2.5 space-y-1.5 text-aluminum/70">
          <div className="flex justify-between">
            <span>SIGN UP</span>
            <span className="text-aluminum">no access yet</span>
          </div>
          <div className="flex justify-between">
            <span>OWNER REVIEW</span>
            <span className="text-aluminum">notified by email</span>
          </div>
          <div className="flex justify-between">
            <span>GRANTED</span>
            <span className="text-trace">full workspace</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Signup() {
  const navigate = useNavigate();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const [signup, { isLoading }] = useSignupMutation();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Fill in your name, email, and password to continue.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    try {
      await signup({ name: name.trim(), email: email.trim(), password }).unwrap();
      navigate("/", { replace: true });
    } catch (err) {
      setError(err?.data?.message ?? "Couldn't create your account. Try again.");
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

          <h2 className="font-display text-[24px] font-semibold tracking-tight text-text">Create an account</h2>
          <p className="mt-1 text-[14.5px] text-text-muted">
            The owner will grant you access once your account is reviewed.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <FieldGroup>
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                type="text"
                autoComplete="name"
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </FieldGroup>

            <FieldGroup>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="you@itplace.shop"
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
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
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
              {isLoading ? "Creating account…" : "Create account"}
            </Button>
          </form>

          <p className="mt-4 text-center text-[13.5px] text-text-muted">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-text hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
