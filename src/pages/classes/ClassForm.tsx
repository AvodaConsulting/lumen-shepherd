import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { ArrowLeft } from "lucide-react";

const ClassForm = () => {
  const navigate = useNavigate();
  const { log } = useAuditLog();
  const { isSuperAdmin, profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [churches, setChurches] = useState<{ id: string; english_name: string }[]>([]);
  const [form, setForm] = useState({
    english_title: "",
    chinese_title_traditional: "",
    english_description: "",
    chinese_description_traditional: "",
    owner_type: "platform",
    owner_church_id: "",
    status: "draft",
    enrollment_start: "",
    enrollment_end: "",
    access_start: "",
    access_end: "",
    approval_mode: "manual",
    retake_policy: "not_allowed",
    min_age: "",
    max_age: "",
    gender_requirement: "",
    prerequisites: "",
    max_enrollment: "",
  });

  useEffect(() => {
    supabase.from("churches").select("id, english_name").eq("status", "active").then(({ data }) => setChurches(data || []));
  }, []);

  const handleChange = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.english_title) {
      toast({ title: "Validation Error", description: "Title is required.", variant: "destructive" });
      return;
    }

    setSaving(true);
    const { data, error } = await supabase.from("classes").insert({
      english_title: form.english_title,
      chinese_title_traditional: form.chinese_title_traditional || null,
      english_description: form.english_description || null,
      chinese_description_traditional: form.chinese_description_traditional || null,
      owner_type: form.owner_type as any,
      owner_church_id: form.owner_type === "church" ? form.owner_church_id || null : null,
      status: form.status as any,
      enrollment_start: form.enrollment_start || null,
      enrollment_end: form.enrollment_end || null,
      access_start: form.access_start || null,
      access_end: form.access_end || null,
      approval_mode: form.approval_mode as any,
      retake_policy: form.retake_policy || null,
      min_age: form.min_age ? parseInt(form.min_age) : null,
      max_age: form.max_age ? parseInt(form.max_age) : null,
      gender_requirement: form.gender_requirement || null,
      prerequisites: form.prerequisites || null,
      max_enrollment: form.max_enrollment ? parseInt(form.max_enrollment) : null,
    }).select().single();

    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      await log("class_created", "class", data.id, { english_title: form.english_title });
      toast({ title: "Class Created / 課程已建立" });
      navigate(`/classes/${data.id}`);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/classes")}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-2xl font-bold">Add Class / 新增課程</h1>
          <p className="text-muted-foreground text-sm">Create a new course</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Class Details / 課程資料</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>English Title *</Label><Input value={form.english_title} onChange={(e) => handleChange("english_title", e.target.value)} required /></div>
              <div className="space-y-2"><Label>中文標題（繁體）</Label><Input value={form.chinese_title_traditional} onChange={(e) => handleChange("chinese_title_traditional", e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label>English Description</Label><Textarea value={form.english_description} onChange={(e) => handleChange("english_description", e.target.value)} rows={3} /></div>
            <div className="space-y-2"><Label>中文描述（繁體）</Label><Textarea value={form.chinese_description_traditional} onChange={(e) => handleChange("chinese_description_traditional", e.target.value)} rows={3} /></div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Owner Type</Label>
                <Select value={form.owner_type} onValueChange={(v) => handleChange("owner_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="platform">Platform</SelectItem>
                    <SelectItem value="church">Church</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.owner_type === "church" && (
                <div className="space-y-2">
                  <Label>Owner Church</Label>
                  <Select value={form.owner_church_id} onValueChange={(v) => handleChange("owner_church_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{churches.map((c) => <SelectItem key={c.id} value={c.id}>{c.english_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => handleChange("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Enrollment Start</Label><Input type="date" value={form.enrollment_start} onChange={(e) => handleChange("enrollment_start", e.target.value)} /></div>
              <div className="space-y-2"><Label>Enrollment End</Label><Input type="date" value={form.enrollment_end} onChange={(e) => handleChange("enrollment_end", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Access Start</Label><Input type="date" value={form.access_start} onChange={(e) => handleChange("access_start", e.target.value)} /></div>
              <div className="space-y-2"><Label>Access End</Label><Input type="date" value={form.access_end} onChange={(e) => handleChange("access_end", e.target.value)} /></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Approval Mode</Label>
                <Select value={form.approval_mode} onValueChange={(v) => handleChange("approval_mode", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto Approve</SelectItem>
                    <SelectItem value="manual">Manual Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Max Enrollment</Label><Input type="number" value={form.max_enrollment} onChange={(e) => handleChange("max_enrollment", e.target.value)} /></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Min Age</Label><Input type="number" value={form.min_age} onChange={(e) => handleChange("min_age", e.target.value)} /></div>
              <div className="space-y-2"><Label>Max Age</Label><Input type="number" value={form.max_age} onChange={(e) => handleChange("max_age", e.target.value)} /></div>
              <div className="space-y-2">
                <Label>Gender Req.</Label>
                <Select value={form.gender_requirement} onValueChange={(v) => handleChange("gender_requirement", v)}>
                  <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="male">Male only</SelectItem>
                    <SelectItem value="female">Female only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Prerequisites</Label><Input value={form.prerequisites} onChange={(e) => handleChange("prerequisites", e.target.value)} placeholder="e.g. Must complete Basic Bible Study" /></div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={saving}>{saving ? "Creating..." : "Create Class / 建立課程"}</Button>
              <Button type="button" variant="outline" onClick={() => navigate("/classes")}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClassForm;
