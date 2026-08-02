import { useSelector } from "react-redux";
import { useGetMeQuery } from "../../app/apiSlice";
import { selectAuth } from "../../features/auth/authSlice";
import FullPageLoader from "./FullPageLoader";

// Resolves the "is this token still good?" question once, on load, before any
// route renders — so a stale or expired token doesn't flash a logged-in shell
// before bouncing to /login.
export default function AuthGate({ children }) {
  const { token, user } = useSelector(selectAuth);
  const { isLoading } = useGetMeQuery(undefined, { skip: !token });

  if (token && !user && isLoading) {
    return <FullPageLoader />;
  }

  return children;
}
