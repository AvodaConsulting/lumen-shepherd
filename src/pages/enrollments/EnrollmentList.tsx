import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusChip } from "@/components/StatusChip";
import { toast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { GraduationCap, Search, ExternalLink } from "lucide-react";

const EnrollmentList = () => {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { isSuperAdmin, isChurchAdmin, isMember, user } = useAuth();
  const { log } = useAuditLog();
  const navigate = useNavigate();

  const fetchEnrollments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("enrollments")
      .select("*, classes(english_title, chinese_title_traditional), profiles!enrollments_member_id_fkey(english_name, chinese_name_traditional), churches(english_name)")
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

  const handleWithdraw = async (enrollmentId: string) => {
    const { error } = await supabase.from("enrollments").update({
      status: "withdrawn" as any,
    }).eq("id", enrollmentId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      await log("enrollment_withdrawn", "enrollment", enrollmentId);
      toast({ title: "Enrollment withdrawn / 已退出報名" });
      fetchEnrollments();
    }
  };

  const filtered = enrollments.filter((e) => {
    const matchSearch = (e.classes?.english_title || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.profiles?.english_name || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Enrollments / 報名</h1>
        <p className="text-muted-foreground text-sm">
          {isSuperAdmin || isChurchAdmin ? "Manage enrollment requests / 管理報名申請" : "Your enrollment history / 您的報名記錄"}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by class or member..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="withdrawn">Withdrawn</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <GraduationCap className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg">No enrollments found</h3>
            <p className="text-muted-foreground text-sm mt-1">
              {isSuperAdmin || isChurchAdmin ? "Enrollment requests will appear here" : "You haven't enrolled in any classes yet. Browse the class catalog to find courses."}
            </p>
            <p className="text-muted-foreground text-xs font-chinese mt-0.5">
              {isSuperAdmin || isChurchAdmin ? "報名申請將在此顯示" : "您尚未報名任何課程。瀏覽課程目錄以尋找課程。"}
            </p>
            {isMember && (
              <Button className="mt-4" onClick={() => navigate("/classes")}>Browse Classes / 瀏覽課程</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((enr) => (
            <Card key={enr.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{enr.classes?.english_title || "Unknown Class"}</h3>
                  {enr.classes?.chinese_title_traditional && <p className="text-sm text-muted-foreground font-chinese truncate">{enr.classes.chinese_title_traditional}</p>}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {(isSuperAdmin || isChurchAdmin) && <>Member: {enr.profiles?.english_name || "Unknown"}{enr.profiles?.chinese_name_traditional && ` / ${enr.profiles.chinese_name_traditional}`}</>}
                    {enr.churches?.english_name && ` · ${enr.churches.english_name}`}
                    {` · ${new Date(enr.created_at).toLocaleDateString()}`}
                  </p>
                </div>
                <StatusChip status={enr.status} />

                {/* Admin actions */}
                {(isSuperAdmin || isChurchAdmin) && enr.status === "pending" && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-success border-success/30" onClick={() => handleStatusChange(enr.id, "approved")}>Approve</Button>
                    <Button size="sm" variant="outline" className="text-destructive border-destructive/30" onClick={() => handleStatusChange(enr.id, "rejected")}>Reject</Button>
                  </div>
                )}
                {(isSuperAdmin || isChurchAdmin) && enr.status === "approved" && (
                  <Button size="sm" variant="outline" onClick={() => handleStatusChange(enr.id, "completed")}>Complete</Button>
                )}

                {/* Member withdraw */}
                {isMember && enr.member_id === user?.id && (enr.status === "pending" || enr.status === "approved") && (
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
                        <AlertDialogAction onClick={() => handleWithdraw(enr.id)}>Withdraw / 退出</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                {/* View class link */}
                <Button size="sm" variant="ghost" onClick={() => navigate(`/classes/${enr.class_id}`)}>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default EnrollmentList;
