import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";

import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Library from "./pages/Library";
import Slideshows from "./pages/Slideshows";
import NewSlideshow from "./pages/NewSlideshow";
import SlideshowEditor from "./pages/SlideshowEditor";
import Account from "./pages/Account";
import Billing from "./pages/Billing";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import NotFound from "./pages/NotFound";
import NewWorkspace from "./pages/NewWorkspace";
import WorkspaceSettings from "./pages/WorkspaceSettings";
import Workspaces from "./pages/Workspaces";
import ResetPassword from "./pages/ResetPassword";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-right" />
        <BrowserRouter>
          <AuthProvider>
            <WorkspaceProvider>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
                <Route path="/workspaces/new" element={<ProtectedRoute requirePlan><NewWorkspace /></ProtectedRoute>} />

                {/* App shell */}
                <Route element={<ProtectedRoute requirePlan><AppLayout /></ProtectedRoute>}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/library" element={<Library />} />
                  <Route path="/slideshows" element={<Slideshows />} />
                  <Route path="/slideshows/new" element={<ProtectedRoute requirePlan requireWorkspace><NewSlideshow /></ProtectedRoute>} />
                  <Route path="/slideshows/:id/edit" element={<SlideshowEditor />} />
                  <Route path="/account" element={<Account />} />
                  <Route path="/workspaces" element={<Workspaces />} />
                  <Route path="/workspaces/settings" element={<WorkspaceSettings />} />
                </Route>
                {/* Billing must be reachable even without an active plan (post-checkout sync) */}
                <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                  <Route path="/billing" element={<Billing />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </WorkspaceProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
