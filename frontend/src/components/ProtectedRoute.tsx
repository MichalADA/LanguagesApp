import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";

export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "unauthenticated") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Stan "guest" jest świadomie wybraną sesją lokalną, a nie anonimowym
  // wejściem na chronioną trasę.
  return <Outlet />;
}
