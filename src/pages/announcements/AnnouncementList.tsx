import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { Bell, Plus, Edit2, Trash2 } from "lucide-react";

const AnnouncementList = () => {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { isSuperAdmin, isChurchAdmin, user, profile } = useAuth();
  const { log } = useAuditLog();
  const [form, setForm] = useState({ english_title: "", chinese_title_traditional: "", english_content: "", chinese_content_traditional: "" });
  const [saving, setSaving] = useState(false);

  const fetchAnnouncements = async () => {
    const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
    setAnnouncements(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAnnouncements(); }, []);

  const resetForm = () => {
    setForm({ english_title: "", chinese_title_traditional: "", english_content: "", chinese_content_traditional: "" });
    setEditingId(null);
  };

  const handleCreate = async () => {
    if (!form.english_title) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      english_title: form.english_title,
      chinese_title_traditional: form.chinese_title_traditional || null,
      english_content: form.english_content || null,
      chinese_content_traditional: form.chinese_content_traditional || null,
      author_id: user?.id,
      church_id: isChurchAdmin ? profile?.church_id : null,
      is_published: true,
      published_at: new Date().toISOString(),
    };

    if (editingId) {
      const { error } = await supabase.from("announcements").update(payload).eq("id", editingId);
      setSaving(false);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        await log("announcement_updated", "announcement", editingId);
        toast({ title: "Announcement updated / 公告已更新" });
        resetForm();
        setOpen(false);
        fetchAnnouncements();
      }
    } else {
      const { data, error } = await supabase.from("announcements").insert(payload).select().single();
      setSaving(false);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        await log("announcement_created", "announcement", data.id);
        toast({ title: "Announcement created / 公告已建立" });
        resetForm();
        setOpen(false);
        fetchAnnouncements();
      }
    }
  };

  const handleEdit = (ann: any) => {
    setForm({
      english_title: ann.english_title,
      chinese_title_traditional: ann.chinese_title_traditional || "",
      english_content: ann.english_content || "",
      chinese_content_traditional: ann.chinese_content_traditional || "",
    });
    setEditingId(ann.id);
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (!error) {
      await log("announcement_deleted", "announcement", id);
      toast({ title: "Announcement deleted / 公告已刪除" });
      fetchAnnouncements();
    }
  };

  const handleTogglePublish = async (id: string, currentlyPublished: boolean) => {
    const { error } = await supabase.from("announcements").update({
      is_published: !currentlyPublished,
      published_at: !currentlyPublished ? new Date().toISOString() : null,
    }).eq("id", id);
    if (!error) {
      toast({ title: currentlyPublished ? "Unpublished / 已取消發佈" : "Published / 已發佈" });
      fetchAnnouncements();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Announcements / 公告</h1>
          <p className="text-muted-foreground text-sm">Platform and church announcements</p>
        </div>
        {(isSuperAdmin || isChurchAdmin) && (
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> New Announcement</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editingId ? "Edit Announcement / 編輯公告" : "Create Announcement / 建立公告"}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1"><Label>English Title *</Label><Input value={form.english_title} onChange={(e) => setForm({ ...form, english_title: e.target.value })} /></div>
                <div className="space-y-1"><Label>中文標題</Label><Input value={form.chinese_title_traditional} onChange={(e) => setForm({ ...form, chinese_title_traditional: e.target.value })} /></div>
                <div className="space-y-1"><Label>English Content</Label><Textarea value={form.english_content} onChange={(e) => setForm({ ...form, english_content: e.target.value })} rows={3} /></div>
                <div className="space-y-1"><Label>中文內容</Label><Textarea value={form.chinese_content_traditional} onChange={(e) => setForm({ ...form, chinese_content_traditional: e.target.value })} rows={3} /></div>
                <Button onClick={handleCreate} disabled={saving} className="w-full">{saving ? "Saving..." : editingId ? "Update / 更新" : "Create & Publish / 建立並發佈"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : announcements.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Bell className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg">No announcements</h3>
            <p className="text-muted-foreground text-sm mt-1">No announcements at this time. / 目前沒有公告。</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {announcements.map((ann) => (
            <Card key={ann.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">{ann.english_title}</h3>
                    {ann.chinese_title_traditional && <p className="text-sm text-muted-foreground font-chinese">{ann.chinese_title_traditional}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {ann.church_id ? <Badge variant="secondary" className="text-xs">Church</Badge> : <Badge variant="outline" className="text-xs">Platform</Badge>}
                    <Badge variant={ann.is_published ? "default" : "secondary"}>{ann.is_published ? "Published" : "Draft"}</Badge>
                  </div>
                </div>
                {ann.english_content && <p className="text-sm mt-2">{ann.english_content}</p>}
                {ann.chinese_content_traditional && <p className="text-sm text-muted-foreground font-chinese mt-1">{ann.chinese_content_traditional}</p>}
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-muted-foreground">{new Date(ann.created_at).toLocaleDateString()}</p>
                  {(isSuperAdmin || isChurchAdmin) && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(ann)}><Edit2 className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleTogglePublish(ann.id, ann.is_published)}>
                        {ann.is_published ? "Unpublish" : "Publish"}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete announcement? / 刪除公告？</AlertDialogTitle>
                            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel / 取消</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(ann.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete / 刪除</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AnnouncementList;
