import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BellRing, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const Notifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setNotifications(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchNotifications(); }, [user]);

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    toast({ title: "All notifications marked as read / 所有通知已標記為已讀" });
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications / 通知</h1>
          <p className="text-muted-foreground text-sm">{unreadCount > 0 ? `${unreadCount} unread / ${unreadCount} 則未讀` : "All caught up / 全部已讀"}</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}><Check className="h-4 w-4 mr-1" /> Mark All Read</Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <BellRing className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg">No notifications</h3>
            <p className="text-muted-foreground text-sm mt-1">You'll be notified about enrollment updates and announcements.</p>
            <p className="text-muted-foreground text-xs font-chinese mt-0.5">報名更新和公告將在此通知您。</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {notifications.map((n) => (
            <Card key={n.id} className={n.is_read ? "opacity-60" : ""}>
              <CardContent className="flex items-center gap-4 py-3">
                {!n.is_read && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{n.english_title || n.type}</p>
                  {n.chinese_title_traditional && <p className="text-xs text-muted-foreground font-chinese">{n.chinese_title_traditional}</p>}
                  {n.english_message && <p className="text-xs text-muted-foreground mt-0.5">{n.english_message}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(n.created_at).toLocaleDateString()}</span>
                  {!n.is_read && <Button size="sm" variant="ghost" onClick={() => markAsRead(n.id)}><Check className="h-3 w-3" /></Button>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
