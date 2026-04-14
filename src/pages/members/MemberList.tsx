import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusChip } from "@/components/StatusChip";
import { Plus, Search, Users } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

const MemberList = () => {
  const [members, setMembers] = useState<(Profile & { churches?: { english_name: string } | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();

  useEffect(() => {
    supabase.from("profiles").select("*, churches(english_name)").order("created_at", { ascending: false }).then(({ data }) => {
      setMembers(data || []);
      setLoading(false);
    });
  }, []);

  const filtered = members.filter((m) => {
    const matchSearch = m.english_name.toLowerCase().includes(search.toLowerCase()) ||
      (m.chinese_name_traditional || "").includes(search) ||
      (m.email || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || m.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Members / 會員</h1>
          <p className="text-muted-foreground text-sm">Manage member accounts / 管理會員帳號</p>
        </div>
        <Button onClick={() => navigate("/members/new")}><Plus className="h-4 w-4 mr-2" /> Add Member</Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search members..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="disabled">Disabled</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg">No members found</h3>
            <p className="text-muted-foreground text-sm mt-1">
              {search || statusFilter !== "all" ? "Try adjusting your filters" : "No members in this church yet. Click 'Add Member' to invite someone."}
            </p>
            <p className="text-muted-foreground text-xs font-chinese mt-0.5">
              {search || statusFilter !== "all" ? "嘗試調整篩選條件" : "此教會目前沒有會員。點擊「新增會員」邀請會員。"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((member) => (
            <Card key={member.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/members/${member.id}`)}>
              <CardContent className="flex items-center gap-4 py-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                  {member.english_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{member.english_name}</h3>
                  {member.chinese_name_traditional && <p className="text-sm text-muted-foreground font-chinese truncate">{member.chinese_name_traditional}</p>}
                  <p className="text-xs text-muted-foreground">{member.email} {member.churches ? `· ${member.churches.english_name}` : ""}</p>
                </div>
                <StatusChip status={member.status} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MemberList;
