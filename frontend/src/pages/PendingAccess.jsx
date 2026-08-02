import { useDispatch, useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import { Hourglass } from "lucide-react";
import { loggedOut, selectAuth } from "../features/auth/authSlice";
import Button from "../components/ui/Button";

export default function PendingAccess() {
  const dispatch = useDispatch();
  const { user } = useSelector(selectAuth);

  if (user && user.role !== "user") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-bg px-6 text-center">
      <Hourglass size={34} className="text-text-faint" />
      <h1 className="font-display text-xl font-semibold text-text">Waiting for access</h1>
      <p className="max-w-sm text-[13.5px] text-text-muted">
        {user?.name ? `Hi ${user.name}, your` : "Your"} account has been created, but the shop
        owner hasn't granted you access yet. Check back once they've reviewed your sign-up.
      </p>
      <Button variant="secondary" className="mt-2" onClick={() => dispatch(loggedOut())}>
        Sign out
      </Button>
    </div>
  );
}
