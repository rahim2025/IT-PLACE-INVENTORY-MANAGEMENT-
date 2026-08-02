import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";
import { selectAuth } from "../../features/auth/authSlice";

export default function AccessGate() {
  const { user } = useSelector(selectAuth);

  if (user?.role === "user") {
    return <Navigate to="/pending" replace />;
  }

  return <Outlet />;
}
