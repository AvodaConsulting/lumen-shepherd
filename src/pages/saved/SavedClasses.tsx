import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/StatusChip";
import { Heart, HeartOff, BookOpen } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const SavedClasses = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookmarks = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("favorite_bookmarks")
      .select("*, classes:entity_id(id, english_title, chinese_title_traditional, status)")
      .eq("user_id", user.id)
      .eq("entity_type", "class")
      .order("created_at", { ascending: false });
    setBookmarks(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchBookmarks(); }, [user]);

  const handleRemove = async (bookmarkId: string) => {
    await supabase.from("favorite_bookmarks").delete().eq("id", bookmarkId);
    toast({ title: "Removed from saved / 已取消收藏" });
    fetchBookmarks();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Saved Classes / 已收藏課程</h1>
        <p className="text-muted-foreground text-sm">Your bookmarked classes / 您收藏的課程</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : bookmarks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Heart className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg">No saved classes</h3>
            <p className="text-muted-foreground text-sm mt-1">Browse the class catalog and save classes you're interested in.</p>
            <p className="text-muted-foreground text-xs font-chinese mt-0.5">瀏覽課程目錄並收藏您感興趣的課程。</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/classes")}>Browse Classes / 瀏覽課程</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {bookmarks.map((b) => (
            <Card key={b.id}>
              <CardContent className="flex items-center gap-4 py-4">
                <BookOpen className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/classes/${b.entity_id}`)}>
                  <h3 className="font-semibold truncate">{b.classes?.english_title || "Unknown"}</h3>
                  {b.classes?.chinese_title_traditional && <p className="text-sm text-muted-foreground font-chinese truncate">{b.classes.chinese_title_traditional}</p>}
                </div>
                {b.classes?.status && <StatusChip status={b.classes.status} />}
                <Button size="icon" variant="ghost" onClick={() => handleRemove(b.id)}><HeartOff className="h-4 w-4 text-muted-foreground" /></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedClasses;
