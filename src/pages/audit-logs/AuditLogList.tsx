import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusChip } from "@/components/StatusChip";
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit Logs / 審計日誌</h1>
        <p className="text-muted-foreground text-sm">Track all system activities / 追蹤所有系統活動</p>
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
            <p className="text-muted-foreground text-sm mt-1">No activity has been recorded yet. / 暫無活動記錄。</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {filtered.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="flex items-center gap-4 py-3">
                <StatusChip
                  status={
                    entry.action.includes("created") ? "active" :
                    entry.action.includes("approved") ? "approved" :
                    entry.action.includes("rejected") ? "rejected" :
                    entry.action.includes("updated") ? "published" :
                    "pending"
                  }
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{entry.action} — {entry.entity_type}</p>
                  {entry.entity_id && <p className="text-xs text-muted-foreground">ID: {entry.entity_id.slice(0, 8)}...</p>}
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
