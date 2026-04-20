import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Loader2 } from "lucide-react";

interface Props {
  children: React.ReactNode;
  requirePlan?: boolean;
  requireWorkspace?: boolean;
}

export function ProtectedRoute({ children, requirePlan = false, requireWorkspace = false }: Props) {
  const { user, profile, loading } = useAuth();
  const { workspaces, loading: wsLoading } = useWorkspace();
  const location = useLocation();

  if (loading || wsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />;
  if (requirePlan && profile && profile.plan === "none") return <Navigate to="/onboarding" replace />;
  if (requireWorkspace && workspaces.length === 0) return <Navigate to="/workspaces/new" replace />;

  return <>{children}</>;
}
