import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, roles, loading, profile } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (profile?.status === "disabled" || profile?.status === "inactive") {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold mb-2">Account Inactive</h2>
          <p className="text-muted-foreground">Your account has been deactivated. Please contact your church administrator.</p>
          <p className="text-muted-foreground mt-1 font-chinese">您的帳戶已停用，請聯絡教會管理員。</p>
        </div>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.some((r) => roles.includes(r as any))) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
