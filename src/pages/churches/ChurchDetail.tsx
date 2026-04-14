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
import { ArrowLeft, Upload, Edit2, Save, X, Church as ChurchIcon } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Church = Database["public"]["Tables"]["churches"]["Row"];

const statusColors: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  inactive: "bg-muted text-muted-foreground border-border",
  disabled: "bg-destructive/10 text-destructive border-destructive/20",
  archived: "bg-muted text-muted-foreground border-border",
};

const ChurchDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { log } = useAuditLog();
  const [church, setChurch] = useState<Church | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Partial<Church>>({});
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const fetchChurch = async () => {
    if (!id) return;
    setLoading(true);
    const { data } = await supabase.from("churches").select("*").eq("id", id).single();
    setChurch(data);
    setForm(data || {});
    setLoading(false);
  };

  useEffect(() => { fetchChurch(); }, [id]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

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

    const { error } = await supabase
      .from("churches")
      .update({
        english_name: form.english_name,
        chinese_name_traditional: form.chinese_name_traditional,
        contact_person: form.contact_person,
        contact_email: form.contact_email,
        contact_phone: form.contact_phone,
        district_or_address: form.district_or_address,
        status: form.status,
        theme_color: form.theme_color,
        logo_url,
      })
      .eq("id", id);

    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      await log("church_updated", "church", id, { english_name: form.english_name });
      toast({ title: "Church Updated / 教會已更新" });
      setEditing(false);
      fetchChurch();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!church) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Church not found</h2>
        <Button className="mt-4" onClick={() => navigate("/churches")}>Back to Churches</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/churches")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            {church.logo_url ? (
              <img src={church.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <ChurchIcon className="h-5 w-5 text-primary" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold">{church.english_name}</h1>
              {church.chinese_name_traditional && (
                <p className="text-muted-foreground font-chinese">{church.chinese_name_traditional}</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={statusColors[church.status] || ""}>
            {church.status}
          </Badge>
          {!editing && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Edit2 className="h-4 w-4 mr-1" /> Edit
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{editing ? "Edit Church / 編輯教會" : "Church Details / 教會資料"}</CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>English Name *</Label>
                  <Input value={form.english_name || ""} onChange={(e) => handleChange("english_name", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>中文名稱（繁體）</Label>
                  <Input value={form.chinese_name_traditional || ""} onChange={(e) => handleChange("chinese_name_traditional", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contact Person *</Label>
                  <Input value={form.contact_person || ""} onChange={(e) => handleChange("contact_person", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Contact Email *</Label>
                  <Input type="email" value={form.contact_email || ""} onChange={(e) => handleChange("contact_email", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contact Phone</Label>
                  <Input value={form.contact_phone || ""} onChange={(e) => handleChange("contact_phone", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>District / Address</Label>
                  <Input value={form.district_or_address || ""} onChange={(e) => handleChange("district_or_address", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status || "pending"} onValueChange={(v) => handleChange("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Theme Color</Label>
                  <Input type="color" value={form.theme_color || "#3b82f6"} onChange={(e) => handleChange("theme_color", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Church Logo</Label>
                <div className="flex items-center gap-3">
                  <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById("logo-edit")?.click()}>
                    <Upload className="h-4 w-4 mr-2" /> Upload
                  </Button>
                  <input id="logo-edit" type="file" accept="image/*" className="hidden" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
                  {logoFile && <span className="text-sm text-muted-foreground">{logoFile.name}</span>}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save Changes"}
                </Button>
                <Button variant="outline" onClick={() => { setEditing(false); setForm(church); setLogoFile(null); }}>
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
              <DetailField label="English Name" value={church.english_name} />
              <DetailField label="中文名稱" value={church.chinese_name_traditional} />
              <DetailField label="Contact Person / 聯絡人" value={church.contact_person} />
              <DetailField label="Contact Email" value={church.contact_email} />
              <DetailField label="Contact Phone" value={church.contact_phone} />
              <DetailField label="District / Address" value={church.district_or_address} />
              <DetailField label="Status" value={church.status} />
              <DetailField label="Created" value={new Date(church.created_at).toLocaleDateString()} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const DetailField = ({ label, value }: { label: string; value?: string | null }) => (
  <div>
    <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
    <p className="font-medium mt-0.5">{value || "—"}</p>
  </div>
);

export default ChurchDetail;
