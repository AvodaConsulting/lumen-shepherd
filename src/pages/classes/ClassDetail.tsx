import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { ArrowLeft, BookOpen } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type ClassRow = Database["public"]["Tables"]["classes"]["Row"];

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-success/10 text-success",
  archived: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

const ClassDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isMember, user, profile } = useAuth();
  const { log } = useAuditLog();
  const [cls, setCls] = useState<ClassRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase.from("classes").select("*").eq("id", id).single().then(({ data }) => {
      setCls(data);
      setLoading(false);
    });
  }, [id]);

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
      await log("enrollment_requested", "enrollment", cls.id, { class_title: cls.english_title });
      toast({ title: cls.approval_mode === "auto" ? "Enrolled! / 已報名" : "Request Submitted / 申請已提交" });
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!cls) return <div className="text-center py-12"><h2>Class not found</h2></div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/classes")}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{cls.english_title}</h1>
          {cls.chinese_title_traditional && <p className="text-muted-foreground font-chinese">{cls.chinese_title_traditional}</p>}
        </div>
        <Badge variant="outline" className={statusColors[cls.status] || ""}>{cls.status}</Badge>
      </div>

      <Card>
        <CardHeader><CardTitle>Class Details / 課程詳情</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
            <DetailField label="Owner Type" value={cls.owner_type} />
            <DetailField label="Status" value={cls.status} />
            <DetailField label="Approval Mode" value={cls.approval_mode} />
            <DetailField label="Retake Policy" value={cls.retake_policy} />
            <DetailField label="Enrollment Period" value={cls.enrollment_start && cls.enrollment_end ? `${cls.enrollment_start} → ${cls.enrollment_end}` : "—"} />
            <DetailField label="Access Period" value={cls.access_start && cls.access_end ? `${cls.access_start} → ${cls.access_end}` : "—"} />
            <DetailField label="Age Range" value={cls.min_age || cls.max_age ? `${cls.min_age || "—"} to ${cls.max_age || "—"}` : "—"} />
            <DetailField label="Gender Requirement" value={cls.gender_requirement || "Any"} />
            <DetailField label="Max Enrollment" value={cls.max_enrollment?.toString()} />
            <DetailField label="Prerequisites" value={cls.prerequisites} />
          </div>
          {cls.english_description && (
            <div className="mt-6">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Description</p>
              <p className="text-sm">{cls.english_description}</p>
              {cls.chinese_description_traditional && <p className="text-sm mt-2 font-chinese text-muted-foreground">{cls.chinese_description_traditional}</p>}
            </div>
          )}
          {isMember && cls.status === "published" && (
            <Button className="mt-6" onClick={handleEnroll} disabled={enrolling}>
              {enrolling ? "Submitting..." : "Enroll / 報名"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const DetailField = ({ label, value }: { label: string; value?: string | null }) => (
  <div><p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p><p className="font-medium mt-0.5">{value || "—"}</p></div>
);

export default ClassDetail;
