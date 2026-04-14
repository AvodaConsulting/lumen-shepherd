import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { ArrowLeft, Edit2, Save, X } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

const statusColors: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  inactive: "bg-muted text-muted-foreground border-border",
  disabled: "bg-destructive/10 text-destructive border-destructive/20",
};

const MemberDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { log } = useAuditLog();
  const [member, setMember] = useState<(Profile & { churches?: { english_name: string } | null }) | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Partial<Profile>>({});
  const [churches, setChurches] = useState<{ id: string; english_name: string }[]>([]);

  const fetchMember = async () => {
    if (!id) return;
    setLoading(true);
    const { data } = await supabase.from("profiles").select("*, churches(english_name)").eq("id", id).single();
    setMember(data);
    setForm(data || {});
    setLoading(false);
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
      await log("member_updated", "member", id, { english_name: form.english_name });
      toast({ title: "Member Updated / 會員已更新" });
      setEditing(false);
      fetchMember();
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!member) return <div className="text-center py-12"><h2 className="text-xl font-semibold">Member not found</h2><Button className="mt-4" onClick={() => navigate("/members")}>Back</Button></div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/members")}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold">{member.english_name}</h1>
            {member.chinese_name_traditional && <p className="text-muted-foreground font-chinese">{member.chinese_name_traditional}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={statusColors[member.status] || ""}>{member.status}</Badge>
          {!editing && <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Edit2 className="h-4 w-4 mr-1" /> Edit</Button>}
        </div>
      </div>

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
                  <Label>Gender</Label>
                  <Select value={form.gender || ""} onValueChange={(v) => handleChange("gender", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male / 男</SelectItem>
                      <SelectItem value="female">Female / 女</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Date of Birth</Label><Input type="date" value={form.date_of_birth || ""} onChange={(e) => handleChange("date_of_birth", e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Phone</Label><Input value={form.phone || ""} onChange={(e) => handleChange("phone", e.target.value)} /></div>
                <div className="space-y-2">
                  <Label>Church</Label>
                  <Select value={form.church_id || ""} onValueChange={(v) => handleChange("church_id", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{churches.map((c) => <SelectItem key={c.id} value={c.id}>{c.english_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status || ""} onValueChange={(v) => handleChange("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3 pt-4">
                <Button onClick={handleSave} disabled={saving}><Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save"}</Button>
                <Button variant="outline" onClick={() => { setEditing(false); setForm(member); }}><X className="h-4 w-4 mr-1" /> Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
              <DetailField label="English Name" value={member.english_name} />
              <DetailField label="中文名稱" value={member.chinese_name_traditional} />
              <DetailField label="Email" value={member.email} />
              <DetailField label="Phone" value={member.phone} />
              <DetailField label="Gender" value={member.gender} />
              <DetailField label="Date of Birth" value={member.date_of_birth} />
              <DetailField label="Church" value={member.churches?.english_name} />
              <DetailField label="Status" value={member.status} />
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
