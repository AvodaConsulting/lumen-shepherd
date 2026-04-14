import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Church, Users, BookOpen, GraduationCap, Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const { profile, roles, isSuperAdmin, isChurchAdmin, isMember } = useAuth();
  const [stats, setStats] = useState({ churches: 0, members: 0, classes: 0, enrollments: 0, announcements: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const [churches, members, classes, enrollments, announcements] = await Promise.all([
        supabase.from("churches").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("classes").select("id", { count: "exact", head: true }),
        supabase.from("enrollments").select("id", { count: "exact", head: true }),
        supabase.from("announcements").select("id", { count: "exact", head: true }),
      ]);
      setStats({
        churches: churches.count || 0,
        members: members.count || 0,
        classes: classes.count || 0,
        enrollments: enrollments.count || 0,
        announcements: announcements.count || 0,
      });
    };
    fetchStats();
  }, []);

  const statCards = [
    ...(isSuperAdmin ? [{ label: "Churches", labelCn: "教會", value: stats.churches, icon: Church, color: "text-primary" }] : []),
    { label: "Members", labelCn: "會員", value: stats.members, icon: Users, color: "text-success" },
    { label: "Classes", labelCn: "課程", value: stats.classes, icon: BookOpen, color: "text-warning" },
    { label: "Enrollments", labelCn: "報名", value: stats.enrollments, icon: GraduationCap, color: "text-chart-4" },
    { label: "Announcements", labelCn: "公告", value: stats.announcements, icon: Bell, color: "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Welcome, {profile?.english_name}
          {profile?.chinese_name_traditional && (
            <span className="ml-2 text-muted-foreground font-chinese text-xl">
              {profile.chinese_name_traditional}
            </span>
          )}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isSuperAdmin && "Super Admin Dashboard / 超級管理員控制台"}
          {isChurchAdmin && "Church Admin Dashboard / 教會管理員控制台"}
          {isMember && "Member Dashboard / 會員控制台"}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
                <span className="block text-xs font-chinese opacity-70">{card.labelCn}</span>
              </CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
