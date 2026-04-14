import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { ArrowLeft } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Church = Database["public"]["Tables"]["churches"]["Row"];

const MemberForm = () => {
  const navigate = useNavigate();
  const { log } = useAuditLog();
  const { isSuperAdmin, profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [churches, setChurches] = useState<Church[]>([]);
  const [form, setForm] = useState({
    email: "",
    password: "",
    english_name: "",
    chinese_name_traditional: "",
    gender: "",
    date_of_birth: "",
    phone: "",
    church_id: "",
    status: "active",
  });

  useEffect(() => {
    const fetch = async () => {
      if (isSuperAdmin) {
        const { data } = await supabase.from("churches").select("*").eq("status", "active").order("english_name");
        setChurches(data || []);
      } else if (profile?.church_id) {
        setForm((prev) => ({ ...prev, church_id: profile.church_id! }));
      }
    };
    fetch();
  }, [isSuperAdmin, profile]);

  const handleChange = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password || !form.english_name || !form.church_id) {
      toast({ title: "Validation Error", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    setSaving(true);

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { english_name: form.english_name },
        emailRedirectTo: window.location.origin,
      },
    });

    if (authError || !authData.user) {
      setSaving(false);
      toast({ title: "Error", description: authError?.message || "Failed to create user", variant: "destructive" });
      return;
    }

    // Update profile with additional fields
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        chinese_name_traditional: form.chinese_name_traditional || null,
        gender: form.gender || null,
        date_of_birth: form.date_of_birth || null,
        phone: form.phone || null,
        church_id: form.church_id,
        status: form.status as any,
      })
      .eq("user_id", authData.user.id);

    // Assign member role
    await supabase.from("user_roles").insert({ user_id: authData.user.id, role: "member" as any });

    setSaving(false);
    if (profileError) {
      toast({ title: "Warning", description: "User created but profile update may have failed. Please check and edit.", variant: "destructive" });
    } else {
      await log("member_created", "member", authData.user.id, { english_name: form.english_name });
      toast({ title: "Member Created / 會員已建立", description: form.english_name });
    }
    navigate("/members");
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/members")}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-2xl font-bold">Add Member / 新增會員</h1>
          <p className="text-muted-foreground text-sm">Register a new member under a church</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Member Details / 會員資料</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={(e) => handleChange("email", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Password *</Label>
                <Input type="password" value={form.password} onChange={(e) => handleChange("password", e.target.value)} required minLength={6} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>English Name *</Label>
                <Input value={form.english_name} onChange={(e) => handleChange("english_name", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>中文名稱（繁體）</Label>
                <Input value={form.chinese_name_traditional} onChange={(e) => handleChange("chinese_name_traditional", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Gender / 性別</Label>
                <Select value={form.gender} onValueChange={(v) => handleChange("gender", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male / 男</SelectItem>
                    <SelectItem value="female">Female / 女</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date of Birth / 出生日期</Label>
                <Input type="date" value={form.date_of_birth} onChange={(e) => handleChange("date_of_birth", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone / 電話</Label>
                <Input value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Church / 教會 *</Label>
                {isSuperAdmin ? (
                  <Select value={form.church_id} onValueChange={(v) => handleChange("church_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Select church" /></SelectTrigger>
                    <SelectContent>
                      {churches.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.english_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={profile?.church_id || ""} disabled />
                )}
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={saving}>{saving ? "Creating..." : "Create Member / 建立會員"}</Button>
              <Button type="button" variant="outline" onClick={() => navigate("/members")}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default MemberForm;
