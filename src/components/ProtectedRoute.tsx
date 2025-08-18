import { Navigate, useLocation } from "react-router-dom";
import { getTokens } from "@/lib/api";

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const location = useLocation();
  const authed = !!getTokens()?.access;
  if (!authed) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}
