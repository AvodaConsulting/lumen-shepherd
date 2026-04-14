import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusChip } from "@/components/StatusChip";
import { toast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { ArrowLeft, BookOpen, Users, FileText, Church } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Database } from "@/integrations/supabase/types";

type ClassRow = Database["public"]["Tables"]["classes"]["Row"];

const lifecycleTransitions: Record<string, string[]> = {
  draft: ["published"],
  published: ["open", "archived"],
  open: ["closed"],
  closed: ["archived"],
  archived: [],
  cancelled: [],
};

const lifecycleHelp: Record<string, string> = {
  draft: "This class is in Draft status. It is not visible to members. Publish it to make it visible. / 此課程為草稿狀態，會員看不到。發佈後即可顯示。",
  published: "This class is Published and visible in catalogs, but not yet open for enrollment. / 此課程已發佈，可在目錄中看到，但尚未開放報名。",
  open: "This class is Open for enrollment. Members can enroll during the enrollment window. / 此課程已開放報名。會員可在報名期間內報名。",
  closed: "Enrollment is closed. Enrolled members can still access content within the access window. / 報名已截止。已報名會員仍可在存取期間內查看內容。",
  archived: "This class is archived and read-only. / 此課程已歸檔，僅供查閱。",
  cancelled: "This class has been cancelled. / 此課程已取消。",
};

const ClassDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isSuperAdmin, isChurchAdmin, isMember, user, profile } = useAuth();
  const { log } = useAuditLog();
  const [cls, setCls] = useState<ClassRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [churches, setChurches] = useState<{ id: string; english_name: string }[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [selectedChurch, setSelectedChurch] = useState("");

  useEffect(() => {
    if (!id) return;
    const fetchAll = async () => {
      const [clsRes, enrRes, asgRes, matRes] = await Promise.all([
        supabase.from("classes").select("*").eq("id", id).single(),
        supabase.from("enrollments").select("*, profiles!enrollments_member_id_fkey(english_name)").eq("class_id", id).order("created_at", { ascending: false }),
        supabase.from("class_church_assignments").select("*, churches(english_name)").eq("class_id", id),
        supabase.from("materials").select("*").eq("class_id", id).order("sort_order"),
      ]);
      setCls(clsRes.data);
      setEnrollments(enrRes.data || []);
      setAssignments(asgRes.data || []);
      setMaterials(matRes.data || []);
      setLoading(false);
    };
    fetchAll();

    if (isSuperAdmin) {
      supabase.from("churches").select("id, english_name").eq("status", "active").then(({ data }) => setChurches(data || []));
    }
  }, [id, isSuperAdmin]);

  const handleStatusTransition = async (newStatus: string) => {
    if (!id || !cls) return;
    const { error } = await supabase.from("classes").update({ status: newStatus as any }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      await log(`class_${newStatus}`, "class", id);
      toast({ title: `Class status changed to ${newStatus}` });
      setCls({ ...cls, status: newStatus as any });
    }
  };

  const handleAssignChurch = async () => {
    if (!id || !selectedChurch) return;
    const { error } = await supabase.from("class_church_assignments").insert({ class_id: id, church_id: selectedChurch });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Church assigned / 已分配教會" });
      const { data } = await supabase.from("class_church_assignments").select("*, churches(english_name)").eq("class_id", id);
      setAssignments(data || []);
      setSelectedChurch("");
    }
  };

  const handleUnassignChurch = async (assignmentId: string) => {
    const { error } = await supabase.from("class_church_assignments").delete().eq("id", assignmentId);
    if (!error) {
      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
      toast({ title: "Church unassigned / 已取消分配" });
    }
  };

  const handleEnroll = async () => {
    if (!user || !cls || !profile?.church_id) return;
    setEnrolling(true);
    const { error } = await supabase.from("enrollments").insert({
      member_id: user.id,
      class_id: cls.id,
      church_id: profile.church_id,
      status: cls.approval_mode === "auto" ? "approved" : "pending",
    } as any);
    setEnrolling(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      await log("enrollment_requested", "enrollment", cls.id);
      toast({ title: cls.approval_mode === "auto" ? "Enrolled! / 已報名" : "Request Submitted / 申請已提交" });
    }
  };

  const handleEnrollmentAction = async (enrollmentId: string, newStatus: string) => {
    const { error } = await supabase.from("enrollments").update({
      status: newStatus as any,
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
    }).eq("id", enrollmentId);
    if (!error) {
      await log(`enrollment_${newStatus}`, "enrollment", enrollmentId);
      toast({ title: `Enrollment ${newStatus}` });
      setEnrollments((prev) => prev.map((e) => e.id === enrollmentId ? { ...e, status: newStatus } : e));
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!cls) return <div className="text-center py-12"><h2 className="text-xl font-semibold">Class not found / 找不到課程</h2><Button className="mt-4" onClick={() => navigate("/classes")}>Back</Button></div>;

  const allowedTransitions = lifecycleTransitions[cls.status] || [];
  const assignedChurchIds = assignments.map((a) => a.church_id);
  const availableChurches = churches.filter((c) => !assignedChurchIds.includes(c.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/classes")}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{cls.english_title}</h1>
          {cls.chinese_title_traditional && <p className="text-muted-foreground font-chinese">{cls.chinese_title_traditional}</p>}
        </div>
        <StatusChip status={cls.status} showChinese />
        <Badge variant="secondary">{cls.owner_type}</Badge>
      </div>

      {/* Lifecycle helper */}
      <div className="bg-muted/50 border border-border rounded-lg p-3 text-sm text-muted-foreground">
        {lifecycleHelp[cls.status]}
      </div>

      {/* Status transitions */}
      {(isSuperAdmin || isChurchAdmin) && allowedTransitions.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Transition to:</span>
          {allowedTransitions.map((t) => (
            <Button key={t} size="sm" variant="outline" onClick={() => handleStatusTransition(t)}>
              → {t}
            </Button>
          ))}
        </div>
      )}

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info"><BookOpen className="h-3.5 w-3.5 mr-1" /> Info</TabsTrigger>
          {(isSuperAdmin) && <TabsTrigger value="assignments"><Church className="h-3.5 w-3.5 mr-1" /> Assignments</TabsTrigger>}
          {(isSuperAdmin || isChurchAdmin) && <TabsTrigger value="enrollments"><Users className="h-3.5 w-3.5 mr-1" /> Enrollments ({enrollments.length})</TabsTrigger>}
          <TabsTrigger value="materials"><FileText className="h-3.5 w-3.5 mr-1" /> Materials ({materials.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                <DetailField label="Owner Type / 擁有者" value={cls.owner_type} />
                <DetailField label="Approval Mode / 審批模式" value={cls.approval_mode === "auto" ? "Auto Approve / 自動批准" : "Manual Review / 人工審核"} />
                <DetailField label="Enrollment Period / 報名期間" value={cls.enrollment_start && cls.enrollment_end ? `${cls.enrollment_start} → ${cls.enrollment_end}` : "Not set / 未設定"} />
                <DetailField label="Access Period / 存取期間" value={cls.access_start && cls.access_end ? `${cls.access_start} → ${cls.access_end}` : "Not set / 未設定"} />
                <DetailField label="Age Range / 年齡範圍" value={cls.min_age || cls.max_age ? `${cls.min_age || "—"} to ${cls.max_age || "—"}` : "Any / 不限"} />
                <DetailField label="Gender / 性別要求" value={cls.gender_requirement || "Any / 不限"} />
                <DetailField label="Max Enrollment / 名額上限" value={cls.max_enrollment?.toString() || "Unlimited / 無限"} />
                <DetailField label="Prerequisites / 先修條件" value={cls.prerequisites || "None / 無"} />
              </div>
              {cls.english_description && (
                <div className="mt-6 border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Description / 描述</p>
                  <p className="text-sm">{cls.english_description}</p>
                  {cls.chinese_description_traditional && <p className="text-sm mt-2 font-chinese text-muted-foreground">{cls.chinese_description_traditional}</p>}
                </div>
              )}
              {isMember && (cls.status === "open") && (
                <div className="mt-6 border-t border-border pt-4">
                  {cls.approval_mode === "manual" && (
                    <p className="text-sm text-muted-foreground mb-2">This class requires manual approval. Your enrollment will be reviewed by a church administrator. / 此課程需要人工審核。您的報名將由教會管理員審核。</p>
                  )}
                  <Button onClick={handleEnroll} disabled={enrolling}>
                    {enrolling ? "Submitting..." : "Enroll / 報名"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {isSuperAdmin && (
          <TabsContent value="assignments">
            <Card>
              <CardHeader><CardTitle className="text-base">Church Assignments / 教會分配</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {assignments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No churches assigned yet. / 尚未分配給任何教會。</p>
                ) : (
                  <div className="space-y-2">
                    {assignments.map((a) => (
                      <div key={a.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <span className="font-medium">{a.churches?.english_name || "Unknown"}</span>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleUnassignChurch(a.id)}>Remove</Button>
                      </div>
                    ))}
                  </div>
                )}
                {availableChurches.length > 0 && (
                  <div className="flex gap-2">
                    <Select value={selectedChurch} onValueChange={setSelectedChurch}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Select church..." /></SelectTrigger>
                      <SelectContent>{availableChurches.map((c) => <SelectItem key={c.id} value={c.id}>{c.english_name}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button onClick={handleAssignChurch} disabled={!selectedChurch}>Assign</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {(isSuperAdmin || isChurchAdmin) && (
          <TabsContent value="enrollments">
            <Card>
              <CardHeader><CardTitle className="text-base">Enrollments / 報名列表</CardTitle></CardHeader>
              <CardContent>
                {enrollments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No enrollments yet. / 暫無報名。</p>
                ) : (
                  <div className="space-y-2">
                    {enrollments.map((e) => (
                      <div key={e.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <span className="text-sm font-medium">{e.profiles?.english_name || "Unknown"}</span>
                        <div className="flex items-center gap-2">
                          <StatusChip status={e.status} />
                          {e.status === "pending" && (
                            <>
                              <Button size="sm" variant="outline" className="text-success border-success/30 h-7" onClick={() => handleEnrollmentAction(e.id, "approved")}>Approve</Button>
                              <Button size="sm" variant="outline" className="text-destructive border-destructive/30 h-7" onClick={() => handleEnrollmentAction(e.id, "rejected")}>Reject</Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="materials">
          <Card>
            <CardHeader><CardTitle className="text-base">Materials / 教材</CardTitle></CardHeader>
            <CardContent>
              {materials.length === 0 ? (
                <p className="text-sm text-muted-foreground">No materials added yet. / 尚未新增任何教材。</p>
              ) : (
                <div className="space-y-2">
                  {materials.map((m) => (
                    <div key={m.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div>
                        <span className="text-sm font-medium">{m.english_title}</span>
                        {m.chinese_title_traditional && <span className="text-xs text-muted-foreground font-chinese ml-2">{m.chinese_title_traditional}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{m.type}</Badge>
                        <StatusChip status={m.is_published ? "active" : "draft"} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const DetailField = ({ label, value }: { label: string; value?: string | null }) => (
  <div><p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p><p className="font-medium mt-0.5">{value || "—"}</p></div>
);

export default ClassDetail;
