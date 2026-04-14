import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, Church as ChurchIcon } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Church = Database["public"]["Tables"]["churches"]["Row"];

const statusColors: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  inactive: "bg-muted text-muted-foreground border-border",
  disabled: "bg-destructive/10 text-destructive border-destructive/20",
  archived: "bg-muted text-muted-foreground border-border",
};

const ChurchList = () => {
  const [churches, setChurches] = useState<Church[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const fetchChurches = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("churches")
      .select("*")
      .order("created_at", { ascending: false });
    setChurches(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchChurches(); }, []);

  const filtered = churches.filter(
    (c) =>
      c.english_name.toLowerCase().includes(search.toLowerCase()) ||
      (c.chinese_name_traditional || "").includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Churches / 教會</h1>
          <p className="text-muted-foreground text-sm">Manage all church accounts on the platform</p>
        </div>
        <Button onClick={() => navigate("/churches/new")}>
          <Plus className="h-4 w-4 mr-2" /> Add Church
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search churches..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ChurchIcon className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg">No churches found</h3>
            <p className="text-muted-foreground text-sm mt-1">
              {search ? "Try adjusting your search" : "Add your first church to get started"}
            </p>
            {!search && (
              <Button className="mt-4" onClick={() => navigate("/churches/new")}>
                <Plus className="h-4 w-4 mr-2" /> Add Church
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filtered.map((church) => (
            <Card
              key={church.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/churches/${church.id}`)}
            >
              <CardContent className="flex items-center gap-4 py-4">
                {church.logo_url ? (
                  <img src={church.logo_url} alt="" className="h-12 w-12 rounded-lg object-cover" />
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <ChurchIcon className="h-6 w-6 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{church.english_name}</h3>
                  {church.chinese_name_traditional && (
                    <p className="text-sm text-muted-foreground font-chinese truncate">
                      {church.chinese_name_traditional}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {church.contact_person} · {church.contact_email}
                  </p>
                </div>
                <Badge variant="outline" className={statusColors[church.status] || ""}>
                  {church.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChurchList;
