import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";

const AnnouncementList = () => {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("announcements").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      setAnnouncements(data || []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Announcements / 公告</h1>
        <p className="text-muted-foreground text-sm">Platform and church announcements</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : announcements.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Bell className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg">No announcements</h3>
            <p className="text-muted-foreground text-sm mt-1">Announcements will appear here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {announcements.map((ann) => (
            <Card key={ann.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold">{ann.english_title}</h3>
                  <Badge variant={ann.is_published ? "default" : "secondary"}>{ann.is_published ? "Published" : "Draft"}</Badge>
                </div>
                {ann.chinese_title_traditional && <p className="text-sm text-muted-foreground font-chinese mb-2">{ann.chinese_title_traditional}</p>}
                {ann.english_content && <p className="text-sm">{ann.english_content}</p>}
                {ann.chinese_content_traditional && <p className="text-sm text-muted-foreground font-chinese mt-1">{ann.chinese_content_traditional}</p>}
                <p className="text-xs text-muted-foreground mt-3">{new Date(ann.created_at).toLocaleDateString()}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AnnouncementList;
