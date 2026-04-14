import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Edit2, Trash2, ExternalLink, Save, X, Eye, EyeOff, FileText, Video, Headphones, Link2, Image } from "lucide-react";

const typeIcons: Record<string, any> = {
  document: FileText,
  video: Video,
  audio: Headphones,
  link: Link2,
  image: Image,
};

const typeLabels: Record<string, string> = {
  document: "Document / 文件",
  video: "Video / 影片",
  audio: "Audio / 音訊",
  link: "Website / 網站",
  image: "Image / 圖片",
};

interface Material {
  id: string;
  class_id: string;
  lesson_id: string | null;
  english_title: string;
  chinese_title_traditional: string | null;
  type: string;
  file_url: string | null;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

interface MaterialsManagerProps {
  classId: string;
  lessonId: string | null;
  materials: Material[];
  onMaterialsChange: (materials: Material[]) => void;
  canEdit: boolean;
}

const MaterialsManager = ({ classId, lessonId, materials, onMaterialsChange, canEdit }: MaterialsManagerProps) => {
  const { log } = useAuditLog();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    english_title: "",
    chinese_title_traditional: "",
    type: "document",
    file_url: "",
  });

  const resetForm = () => setForm({ english_title: "", chinese_title_traditional: "", type: "document", file_url: "" });

  const handleAdd = async () => {
    if (!form.english_title.trim()) {
      toast({ title: "Title is required / 標題為必填", variant: "destructive" });
      return;
    }
    setSaving(true);
    const nextOrder = materials.length > 0 ? Math.max(...materials.map((m) => m.sort_order)) + 1 : 0;
    const insertData: any = {
      class_id: classId,
      lesson_id: lessonId,
      english_title: form.english_title.trim(),
      chinese_title_traditional: form.chinese_title_traditional.trim() || null,
      type: form.type,
      file_url: form.file_url.trim() || null,
      sort_order: nextOrder,
    };
    const { data, error } = await supabase.from("materials").insert(insertData).select().single();
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      await log("material_created", "material", data.id, { english_title: form.english_title });
      onMaterialsChange([...materials, data]);
      resetForm();
      setAdding(false);
      toast({ title: "Material added / 教材已新增" });
    }
  };

  const handleUpdate = async (materialId: string) => {
    if (!form.english_title.trim()) {
      toast({ title: "Title is required / 標題為必填", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("materials").update({
      english_title: form.english_title.trim(),
      chinese_title_traditional: form.chinese_title_traditional.trim() || null,
      type: form.type as any,
      file_url: form.file_url.trim() || null,
    }).eq("id", materialId);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      await log("material_updated", "material", materialId);
      onMaterialsChange(materials.map((m) => m.id === materialId ? {
        ...m,
        english_title: form.english_title.trim(),
        chinese_title_traditional: form.chinese_title_traditional.trim() || null,
        type: form.type,
        file_url: form.file_url.trim() || null,
      } : m));
      setEditingId(null);
      toast({ title: "Material updated / 教材已更新" });
    }
  };

  const handleDelete = async (materialId: string) => {
    const { error } = await supabase.from("materials").delete().eq("id", materialId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      await log("material_deleted", "material", materialId);
      onMaterialsChange(materials.filter((m) => m.id !== materialId));
      toast({ title: "Material deleted / 教材已刪除" });
    }
  };

  const handleTogglePublish = async (material: Material) => {
    const newValue = !material.is_published;
    const { error } = await supabase.from("materials").update({ is_published: newValue }).eq("id", material.id);
    if (!error) {
      onMaterialsChange(materials.map((m) => m.id === material.id ? { ...m, is_published: newValue } : m));
    }
  };

  const startEdit = (material: Material) => {
    setForm({
      english_title: material.english_title,
      chinese_title_traditional: material.chinese_title_traditional || "",
      type: material.type,
      file_url: material.file_url || "",
    });
    setEditingId(material.id);
  };

  const sorted = [...materials].sort((a, b) => a.sort_order - b.sort_order);

  const MaterialForm = ({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) => (
    <div className="border border-dashed border-primary/40 rounded-lg p-3 space-y-3 bg-muted/30">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">English Title * / 英文標題</Label>
          <Input value={form.english_title} onChange={(e) => setForm((f) => ({ ...f, english_title: e.target.value }))} placeholder="e.g. Chapter 1 Slides" className="h-8 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">中文標題（繁體）</Label>
          <Input value={form.chinese_title_traditional} onChange={(e) => setForm((f) => ({ ...f, chinese_title_traditional: e.target.value }))} className="h-8 text-sm" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Type / 類型</Label>
          <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(typeLabels).map(([val, label]) => (
                <SelectItem key={val} value={val}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">URL / 連結</Label>
          <Input value={form.file_url} onChange={(e) => setForm((f) => ({ ...f, file_url: e.target.value }))} placeholder="https://..." className="h-8 text-sm" />
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={onSave} disabled={saving} className="h-7 text-xs">
          <Save className="h-3 w-3 mr-1" />{saving ? "Saving..." : "Save / 儲存"}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} className="h-7 text-xs">
          <X className="h-3 w-3 mr-1" />Cancel / 取消
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-2">
      {sorted.length === 0 && !adding && !canEdit && (
        <p className="text-xs text-muted-foreground py-2">No materials. / 暫無教材。</p>
      )}

      {sorted.map((material) => {
        const Icon = typeIcons[material.type] || FileText;
        if (editingId === material.id) {
          return <MaterialForm key={material.id} onSave={() => handleUpdate(material.id)} onCancel={() => setEditingId(null)} />;
        }
        return (
          <div key={material.id} className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 group">
            <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm truncate">{material.english_title}</span>
              {material.chinese_title_traditional && <span className="text-xs text-muted-foreground font-chinese ml-1.5">{material.chinese_title_traditional}</span>}
            </div>
            <Badge variant="outline" className="text-[10px] h-5 shrink-0">{material.type}</Badge>
            {!material.is_published && <Badge variant="secondary" className="text-[10px] h-5">Draft</Badge>}
            {material.file_url && (
              <a href={material.file_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            {canEdit && (
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleTogglePublish(material)}>
                  {material.is_published ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => startEdit(material)}>
                  <Edit2 className="h-3 w-3" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive"><Trash2 className="h-3 w-3" /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete material? / 刪除教材？</AlertDialogTitle>
                      <AlertDialogDescription>This cannot be undone. / 無法復原。</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel / 取消</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(material.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete / 刪除</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        );
      })}

      {adding && <MaterialForm onSave={handleAdd} onCancel={() => { setAdding(false); resetForm(); }} />}

      {canEdit && !adding && (
        <Button size="sm" variant="outline" onClick={() => { resetForm(); setAdding(true); }} className="h-7 text-xs w-full border-dashed">
          <Plus className="h-3 w-3 mr-1" /> Add Material / 新增教材
        </Button>
      )}
    </div>
  );
};

export default MaterialsManager;
