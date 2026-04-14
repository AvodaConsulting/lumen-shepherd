import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Church, Users, BookOpen, GraduationCap, Bell, ScrollText,
  LayoutDashboard, LogOut, Settings, ChevronLeft, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface NavItem {
  label: string;
  labelCn?: string;
  icon: React.ElementType;
  path: string;
  roles: string[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", labelCn: "控制台", icon: LayoutDashboard, path: "/dashboard", roles: ["super_admin", "church_admin", "member"] },
  { label: "Churches", labelCn: "教會", icon: Church, path: "/churches", roles: ["super_admin"] },
  { label: "Members", labelCn: "會員", icon: Users, path: "/members", roles: ["super_admin", "church_admin"] },
  { label: "Classes", labelCn: "課程", icon: BookOpen, path: "/classes", roles: ["super_admin", "church_admin", "member"] },
  { label: "Enrollments", labelCn: "報名", icon: GraduationCap, path: "/enrollments", roles: ["super_admin", "church_admin", "member"] },
  { label: "Announcements", labelCn: "公告", icon: Bell, path: "/announcements", roles: ["super_admin", "church_admin", "member"] },
  { label: "Audit Logs", labelCn: "審計日誌", icon: ScrollText, path: "/audit-logs", roles: ["super_admin", "church_admin"] },
];

export const AppSidebar = () => {
  const { profile, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const userRoles = roles as string[];
  const filteredNav = navItems.filter((item) =>
    item.roles.some((r) => userRoles.includes(r))
  );

  return (
    <aside
      className={cn(
        "flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 h-screen sticky top-0",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold truncate text-sidebar-primary-foreground">
              主日學平台
            </h1>
            <p className="text-xs text-sidebar-foreground/60 truncate">
              Sunday School Platform
            </p>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="text-sidebar-foreground hover:bg-sidebar-accent shrink-0 h-8 w-8"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
        {filteredNav.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm transition-colors",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && (
                <div className="flex flex-col items-start min-w-0">
                  <span className="truncate">{item.label}</span>
                  {item.labelCn && (
                    <span className="text-[10px] opacity-60 truncate font-chinese">
                      {item.labelCn}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3">
        {!collapsed && profile && (
          <div className="mb-2 px-1">
            <p className="text-xs font-medium truncate text-sidebar-foreground">
              {profile.english_name}
            </p>
            {profile.chinese_name_traditional && (
              <p className="text-[10px] opacity-60 truncate font-chinese">
                {profile.chinese_name_traditional}
              </p>
            )}
            <p className="text-[10px] text-sidebar-foreground/50 truncate">
              {userRoles.join(", ")}
            </p>
          </div>
        )}
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "sm"}
          onClick={signOut}
          className="w-full text-sidebar-foreground hover:bg-sidebar-accent justify-start gap-2"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Sign Out</span>}
        </Button>
      </div>
    </aside>
  );
};
