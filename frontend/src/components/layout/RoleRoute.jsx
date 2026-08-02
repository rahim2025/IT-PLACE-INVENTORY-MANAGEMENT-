import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";
import { selectAuth } from "../../features/auth/authSlice";

export default function RoleRoute({ roles }) {
  const { user } = useSelector(selectAuth);

  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
