import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, Users } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

const statusColors: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  inactive: "bg-muted text-muted-foreground border-border",
  disabled: "bg-destructive/10 text-destructive border-destructive/20",
};

const MemberList = () => {
  const [members, setMembers] = useState<(Profile & { churches?: { english_name: string } | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();

  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("*, churches(english_name)")
        .order("created_at", { ascending: false });
      setMembers(data || []);
      setLoading(false);
    };
    fetchMembers();
  }, []);

  const filtered = members.filter(
    (m) =>
      m.english_name.toLowerCase().includes(search.toLowerCase()) ||
      (m.chinese_name_traditional || "").includes(search) ||
      (m.email || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Members / 會員</h1>
          <p className="text-muted-foreground text-sm">Manage member accounts</p>
        </div>
        <Button onClick={() => navigate("/members/new")}>
          <Plus className="h-4 w-4 mr-2" /> Add Member
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search members..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg">No members found</h3>
            <p className="text-muted-foreground text-sm mt-1">{search ? "Try adjusting your search" : "Add your first member"}</p>
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
                <Badge variant="outline" className={statusColors[member.status] || ""}>{member.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MemberList;
