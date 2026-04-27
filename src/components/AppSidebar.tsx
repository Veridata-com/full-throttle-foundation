import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Image, Film, CreditCard, User, LogOut, LayoutDashboard, Layers, Megaphone, BarChart2, Palette } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar, SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { WorkspaceSwitcher } from "@/components/WorkspaceSwitcher";
import { UsageWidgetCompact } from "@/components/UsageWidget";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { supabase } from "@/integrations/supabase/client";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Library", url: "/library", icon: Image },
  { title: "Slideshows", url: "/slideshows", icon: Film },
  { title: "Brand", url: "/brand", icon: Palette },
  { title: "Analytics", url: "/analytics", icon: BarChart2 },
  { title: "Workspaces", url: "/workspaces", icon: Layers },
  { title: "Release notes", url: "/release-notes", icon: Megaphone },
  { title: "Account", url: "/account", icon: User },
  { title: "Billing", url: "/billing", icon: CreditCard },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const [brandColor, setBrandColor] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("brand_identity").select("primary_color").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setBrandColor((data as any)?.primary_color || null));
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-2">
        <WorkspaceSwitcher />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = location.pathname.startsWith(item.url);
                const isBrand = item.url === "/brand";
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active}>
                      <NavLink to={item.url}>
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span className="flex-1">{item.title}</span>}
                        {!collapsed && isBrand && brandColor && (
                          <span
                            className="h-2.5 w-2.5 rounded-full ring-1 ring-sidebar-border"
                            style={{ background: brandColor }}
                            title="Your brand color"
                          />
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-0">
        {!collapsed && <UsageWidgetCompact />}
        <div className="p-2 space-y-1">
          {!collapsed && (
            <FeedbackDialog
              variant="ghost"
              size="sm"
              className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
            />
          )}
          <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-2">Sign out</span>}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
