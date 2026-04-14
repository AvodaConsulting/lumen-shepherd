import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusChip } from "@/components/StatusChip";
import { toast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { ArrowLeft, Upload, Edit2, Save, X, Church as ChurchIcon } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { Database } from "@/integrations/supabase/types";

type Church = Database["public"]["Tables"]["churches"]["Row"];

const ChurchDetail = () => {
  const { id: routeId } = (() => {
    const params = new URLSearchParams();
    // We use useParams in the actual component below
    return { id: undefined as string | undefined };
  })();

  return <ChurchDetailInner />;
};

const ChurchDetailInner = () => {
  const navigate = useNavigate();
  const { log } = useAuditLog();
  const { isSuperAdmin, isChurchAdmin, profile } = useAuth();

  // Determine ID: for /my-church use profile.church_id, otherwise use URL param
  const urlId = window.location.pathname.startsWith("/my-church") ? profile?.church_id : window.location.pathname.split("/churches/")[1];
  const id = urlId || undefined;

  const [church, setChurch] = useState<Church | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Partial<Church>>({});
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);

  const isMyChurch = window.location.pathname.startsWith("/my-church");
  const canChangeStatus = isSuperAdmin; // Only super admin can change church status

  const fetchChurch = async () => {
    if (!id) return;
    setLoading(true);
    const [churchRes, membersRes, classesRes] = await Promise.all([
      supabase.from("churches").select("*").eq("id", id).single(),
      supabase.from("profiles").select("id, english_name, chinese_name_traditional, status, email").eq("church_id", id).order("english_name"),
      supabase.from("classes").select("id, english_title, chinese_title_traditional, status, owner_type").or(`owner_church_id.eq.${id}`).order("english_title"),
    ]);
    setChurch(churchRes.data);
    setForm(churchRes.data || {});
    setMembers(membersRes.data || []);

    // Also get assigned platform classes
    const { data: assignments } = await supabase.from("class_church_assignments").select("class_id, classes(id, english_title, chinese_title_traditional, status, owner_type)").eq("church_id", id);
    const assignedClasses = (assignments || []).map((a: any) => a.classes).filter(Boolean);
    const churchOwned = classesRes.data || [];
    // Merge, avoiding duplicates
    const allIds = new Set(churchOwned.map((c: any) => c.id));
    const merged = [...churchOwned];
    assignedClasses.forEach((c: any) => { if (!allIds.has(c.id)) merged.push(c); });
    setClasses(merged);

    setLoading(false);
  };

  useEffect(() => { fetchChurch(); }, [id]);

  const handleChange = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    let logo_url = form.logo_url;
    if (logoFile) {
      const ext = logoFile.name.split(".").pop();
      const path = `logos/${id}.${ext}`;
      await supabase.storage.from("church-logos").upload(path, logoFile, { upsert: true });
      const { data: urlData } = supabase.storage.from("church-logos").getPublicUrl(path);
      logo_url = urlData.publicUrl;
    }

    const updatePayload: any = {
      english_name: form.english_name,
      chinese_name_traditional: form.chinese_name_traditional,
      contact_person: form.contact_person,
      contact_email: form.contact_email,
      contact_phone: form.contact_phone,
      district_or_address: form.district_or_address,
      theme_color: form.theme_color,
      logo_url,
    };

    // Only super admin can change status
    if (canChangeStatus) {
      updatePayload.status = form.status;
    }

    const { error } = await supabase.from("churches").update(updatePayload).eq("id", id);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      await log("church_updated", "church", id);
      toast({ title: "Church Updated / 教會已更新" });
      setEditing(false);
      fetchChurch();
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    const { error } = await supabase.from("churches").update({ status: newStatus as any }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      await log("church_status_changed", "church", id, { new_status: newStatus });
      toast({ title: `Church status changed to ${newStatus}` });
      fetchChurch();
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!church) return <div className="text-center py-12"><h2 className="text-xl font-semibold">Church not found / 找不到教會</h2><Button className="mt-4" onClick={() => navigate(isMyChurch ? "/dashboard" : "/churches")}>Back</Button></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isMyChurch ? "/dashboard" : "/churches")}><ArrowLeft className="h-4 w-4" /></Button>
          <div className="flex items-center gap-3">
            {church.logo_url ? (
              <img src={church.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><ChurchIcon className="h-5 w-5 text-primary" /></div>
            )}
            <div>
              <h1 className="text-2xl font-bold">{isMyChurch ? "My Church / 我的教會" : church.english_name}</h1>
              {church.chinese_name_traditional && <p className="text-muted-foreground font-chinese">{church.chinese_name_traditional}</p>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusChip status={church.status} showChinese />
          {!editing && <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Edit2 className="h-4 w-4 mr-1" /> Edit</Button>}
        </div>
      </div>

      {/* Quick status actions for super admin */}
      {canChangeStatus && !editing && (
        <div className="flex gap-2 flex-wrap">
          {church.status !== "active" && (
            <ConfirmButton label="Activate / 啟用" description="This will make the church active and visible." onConfirm={() => handleStatusChange("active")} variant="outline" className="text-success border-success/30" />
          )}
          {church.status === "active" && (
            <ConfirmButton label="Deactivate / 停用" description="This will mark the church as inactive." onConfirm={() => handleStatusChange("inactive")} variant="outline" className="text-warning border-warning/30" />
          )}
          {church.status !== "archived" && (
            <ConfirmButton label="Archive / 歸檔" description="This will archive the church. This action should be used for churches that are no longer operating." onConfirm={() => handleStatusChange("archived")} variant="outline" className="text-muted-foreground" />
          )}
        </div>
      )}

      {/* Church info card */}
      <Card>
        <CardHeader><CardTitle>{editing ? "Edit Church / 編輯教會" : "Church Details / 教會資料"}</CardTitle></CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>English Name *</Label><Input value={form.english_name || ""} onChange={(e) => handleChange("english_name", e.target.value)} /></div>
                <div className="space-y-2"><Label>中文名稱（繁體）</Label><Input value={form.chinese_name_traditional || ""} onChange={(e) => handleChange("chinese_name_traditional", e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Contact Person / 聯絡人 *</Label><Input value={form.contact_person || ""} onChange={(e) => handleChange("contact_person", e.target.value)} /></div>
                <div className="space-y-2"><Label>Contact Email *</Label><Input type="email" value={form.contact_email || ""} onChange={(e) => handleChange("contact_email", e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Contact Phone / 聯絡電話</Label><Input value={form.contact_phone || ""} onChange={(e) => handleChange("contact_phone", e.target.value)} /></div>
                <div className="space-y-2"><Label>District / Address / 地區</Label><Input value={form.district_or_address || ""} onChange={(e) => handleChange("district_or_address", e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Theme Color / 主題色</Label><Input type="color" value={form.theme_color || "#3b82f6"} onChange={(e) => handleChange("theme_color", e.target.value)} /></div>
                <div className="space-y-2">
                  <Label>Church Logo / 教會標誌</Label>
                  <div className="flex items-center gap-3">
                    <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById("logo-edit")?.click()}>
                      <Upload className="h-4 w-4 mr-2" /> Upload
                    </Button>
                    <input id="logo-edit" type="file" accept="image/*" className="hidden" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
                    {logoFile && <span className="text-sm text-muted-foreground">{logoFile.name}</span>}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button onClick={handleSave} disabled={saving}><Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save Changes / 儲存"}</Button>
                <Button variant="outline" onClick={() => { setEditing(false); setForm(church); setLogoFile(null); }}><X className="h-4 w-4 mr-1" /> Cancel / 取消</Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
              <DetailField label="English Name" value={church.english_name} />
              <DetailField label="中文名稱" value={church.chinese_name_traditional} />
              <DetailField label="Contact Person / 聯絡人" value={church.contact_person} />
              <DetailField label="Contact Email" value={church.contact_email} />
              <DetailField label="Contact Phone / 電話" value={church.contact_phone} />
              <DetailField label="District / Address / 地區" value={church.district_or_address} />
              <DetailField label="Status / 狀態" value={church.status} />
              <DetailField label="Created / 建立日期" value={new Date(church.created_at).toLocaleDateString()} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Members tab */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Members / 會員 ({members.length})</span>
            {(isSuperAdmin || isChurchAdmin) && <Button size="sm" variant="outline" onClick={() => navigate("/members/new")}>Add Member</Button>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members in this church yet. / 此教會目前沒有會員。</p>
          ) : (
            <div className="space-y-2">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between py-2 border-b border-border last:border-0 cursor-pointer hover:bg-muted/50 rounded px-2 -mx-2" onClick={() => navigate(`/members/${m.id}`)}>
                  <div>
                    <p className="text-sm font-medium">{m.english_name}</p>
                    {m.chinese_name_traditional && <p className="text-xs text-muted-foreground font-chinese">{m.chinese_name_traditional}</p>}
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                  </div>
                  <StatusChip status={m.status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Classes tab */}
      <Card>
        <CardHeader><CardTitle className="text-base">Classes / 課程 ({classes.length})</CardTitle></CardHeader>
        <CardContent>
          {classes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No classes assigned to or owned by this church. / 此教會沒有任何課程。</p>
          ) : (
            <div className="space-y-2">
              {classes.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-border last:border-0 cursor-pointer hover:bg-muted/50 rounded px-2 -mx-2" onClick={() => navigate(`/classes/${c.id}`)}>
                  <div>
                    <p className="text-sm font-medium">{c.english_title}</p>
                    {c.chinese_title_traditional && <p className="text-xs text-muted-foreground font-chinese">{c.chinese_title_traditional}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {c.owner_type === "platform" && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">Platform</span>}
                    <StatusChip status={c.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const ConfirmButton = ({ label, description, onConfirm, variant, className }: { label: string; description: string; onConfirm: () => void; variant?: any; className?: string }) => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button size="sm" variant={variant} className={className}>{label}</Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Confirm Action / 確認操作</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel / 取消</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm}>Confirm / 確認</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

const DetailField = ({ label, value }: { label: string; value?: string | null }) => (
  <div><p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p><p className="font-medium mt-0.5">{value || "—"}</p></div>
);

export default ChurchDetail;
