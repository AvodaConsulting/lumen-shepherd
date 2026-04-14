import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { ArrowLeft, Upload } from "lucide-react";

const ChurchForm = () => {
  const navigate = useNavigate();
  const { log } = useAuditLog();
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    english_name: "",
    chinese_name_traditional: "",
    contact_person: "",
    contact_email: "",
    contact_phone: "",
    district_or_address: "",
    status: "pending" as string,
    theme_color: "",
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.english_name || !form.contact_person || !form.contact_email) {
      toast({ title: "Validation Error", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    setSaving(true);
    let logo_url: string | null = null;

    if (logoFile) {
      const ext = logoFile.name.split(".").pop();
      const path = `logos/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("church-logos").upload(path, logoFile);
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from("church-logos").getPublicUrl(path);
        logo_url = urlData.publicUrl;
      }
    }

    const { data, error } = await supabase
      .from("churches")
      .insert({ ...form, logo_url })
      .select()
      .single();

    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      await log("church_created", "church", data.id, { english_name: form.english_name });
      toast({ title: "Church Created / 教會已建立", description: form.english_name });
      navigate(`/churches/${data.id}`);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/churches")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Add Church / 新增教會</h1>
          <p className="text-muted-foreground text-sm">Register a new church on the platform</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Church Details / 教會資料</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>English Name *</Label>
                <Input value={form.english_name} onChange={(e) => handleChange("english_name", e.target.value)} placeholder="e.g. Grace Church" required />
              </div>
              <div className="space-y-2">
                <Label>中文名稱（繁體）</Label>
                <Input value={form.chinese_name_traditional} onChange={(e) => handleChange("chinese_name_traditional", e.target.value)} placeholder="例：恩典堂" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact Person / 聯絡人 *</Label>
                <Input value={form.contact_person} onChange={(e) => handleChange("contact_person", e.target.value)} placeholder="e.g. Pastor Chan" required />
              </div>
              <div className="space-y-2">
                <Label>Contact Email *</Label>
                <Input type="email" value={form.contact_email} onChange={(e) => handleChange("contact_email", e.target.value)} placeholder="admin@church.org" required />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact Phone / 聯絡電話</Label>
                <Input value={form.contact_phone} onChange={(e) => handleChange("contact_phone", e.target.value)} placeholder="+852 1234 5678" />
              </div>
              <div className="space-y-2">
                <Label>District / Address / 地區</Label>
                <Input value={form.district_or_address} onChange={(e) => handleChange("district_or_address", e.target.value)} placeholder="e.g. Sha Tin, NT" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => handleChange("status", v)}>
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
                <Label>Theme Color (optional)</Label>
                <Input type="color" value={form.theme_color || "#3b82f6"} onChange={(e) => handleChange("theme_color", e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Church Logo / 教會標誌</Label>
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" onClick={() => document.getElementById("logo-upload")?.click()}>
                  <Upload className="h-4 w-4 mr-2" /> Upload Logo
                </Button>
                <input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
                {logoFile && <span className="text-sm text-muted-foreground">{logoFile.name}</span>}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={saving}>
                {saving ? "Creating..." : "Create Church / 建立教會"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("/churches")}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChurchForm;
