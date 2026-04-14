import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { GraduationCap } from "lucide-react";

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  approved: "bg-success/10 text-success border-success/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  withdrawn: "bg-muted text-muted-foreground border-border",
  completed: "bg-primary/10 text-primary border-primary/20",
};

const EnrollmentList = () => {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { isSuperAdmin, isChurchAdmin, user } = useAuth();
  const { log } = useAuditLog();

  const fetchEnrollments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("enrollments")
      .select("*, classes(english_title, chinese_title_traditional), profiles!enrollments_member_id_fkey(english_name, chinese_name_traditional)")
      .order("created_at", { ascending: false });
    setEnrollments(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchEnrollments(); }, []);

  const handleStatusChange = async (enrollmentId: string, newStatus: string) => {
    const { error } = await supabase.from("enrollments").update({
      status: newStatus as any,
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
    }).eq("id", enrollmentId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      await log(`enrollment_${newStatus}`, "enrollment", enrollmentId);
      toast({ title: `Enrollment ${newStatus}` });
      fetchEnrollments();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Enrollments / 報名</h1>
        <p className="text-muted-foreground text-sm">
          {isSuperAdmin || isChurchAdmin ? "Manage enrollment requests" : "Your enrollment history"}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : enrollments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <GraduationCap className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg">No enrollments yet</h3>
            <p className="text-muted-foreground text-sm mt-1">Enrollment requests will appear here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {enrollments.map((enr) => (
            <Card key={enr.id}>
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{enr.classes?.english_title || "Unknown Class"}</h3>
                  {enr.classes?.chinese_title_traditional && <p className="text-sm text-muted-foreground font-chinese truncate">{enr.classes.chinese_title_traditional}</p>}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Member: {enr.profiles?.english_name || "Unknown"} · {new Date(enr.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant="outline" className={statusColors[enr.status] || ""}>{enr.status}</Badge>
                {(isSuperAdmin || isChurchAdmin) && enr.status === "pending" && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-success border-success/30" onClick={() => handleStatusChange(enr.id, "approved")}>
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive border-destructive/30" onClick={() => handleStatusChange(enr.id, "rejected")}>
                      Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default EnrollmentList;
