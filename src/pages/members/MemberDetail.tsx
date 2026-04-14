import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusChip } from "@/components/StatusChip";
import { toast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { ArrowLeft, Edit2, Save, X, UserPlus } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

const MemberDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { log } = useAuditLog();
  const { isSuperAdmin, isChurchAdmin, user } = useAuth();
  const [member, setMember] = useState<(Profile & { churches?: { english_name: string } | null }) | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Partial<Profile>>({});
  const [churches, setChurches] = useState<{ id: string; english_name: string }[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [roles, setRoles] = useState<string[]>([]);

  // Enroll member into class
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [enrollingMember, setEnrollingMember] = useState(false);

  const fetchMember = async () => {
    if (!id) return;
    setLoading(true);
    const { data: profileData } = await supabase.from("profiles").select("*, churches(english_name)").eq("id", id).single();
    if (!profileData) { setLoading(false); return; }
    setMember(profileData);
    setForm(profileData);

    const userId = profileData.user_id;
    const [enrollRes, rolesRes] = await Promise.all([
      supabase.from("enrollments").select("*, classes(english_title, chinese_title_traditional)").eq("member_id", userId).order("created_at", { ascending: false }),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    setEnrollments(enrollRes.data || []);
    setRoles(rolesRes.data?.map((r: any) => r.role) || []);
    setLoading(false);
  };

  const loadAvailableClasses = async () => {
    if (!member) return;
    const { data } = await supabase.from("classes").select("id, english_title, chinese_title_traditional, status").in("status", ["open", "published"]).order("english_title");
    const enrolledClassIds = new Set(enrollments.filter((e) => e.status !== "withdrawn" && e.status !== "rejected").map((e) => e.class_id));
    setAvailableClasses((data || []).filter((c) => !enrolledClassIds.has(c.id)));
  };

  useEffect(() => {
    fetchMember();
    supabase.from("churches").select("id, english_name").eq("status", "active").then(({ data }) => setChurches(data || []));
  }, [id]);

  const handleChange = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      english_name: form.english_name,
      chinese_name_traditional: form.chinese_name_traditional,
      gender: form.gender,
      date_of_birth: form.date_of_birth,
      phone: form.phone,
      church_id: form.church_id,
      status: form.status as any,
    }).eq("id", id);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      await log("member_updated", "member", id);
      toast({ title: "Member Updated / 會員已更新" });
      setEditing(false);
      fetchMember();
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    const { error } = await supabase.from("profiles").update({ status: newStatus as any }).eq("id", id);
    if (!error) {
      await log("member_status_changed", "member", id, { new_status: newStatus });
      toast({ title: `Member status changed to ${newStatus}` });
      fetchMember();
    }
  };

  const handleEnrollMemberToClass = async () => {
    if (!member || !selectedClassId) return;
    setEnrollingMember(true);
    const { error } = await supabase.from("enrollments").insert({
      member_id: member.user_id,
      class_id: selectedClassId,
      church_id: member.church_id,
      status: "approved",
    } as any);
    setEnrollingMember(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      await log("enrollment_admin_created", "enrollment", selectedClassId, { member_name: member.english_name });
      toast({ title: "Member enrolled / 已為會員報名" });
      setSelectedClassId("");
      setEnrollDialogOpen(false);
      fetchMember();
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!member) return <div className="text-center py-12"><h2 className="text-xl font-semibold">Member not found / 找不到會員</h2><Button className="mt-4" onClick={() => navigate("/members")}>Back</Button></div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/members")}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold">{member.english_name}</h1>
            {member.chinese_name_traditional && <p className="text-muted-foreground font-chinese">{member.chinese_name_traditional}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusChip status={member.status} showChinese />
          {roles.map((r) => <StatusChip key={r} status={r === "super_admin" ? "active" : r === "church_admin" ? "published" : "pending"} className="text-xs" />)}
          {!editing && <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Edit2 className="h-4 w-4 mr-1" /> Edit</Button>}
        </div>
      </div>

      {/* Quick status actions */}
      {!editing && (
        <div className="flex gap-2 flex-wrap">
          {member.status !== "active" && (
            <AlertDialog>
              <AlertDialogTrigger asChild><Button size="sm" variant="outline" className="text-success border-success/30">Activate / 啟用</Button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Activate member? / 啟用會員？</AlertDialogTitle><AlertDialogDescription>This will allow the member to access the platform.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleStatusChange("active")}>Confirm</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {member.status === "active" && (
            <AlertDialog>
              <AlertDialogTrigger asChild><Button size="sm" variant="outline" className="text-warning border-warning/30">Suspend / 暫停</Button></AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Suspend member? / 暫停會員？</AlertDialogTitle><AlertDialogDescription>This will prevent the member from accessing the platform.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleStatusChange("inactive")}>Confirm</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>{editing ? "Edit Member / 編輯會員" : "Member Details / 會員資料"}</CardTitle></CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>English Name</Label><Input value={form.english_name || ""} onChange={(e) => handleChange("english_name", e.target.value)} /></div>
                <div className="space-y-2"><Label>中文名稱</Label><Input value={form.chinese_name_traditional || ""} onChange={(e) => handleChange("chinese_name_traditional", e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Gender / 性別</Label>
                  <Select value={form.gender || ""} onValueChange={(v) => handleChange("gender", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male / 男</SelectItem>
                      <SelectItem value="female">Female / 女</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Date of Birth / 出生日期</Label><Input type="date" value={form.date_of_birth || ""} onChange={(e) => handleChange("date_of_birth", e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Phone / 電話</Label><Input value={form.phone || ""} onChange={(e) => handleChange("phone", e.target.value)} /></div>
                {isSuperAdmin && (
                  <div className="space-y-2">
                    <Label>Church / 教會</Label>
                    <Select value={form.church_id || ""} onValueChange={(v) => handleChange("church_id", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{churches.map((c) => <SelectItem key={c.id} value={c.id}>{c.english_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-4">
                <Button onClick={handleSave} disabled={saving}><Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save / 儲存"}</Button>
                <Button variant="outline" onClick={() => { setEditing(false); setForm(member); }}><X className="h-4 w-4 mr-1" /> Cancel / 取消</Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
              <DetailField label="English Name" value={member.english_name} />
              <DetailField label="中文名稱" value={member.chinese_name_traditional} />
              <DetailField label="Email" value={member.email} />
              <DetailField label="Phone / 電話" value={member.phone} />
              <DetailField label="Gender / 性別" value={member.gender === "male" ? "Male / 男" : member.gender === "female" ? "Female / 女" : member.gender} />
              <DetailField label="Date of Birth / 出生日期" value={member.date_of_birth} />
              <DetailField label="Church / 教會" value={member.churches?.english_name} />
              <DetailField label="Roles / 角色" value={roles.join(", ") || "None"} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enrollment history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Enrollment History / 報名記錄 ({enrollments.length})</span>
            {(isSuperAdmin || isChurchAdmin) && (
              <Dialog open={enrollDialogOpen} onOpenChange={(open) => { setEnrollDialogOpen(open); if (open) loadAvailableClasses(); }}>
                <DialogTrigger asChild>
                  <Button size="sm"><UserPlus className="h-4 w-4 mr-1" /> Enroll in Class / 報名課程</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Enroll {member.english_name} in a Class</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">Select a class to enroll this member. They will be auto-approved. / 選擇課程為此會員報名，將自動通過審核。</p>
                    {availableClasses.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No available classes. / 沒有可用課程。</p>
                    ) : (
                      <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                        <SelectTrigger><SelectValue placeholder="Select class..." /></SelectTrigger>
                        <SelectContent>
                          {availableClasses.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.english_title}{c.chinese_title_traditional ? ` / ${c.chinese_title_traditional}` : ""} ({c.status})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Button onClick={handleEnrollMemberToClass} disabled={!selectedClassId || enrollingMember} className="w-full">
                      {enrollingMember ? "Enrolling..." : "Enroll / 報名"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {enrollments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No enrollment history. / 暫無報名記錄。</p>
          ) : (
            <div className="space-y-2">
              {enrollments.map((e) => (
                <div key={e.id} className="flex items-center justify-between py-2 border-b border-border last:border-0 cursor-pointer hover:bg-muted/50 rounded px-2 -mx-2" onClick={() => navigate(`/classes/${e.class_id}`)}>
                  <div>
                    <p className="text-sm font-medium">{e.classes?.english_title}</p>
                    {e.classes?.chinese_title_traditional && <p className="text-xs text-muted-foreground font-chinese">{e.classes.chinese_title_traditional}</p>}
                    <p className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleDateString()}</p>
                  </div>
                  <StatusChip status={e.status} showChinese />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const DetailField = ({ label, value }: { label: string; value?: string | null }) => (
  <div><p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p><p className="font-medium mt-0.5">{value || "—"}</p></div>
);

export default MemberDetail;
