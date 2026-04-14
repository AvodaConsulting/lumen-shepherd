import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusChip } from "@/components/StatusChip";
import { toast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { ArrowLeft, BookOpen, Users, FileText, Church, Edit2, Save, X, UserPlus, Layers } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Database } from "@/integrations/supabase/types";
import LessonsManager from "./LessonsManager";

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
  const [lessons, setLessons] = useState<any[]>([]);
  const [selectedChurch, setSelectedChurch] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<ClassRow>>({});

  // Admin enroll member state
  const [churchMembers, setChurchMembers] = useState<any[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [adminEnrolling, setAdminEnrolling] = useState(false);

  // User's own enrollment
  const [myEnrollment, setMyEnrollment] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    const fetchAll = async () => {
      const [clsRes, enrRes, asgRes, matRes, lesRes] = await Promise.all([
        supabase.from("classes").select("*").eq("id", id).single(),
        supabase.from("enrollments").select("*, profiles!enrollments_member_id_fkey(english_name, chinese_name_traditional)").eq("class_id", id).order("created_at", { ascending: false }),
        supabase.from("class_church_assignments").select("*, churches(english_name)").eq("class_id", id),
        supabase.from("materials").select("*").eq("class_id", id).order("sort_order"),
        supabase.from("lessons").select("*").eq("class_id", id).order("sort_order"),
      ]);
      setCls(clsRes.data);
      setForm(clsRes.data || {});
      setEnrollments(enrRes.data || []);
      setAssignments(asgRes.data || []);
      setMaterials(matRes.data || []);
      setLessons(lesRes.data || []);

      // Check user's own enrollment
      if (user) {
        const mine = (enrRes.data || []).find((e: any) => e.member_id === user.id);
        setMyEnrollment(mine || null);
      }

      setLoading(false);
    };
    fetchAll();

    if (isSuperAdmin) {
      supabase.from("churches").select("id, english_name").eq("status", "active").then(({ data }) => setChurches(data || []));
    }
  }, [id, isSuperAdmin, user]);

  // Load church members when admin wants to enroll someone
  const loadChurchMembers = async () => {
    if (!id) return;
    const churchId = isChurchAdmin ? profile?.church_id : null;
    let query = supabase.from("profiles").select("id, user_id, english_name, chinese_name_traditional, church_id").eq("status", "active");
    if (churchId && !isSuperAdmin) {
      query = query.eq("church_id", churchId);
    }
    const { data } = await query.order("english_name");
    // Filter out already-enrolled members
    const enrolledMemberIds = new Set(enrollments.map((e) => e.member_id));
    setChurchMembers((data || []).filter((m) => !enrolledMemberIds.has(m.user_id)));
  };

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
    // Duplicate check
    if (myEnrollment) {
      toast({ title: "Already enrolled / 已報名", description: "You are already enrolled in this class.", variant: "destructive" });
      return;
    }
    // Max enrollment check
    const approvedCount = enrollments.filter((e) => e.status === "approved" || e.status === "completed").length;
    if (cls.max_enrollment && approvedCount >= cls.max_enrollment) {
      toast({ title: "Class Full / 名額已滿", description: "This class has reached its maximum enrollment.", variant: "destructive" });
      return;
    }
    setEnrolling(true);
    const newStatus = cls.approval_mode === "auto" ? "approved" : "pending";
    const { data, error } = await supabase.from("enrollments").insert({
      member_id: user.id,
      class_id: cls.id,
      church_id: profile.church_id,
      status: newStatus,
    } as any).select("*, profiles!enrollments_member_id_fkey(english_name, chinese_name_traditional)").single();
    setEnrolling(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      await log("enrollment_requested", "enrollment", cls.id);
      toast({ title: cls.approval_mode === "auto" ? "Enrolled! / 已報名" : "Request Submitted / 申請已提交" });
      setEnrollments((prev) => [data, ...prev]);
      setMyEnrollment(data);
    }
  };

  const handleAdminEnrollMember = async () => {
    if (!id || !cls || !selectedMemberId) return;
    const member = churchMembers.find((m) => m.user_id === selectedMemberId);
    if (!member) return;
    // Max enrollment check
    const approvedCount = enrollments.filter((e) => e.status === "approved" || e.status === "completed").length;
    if (cls.max_enrollment && approvedCount >= cls.max_enrollment) {
      toast({ title: "Class Full / 名額已滿", description: "This class has reached its maximum enrollment.", variant: "destructive" });
      return;
    }
    setAdminEnrolling(true);
    const { data, error } = await supabase.from("enrollments").insert({
      member_id: member.user_id,
      class_id: cls.id,
      church_id: member.church_id,
      status: "approved",
    } as any).select("*, profiles!enrollments_member_id_fkey(english_name, chinese_name_traditional)").single();
    setAdminEnrolling(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      await log("enrollment_admin_created", "enrollment", data.id, { member_name: member.english_name });
      toast({ title: `Enrolled ${member.english_name} / 已報名 ${member.english_name}` });
      setEnrollments((prev) => [data, ...prev]);
      setChurchMembers((prev) => prev.filter((m) => m.user_id !== selectedMemberId));
      setSelectedMemberId("");
      setEnrollDialogOpen(false);
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

  const handleWithdraw = async () => {
    if (!myEnrollment) return;
    const { error } = await supabase.from("enrollments").update({ status: "withdrawn" as any }).eq("id", myEnrollment.id);
    if (!error) {
      await log("enrollment_withdrawn", "enrollment", myEnrollment.id);
      toast({ title: "Enrollment withdrawn / 已退出報名" });
      setMyEnrollment({ ...myEnrollment, status: "withdrawn" });
      setEnrollments((prev) => prev.map((e) => e.id === myEnrollment.id ? { ...e, status: "withdrawn" } : e));
    }
  };

  // Edit class
  const handleChange = (field: string, value: any) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSaveClass = async () => {
    if (!id || !cls) return;
    setSaving(true);
    const { error } = await supabase.from("classes").update({
      english_title: form.english_title,
      chinese_title_traditional: form.chinese_title_traditional || null,
      english_description: form.english_description || null,
      chinese_description_traditional: form.chinese_description_traditional || null,
      approval_mode: form.approval_mode as any,
      enrollment_start: form.enrollment_start || null,
      enrollment_end: form.enrollment_end || null,
      access_start: form.access_start || null,
      access_end: form.access_end || null,
      min_age: form.min_age ?? null,
      max_age: form.max_age ?? null,
      gender_requirement: form.gender_requirement || null,
      prerequisites: form.prerequisites || null,
      max_enrollment: form.max_enrollment ?? null,
      retake_policy: form.retake_policy || null,
    }).eq("id", id);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      await log("class_updated", "class", id);
      toast({ title: "Class Updated / 課程已更新" });
      setCls({ ...cls, ...form } as ClassRow);
      setEditing(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!cls) return <div className="text-center py-12"><h2 className="text-xl font-semibold">Class not found / 找不到課程</h2><Button className="mt-4" onClick={() => navigate("/classes")}>Back</Button></div>;

  const allowedTransitions = lifecycleTransitions[cls.status] || [];
  const assignedChurchIds = assignments.map((a) => a.church_id);
  const availableChurches = churches.filter((c) => !assignedChurchIds.includes(c.id));
  const approvedCount = enrollments.filter((e) => e.status === "approved" || e.status === "completed").length;
  const canEnroll = isMember && cls.status === "open" && !myEnrollment;
  const canWithdraw = isMember && myEnrollment && (myEnrollment.status === "pending" || myEnrollment.status === "approved");

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
        {(isSuperAdmin || isChurchAdmin) && !editing && cls.status !== "archived" && cls.status !== "cancelled" && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Edit2 className="h-4 w-4 mr-1" /> Edit</Button>
        )}
      </div>

      {/* Lifecycle helper */}
      <div className="bg-muted/50 border border-border rounded-lg p-3 text-sm text-muted-foreground">
        {lifecycleHelp[cls.status]}
        {cls.max_enrollment && (
          <span className="ml-2 font-medium">Enrolled: {approvedCount}/{cls.max_enrollment}</span>
        )}
      </div>

      {/* Status transitions */}
      {(isSuperAdmin || isChurchAdmin) && allowedTransitions.length > 0 && !editing && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Transition to:</span>
          {allowedTransitions.map((t) => (
            <AlertDialog key={t}>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline">→ {t}</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Change status to "{t}"? / 將狀態變更為「{t}」？</AlertDialogTitle>
                  <AlertDialogDescription>This action will change the class lifecycle status. Some transitions cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel / 取消</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleStatusTransition(t)}>Confirm / 確認</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ))}
          {cls.status === "draft" && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" className="text-destructive border-destructive/30">Cancel Class / 取消課程</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel this class? / 取消此課程？</AlertDialogTitle>
                  <AlertDialogDescription>This will permanently cancel the class. This cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>No / 否</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleStatusTransition("cancelled")} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Cancel Class / 取消課程</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      )}

      {/* Member enrollment status */}
      {isMember && myEnrollment && (
        <div className="bg-muted/50 border border-border rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">Your enrollment status / 您的報名狀態:</span>
            <StatusChip status={myEnrollment.status} showChinese />
          </div>
          {canWithdraw && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" className="text-destructive border-destructive/30">Withdraw / 退出</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Withdraw enrollment? / 退出報名？</AlertDialogTitle>
                  <AlertDialogDescription>You can re-enroll later if spots are available.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel / 取消</AlertDialogCancel>
                  <AlertDialogAction onClick={handleWithdraw}>Withdraw / 退出</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      )}

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info"><BookOpen className="h-3.5 w-3.5 mr-1" /> Info</TabsTrigger>
          <TabsTrigger value="structure"><Layers className="h-3.5 w-3.5 mr-1" /> Structure ({lessons.length} lessons)</TabsTrigger>
          {isSuperAdmin && <TabsTrigger value="assignments"><Church className="h-3.5 w-3.5 mr-1" /> Assignments</TabsTrigger>}
          {(isSuperAdmin || isChurchAdmin) && <TabsTrigger value="enrollments"><Users className="h-3.5 w-3.5 mr-1" /> Enrollments ({enrollments.length})</TabsTrigger>}
          <TabsTrigger value="materials"><FileText className="h-3.5 w-3.5 mr-1" /> Materials ({materials.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardContent className="pt-6">
              {editing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>English Title * / 英文標題</Label><Input value={form.english_title || ""} onChange={(e) => handleChange("english_title", e.target.value)} /></div>
                    <div className="space-y-2"><Label>中文標題（繁體）</Label><Input value={form.chinese_title_traditional || ""} onChange={(e) => handleChange("chinese_title_traditional", e.target.value)} /></div>
                  </div>
                  <div className="space-y-2"><Label>English Description / 英文描述</Label><Textarea value={form.english_description || ""} onChange={(e) => handleChange("english_description", e.target.value)} rows={3} /></div>
                  <div className="space-y-2"><Label>中文描述（繁體）</Label><Textarea value={form.chinese_description_traditional || ""} onChange={(e) => handleChange("chinese_description_traditional", e.target.value)} rows={3} /></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Approval Mode / 審批模式</Label>
                      <Select value={form.approval_mode || "manual"} onValueChange={(v) => handleChange("approval_mode", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">Auto Approve / 自動批准</SelectItem>
                          <SelectItem value="manual">Manual Review / 人工審核</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label>Max Enrollment / 名額上限</Label><Input type="number" value={form.max_enrollment ?? ""} onChange={(e) => handleChange("max_enrollment", e.target.value ? parseInt(e.target.value) : null)} placeholder="Unlimited" /></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Enrollment Start / 報名開始</Label><Input type="date" value={form.enrollment_start || ""} onChange={(e) => handleChange("enrollment_start", e.target.value)} /></div>
                    <div className="space-y-2"><Label>Enrollment End / 報名結束</Label><Input type="date" value={form.enrollment_end || ""} onChange={(e) => handleChange("enrollment_end", e.target.value)} /></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Access Start / 存取開始</Label><Input type="date" value={form.access_start || ""} onChange={(e) => handleChange("access_start", e.target.value)} /></div>
                    <div className="space-y-2"><Label>Access End / 存取結束</Label><Input type="date" value={form.access_end || ""} onChange={(e) => handleChange("access_end", e.target.value)} /></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2"><Label>Min Age / 最低年齡</Label><Input type="number" value={form.min_age ?? ""} onChange={(e) => handleChange("min_age", e.target.value ? parseInt(e.target.value) : null)} /></div>
                    <div className="space-y-2"><Label>Max Age / 最高年齡</Label><Input type="number" value={form.max_age ?? ""} onChange={(e) => handleChange("max_age", e.target.value ? parseInt(e.target.value) : null)} /></div>
                    <div className="space-y-2">
                      <Label>Gender Req. / 性別要求</Label>
                      <Select value={form.gender_requirement || "any"} onValueChange={(v) => handleChange("gender_requirement", v === "any" ? null : v)}>
                        <SelectTrigger><SelectValue placeholder="Any / 不限" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any / 不限</SelectItem>
                          <SelectItem value="male">Male only / 僅限男性</SelectItem>
                          <SelectItem value="female">Female only / 僅限女性</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2"><Label>Prerequisites / 先修條件</Label><Input value={form.prerequisites || ""} onChange={(e) => handleChange("prerequisites", e.target.value)} /></div>
                  <div className="flex gap-3 pt-4">
                    <Button onClick={handleSaveClass} disabled={saving}><Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save / 儲存"}</Button>
                    <Button variant="outline" onClick={() => { setEditing(false); setForm(cls); }}><X className="h-4 w-4 mr-1" /> Cancel / 取消</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                    <DetailField label="Owner Type / 擁有者" value={cls.owner_type} />
                    <DetailField label="Approval Mode / 審批模式" value={cls.approval_mode === "auto" ? "Auto Approve / 自動批准" : "Manual Review / 人工審核"} />
                    <DetailField label="Enrollment Period / 報名期間" value={cls.enrollment_start && cls.enrollment_end ? `${cls.enrollment_start} → ${cls.enrollment_end}` : "Not set / 未設定"} />
                    <DetailField label="Access Period / 存取期間" value={cls.access_start && cls.access_end ? `${cls.access_start} → ${cls.access_end}` : "Not set / 未設定"} />
                    <DetailField label="Age Range / 年齡範圍" value={cls.min_age || cls.max_age ? `${cls.min_age || "—"} to ${cls.max_age || "—"}` : "Any / 不限"} />
                    <DetailField label="Gender / 性別要求" value={cls.gender_requirement || "Any / 不限"} />
                    <DetailField label="Max Enrollment / 名額上限" value={cls.max_enrollment ? `${approvedCount} / ${cls.max_enrollment}` : "Unlimited / 無限"} />
                    <DetailField label="Prerequisites / 先修條件" value={cls.prerequisites || "None / 無"} />
                  </div>
                  {cls.english_description && (
                    <div className="mt-6 border-t border-border pt-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Description / 描述</p>
                      <p className="text-sm">{cls.english_description}</p>
                      {cls.chinese_description_traditional && <p className="text-sm mt-2 font-chinese text-muted-foreground">{cls.chinese_description_traditional}</p>}
                    </div>
                  )}
                  {canEnroll && (
                    <div className="mt-6 border-t border-border pt-4">
                      {cls.approval_mode === "manual" && (
                        <p className="text-sm text-muted-foreground mb-2">This class requires manual approval. Your enrollment will be reviewed by a church administrator. / 此課程需要人工審核。您的報名將由教會管理員審核。</p>
                      )}
                      <Button onClick={handleEnroll} disabled={enrolling}>
                        {enrolling ? "Submitting..." : "Enroll / 報名"}
                      </Button>
                    </div>
                  )}
                </>
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
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Enrollments / 報名列表 ({enrollments.length})</span>
                  {(cls.status === "open" || cls.status === "published") && (
                    <Dialog open={enrollDialogOpen} onOpenChange={(open) => { setEnrollDialogOpen(open); if (open) loadChurchMembers(); }}>
                      <DialogTrigger asChild>
                        <Button size="sm"><UserPlus className="h-4 w-4 mr-1" /> Enroll Member / 為會員報名</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Enroll a Member / 為會員報名</DialogTitle></DialogHeader>
                        <div className="space-y-4">
                          <p className="text-sm text-muted-foreground">Select a member to enroll in this class. They will be auto-approved. / 選擇一位會員報名此課程，將自動通過審核。</p>
                          {churchMembers.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No eligible members found. All members may already be enrolled. / 沒有可報名的會員。</p>
                          ) : (
                            <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                              <SelectTrigger><SelectValue placeholder="Select member..." /></SelectTrigger>
                              <SelectContent>
                                {churchMembers.map((m) => (
                                  <SelectItem key={m.user_id} value={m.user_id}>{m.english_name}{m.chinese_name_traditional ? ` / ${m.chinese_name_traditional}` : ""}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          <Button onClick={handleAdminEnrollMember} disabled={!selectedMemberId || adminEnrolling} className="w-full">
                            {adminEnrolling ? "Enrolling..." : "Enroll Member / 為會員報名"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {enrollments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No enrollments yet. / 暫無報名。</p>
                ) : (
                  <div className="space-y-2">
                    {enrollments.map((e) => (
                      <div key={e.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div>
                          <span className="text-sm font-medium">{e.profiles?.english_name || "Unknown"}</span>
                          {e.profiles?.chinese_name_traditional && <span className="text-xs text-muted-foreground font-chinese ml-1">{e.profiles.chinese_name_traditional}</span>}
                          <p className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusChip status={e.status} />
                          {e.status === "pending" && (
                            <>
                              <Button size="sm" variant="outline" className="text-success border-success/30 h-7" onClick={() => handleEnrollmentAction(e.id, "approved")}>Approve</Button>
                              <Button size="sm" variant="outline" className="text-destructive border-destructive/30 h-7" onClick={() => handleEnrollmentAction(e.id, "rejected")}>Reject</Button>
                            </>
                          )}
                          {e.status === "approved" && (
                            <Button size="sm" variant="outline" className="h-7" onClick={() => handleEnrollmentAction(e.id, "completed")}>Complete</Button>
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
