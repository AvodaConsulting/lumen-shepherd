import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, BookOpen } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type ClassRow = Database["public"]["Tables"]["classes"]["Row"];

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  published: "bg-success/10 text-success border-success/20",
  archived: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

const ClassList = () => {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { isSuperAdmin, isChurchAdmin } = useAuth();

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase.from("classes").select("*").order("created_at", { ascending: false });
      setClasses(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = classes.filter((c) =>
    c.english_title.toLowerCase().includes(search.toLowerCase()) ||
    (c.chinese_title_traditional || "").includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Classes / 課程</h1>
          <p className="text-muted-foreground text-sm">Browse and manage courses</p>
        </div>
        {(isSuperAdmin || isChurchAdmin) && (
          <Button onClick={() => navigate("/classes/new")}><Plus className="h-4 w-4 mr-2" /> Add Class</Button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search classes..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg">No classes found</h3>
            <p className="text-muted-foreground text-sm mt-1">{search ? "Try adjusting your search" : "Create your first class"}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((cls) => (
            <Card key={cls.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/classes/${cls.id}`)}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <Badge variant="outline" className={statusColors[cls.status] || ""}>{cls.status}</Badge>
                  <Badge variant="secondary" className="text-xs">{cls.owner_type}</Badge>
                </div>
                <h3 className="font-semibold truncate">{cls.english_title}</h3>
                {cls.chinese_title_traditional && <p className="text-sm text-muted-foreground font-chinese truncate">{cls.chinese_title_traditional}</p>}
                <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                  {cls.enrollment_start && <span>Enroll: {cls.enrollment_start}</span>}
                  <span>Mode: {cls.approval_mode}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClassList;
