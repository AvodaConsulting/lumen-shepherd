import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollText, Search } from "lucide-react";

const AuditLogList = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200).then(({ data }) => {
      setLogs(data || []);
      setLoading(false);
    });
  }, []);

  const filtered = logs.filter((l) =>
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.entity_type.toLowerCase().includes(search.toLowerCase())
  );

  const actionColors: Record<string, string> = {
    created: "bg-success/10 text-success",
    updated: "bg-primary/10 text-primary",
    approved: "bg-success/10 text-success",
    rejected: "bg-destructive/10 text-destructive",
  };

  const getActionColor = (action: string) => {
    for (const [key, value] of Object.entries(actionColors)) {
      if (action.includes(key)) return value;
    }
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit Logs / 審計日誌</h1>
        <p className="text-muted-foreground text-sm">Track all system activities</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search logs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ScrollText className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg">No audit logs</h3>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {filtered.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="flex items-center gap-4 py-3">
                <Badge variant="outline" className={getActionColor(entry.action)}>{entry.action}</Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{entry.entity_type} <span className="text-muted-foreground">#{entry.entity_id?.slice(0, 8)}</span></p>
                  {entry.details && <p className="text-xs text-muted-foreground truncate">{JSON.stringify(entry.details)}</p>}
                </div>
                <p className="text-xs text-muted-foreground whitespace-nowrap">{new Date(entry.created_at).toLocaleString()}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AuditLogList;
