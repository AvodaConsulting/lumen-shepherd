import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Church, Users, BookOpen, GraduationCap, Bell, ScrollText } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StatusChip } from "@/components/StatusChip";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface AuditEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
}

const Dashboard = () => {
  const { profile, isSuperAdmin, isChurchAdmin, isMember, user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ churches: 0, members: 0, classes: 0, enrollments: 0, announcements: 0 });
  const [classByStatus, setClassByStatus] = useState<Record<string, number>>({});
  const [enrollByStatus, setEnrollByStatus] = useState<Record<string, number>>({});
  const [recentLogs, setRecentLogs] = useState<AuditEntry[]>([]);
  const [memberEnrollments, setMemberEnrollments] = useState<any[]>([]);
  const [recentAnnouncements, setRecentAnnouncements] = useState<any[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      const [churches, members, classes, enrollments, announcements] = await Promise.all([
        supabase.from("churches").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("classes").select("id", { count: "exact", head: true }),
        supabase.from("enrollments").select("id", { count: "exact", head: true }),
        supabase.from("announcements").select("id", { count: "exact", head: true }).eq("is_published", true),
      ]);
      setStats({
        churches: churches.count || 0,
        members: members.count || 0,
        classes: classes.count || 0,
        enrollments: enrollments.count || 0,
        announcements: announcements.count || 0,
      });

      // Class breakdown
      const { data: classData } = await supabase.from("classes").select("status");
      if (classData) {
        const counts: Record<string, number> = {};
        classData.forEach((c) => { counts[c.status] = (counts[c.status] || 0) + 1; });
        setClassByStatus(counts);
      }

      // Enrollment breakdown
      const { data: enrollData } = await supabase.from("enrollments").select("status");
      if (enrollData) {
        const counts: Record<string, number> = {};
        enrollData.forEach((e) => { counts[e.status] = (counts[e.status] || 0) + 1; });
        setEnrollByStatus(counts);
      }

      // Audit logs for admins
      if (isSuperAdmin || isChurchAdmin) {
        const { data: logs } = await supabase.from("audit_logs").select("id, action, entity_type, entity_id, created_at").order("created_at", { ascending: false }).limit(8);
        setRecentLogs((logs as AuditEntry[]) || []);
      }

      // Member-specific: my enrollments
      if (isMember && user) {
        const { data: myEnr } = await supabase.from("enrollments")
          .select("*, classes(english_title, chinese_title_traditional, access_start, access_end)")
          .eq("member_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5);
        setMemberEnrollments(myEnr || []);
      }

      // Recent announcements for all
      const { data: annData } = await supabase.from("announcements").select("id, english_title, chinese_title_traditional, published_at").eq("is_published", true).order("published_at", { ascending: false }).limit(3);
      setRecentAnnouncements(annData || []);
    };
    fetchAll();
  }, [isSuperAdmin, isChurchAdmin, isMember, user]);

  // Role-specific stat cards
  const statCards = isSuperAdmin ? [
    { label: "Churches", labelCn: "教會", value: stats.churches, icon: Church, color: "text-primary" },
    { label: "Members", labelCn: "會員", value: stats.members, icon: Users, color: "text-success" },
    { label: "Classes", labelCn: "課程", value: stats.classes, icon: BookOpen, color: "text-warning" },
    { label: "Enrollments", labelCn: "報名", value: stats.enrollments, icon: GraduationCap, color: "text-chart-4" },
    { label: "Announcements", labelCn: "公告", value: stats.announcements, icon: Bell, color: "text-destructive" },
  ] : isChurchAdmin ? [
    { label: "Members", labelCn: "會員", value: stats.members, icon: Users, color: "text-success" },
    { label: "Classes", labelCn: "課程", value: stats.classes, icon: BookOpen, color: "text-warning" },
    { label: "Enrollments", labelCn: "報名", value: stats.enrollments, icon: GraduationCap, color: "text-chart-4" },
    { label: "Announcements", labelCn: "公告", value: stats.announcements, icon: Bell, color: "text-destructive" },
  ] : [
    { label: "My Enrollments", labelCn: "我的報名", value: stats.enrollments, icon: GraduationCap, color: "text-primary" },
    { label: "Available Classes", labelCn: "可用課程", value: stats.classes, icon: BookOpen, color: "text-success" },
    { label: "Announcements", labelCn: "公告", value: stats.announcements, icon: Bell, color: "text-warning" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {isMember ? `Hello, ${profile?.english_name}! 你好！` : `Welcome, ${profile?.english_name}`}
          {profile?.chinese_name_traditional && !isMember && (
            <span className="ml-2 text-muted-foreground font-chinese text-xl">{profile.chinese_name_traditional}</span>
          )}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isSuperAdmin && "Super Admin Dashboard / 超級管理員控制台"}
          {isChurchAdmin && "Church Admin Dashboard / 教會管理員控制台"}
          {isMember && "Your personal learning hub / 您的學習中心"}
        </p>
      </div>

      {/* Stat cards */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${isSuperAdmin ? 'lg:grid-cols-5' : isChurchAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
        {statCards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
                <span className="block text-xs font-chinese opacity-70">{card.labelCn}</span>
              </CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent><div className="text-3xl font-bold">{card.value}</div></CardContent>
          </Card>
        ))}
      </div>

      {/* Admin: status breakdowns */}
      {(isSuperAdmin || isChurchAdmin) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Classes by Status / 課程狀態</CardTitle></CardHeader>
            <CardContent>
              {Object.keys(classByStatus).length === 0 ? (
                <p className="text-sm text-muted-foreground">No classes yet / 暫無課程</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(classByStatus).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <StatusChip status={status} showChinese />
                      <span className="font-semibold">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Enrollments by Status / 報名狀態</CardTitle></CardHeader>
            <CardContent>
              {Object.keys(enrollByStatus).length === 0 ? (
                <p className="text-sm text-muted-foreground">No enrollments yet / 暫無報名</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(enrollByStatus).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <StatusChip status={status} showChinese />
                      <span className="font-semibold">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Member: my enrollments */}
      {isMember && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>My Enrollments / 我的報名</span>
              <Button variant="link" size="sm" onClick={() => navigate("/enrollments")}>View All</Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {memberEnrollments.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">You haven't enrolled in any classes yet.</p>
                <p className="text-xs text-muted-foreground font-chinese">您尚未報名任何課程。</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/classes")}>Browse Classes / 瀏覽課程</Button>
              </div>
            ) : (
              <div className="space-y-2">
                {memberEnrollments.map((e) => (
                  <div key={e.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">{e.classes?.english_title}</p>
                      {e.classes?.chinese_title_traditional && <p className="text-xs text-muted-foreground font-chinese">{e.classes.chinese_title_traditional}</p>}
                    </div>
                    <StatusChip status={e.status} showChinese />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent announcements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span><Bell className="h-4 w-4 inline mr-1" /> Recent Announcements / 最新公告</span>
            <Button variant="link" size="sm" onClick={() => navigate("/announcements")}>View All</Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentAnnouncements.length === 0 ? (
            <p className="text-sm text-muted-foreground">No announcements at this time. / 目前沒有公告。</p>
          ) : (
            <div className="space-y-2">
              {recentAnnouncements.map((a) => (
                <div key={a.id} className="py-2 border-b border-border last:border-0">
                  <p className="text-sm font-medium">{a.english_title}</p>
                  {a.chinese_title_traditional && <p className="text-xs text-muted-foreground font-chinese">{a.chinese_title_traditional}</p>}
                  {a.published_at && <p className="text-xs text-muted-foreground mt-0.5">{new Date(a.published_at).toLocaleDateString()}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin: recent audit logs */}
      {(isSuperAdmin || isChurchAdmin) && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><ScrollText className="h-4 w-4" /> Recent Activity / 最近活動</CardTitle></CardHeader>
          <CardContent>
            {recentLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity recorded yet / 暫無活動記錄</p>
            ) : (
              <div className="space-y-2">
                {recentLogs.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between text-sm py-1 border-b border-border last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{entry.action}</span>
                      <span className="text-muted-foreground">— {entry.entity_type}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(entry.created_at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
