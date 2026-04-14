import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { Plus, GripVertical, Edit2, Trash2, ChevronDown, ChevronRight, Eye, EyeOff, Save, X } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import MaterialsManager from "./MaterialsManager";

interface Lesson {
  id: string;
  class_id: string;
  english_title: string;
  chinese_title_traditional: string | null;
  english_description: string | null;
  chinese_description_traditional: string | null;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

interface LessonsManagerProps {
  classId: string;
  lessons: Lesson[];
  onLessonsChange: (lessons: Lesson[]) => void;
  materials: any[];
  onMaterialsChange: (materials: any[]) => void;
  canEdit: boolean;
}

const LessonsManager = ({ classId, lessons, onLessonsChange, materials, onMaterialsChange, canEdit }: LessonsManagerProps) => {
  const { log } = useAuditLog();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    english_title: "",
    chinese_title_traditional: "",
    english_description: "",
    chinese_description_traditional: "",
  });

  const resetForm = () => {
    setForm({ english_title: "", chinese_title_traditional: "", english_description: "", chinese_description_traditional: "" });
  };

  const handleAdd = async () => {
    if (!form.english_title.trim()) {
      toast({ title: "Title is required / 標題為必填", variant: "destructive" });
      return;
    }
    setSaving(true);
    const nextOrder = lessons.length > 0 ? Math.max(...lessons.map((l) => l.sort_order)) + 1 : 0;
    const { data, error } = await supabase.from("lessons").insert({
      class_id: classId,
      english_title: form.english_title.trim(),
      chinese_title_traditional: form.chinese_title_traditional.trim() || null,
      english_description: form.english_description.trim() || null,
      chinese_description_traditional: form.chinese_description_traditional.trim() || null,
      sort_order: nextOrder,
    }).select().single();
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      await log("lesson_created", "lesson", data.id, { english_title: form.english_title });
      onLessonsChange([...lessons, data]);
      resetForm();
      setAdding(false);
      toast({ title: "Lesson added / 課堂已新增" });
    }
  };

  const handleUpdate = async (lessonId: string) => {
    if (!form.english_title.trim()) {
      toast({ title: "Title is required / 標題為必填", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("lessons").update({
      english_title: form.english_title.trim(),
      chinese_title_traditional: form.chinese_title_traditional.trim() || null,
      english_description: form.english_description.trim() || null,
      chinese_description_traditional: form.chinese_description_traditional.trim() || null,
    }).eq("id", lessonId);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      await log("lesson_updated", "lesson", lessonId);
      onLessonsChange(lessons.map((l) => l.id === lessonId ? { ...l, ...form, chinese_title_traditional: form.chinese_title_traditional || null, english_description: form.english_description || null, chinese_description_traditional: form.chinese_description_traditional || null } : l));
      setEditingId(null);
      toast({ title: "Lesson updated / 課堂已更新" });
    }
  };

  const handleDelete = async (lessonId: string) => {
    const { error } = await supabase.from("lessons").delete().eq("id", lessonId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      await log("lesson_deleted", "lesson", lessonId);
      onLessonsChange(lessons.filter((l) => l.id !== lessonId));
      // Remove materials for this lesson from local state
      onMaterialsChange(materials.filter((m) => m.lesson_id !== lessonId));
      toast({ title: "Lesson deleted / 課堂已刪除" });
    }
  };

  const handleTogglePublish = async (lesson: Lesson) => {
    const newValue = !lesson.is_published;
    const { error } = await supabase.from("lessons").update({ is_published: newValue }).eq("id", lesson.id);
    if (!error) {
      onLessonsChange(lessons.map((l) => l.id === lesson.id ? { ...l, is_published: newValue } : l));
      toast({ title: newValue ? "Lesson published / 課堂已發佈" : "Lesson unpublished / 課堂已取消發佈" });
    }
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= lessons.length) return;
    const sorted = [...lessons].sort((a, b) => a.sort_order - b.sort_order);
    const current = sorted[index];
    const target = sorted[targetIndex];
    // Swap sort_order
    await Promise.all([
      supabase.from("lessons").update({ sort_order: target.sort_order }).eq("id", current.id),
      supabase.from("lessons").update({ sort_order: current.sort_order }).eq("id", target.id),
    ]);
    const updated = lessons.map((l) => {
      if (l.id === current.id) return { ...l, sort_order: target.sort_order };
      if (l.id === target.id) return { ...l, sort_order: current.sort_order };
      return l;
    });
    onLessonsChange(updated);
  };

  const startEdit = (lesson: Lesson) => {
    setForm({
      english_title: lesson.english_title,
      chinese_title_traditional: lesson.chinese_title_traditional || "",
      english_description: lesson.english_description || "",
      chinese_description_traditional: lesson.chinese_description_traditional || "",
    });
    setEditingId(lesson.id);
  };

  const sortedLessons = [...lessons].sort((a, b) => a.sort_order - b.sort_order);
  const classLevelMaterials = materials.filter((m) => !m.lesson_id);

  const LessonForm = ({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) => (
    <Card className="border-dashed border-primary/50">
      <CardContent className="pt-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">English Title * / 英文標題</Label>
            <Input value={form.english_title} onChange={(e) => setForm((f) => ({ ...f, english_title: e.target.value }))} placeholder="e.g. Lesson 1: Introduction" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">中文標題（繁體）</Label>
            <Input value={form.chinese_title_traditional} onChange={(e) => setForm((f) => ({ ...f, chinese_title_traditional: e.target.value }))} placeholder="例：第一課：簡介" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">English Description / 英文描述</Label>
          <Textarea value={form.english_description} onChange={(e) => setForm((f) => ({ ...f, english_description: e.target.value }))} rows={2} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">中文描述（繁體）</Label>
          <Textarea value={form.chinese_description_traditional} onChange={(e) => setForm((f) => ({ ...f, chinese_description_traditional: e.target.value }))} rows={2} />
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={onSave} disabled={saving}><Save className="h-3.5 w-3.5 mr-1" />{saving ? "Saving..." : "Save / 儲存"}</Button>
          <Button size="sm" variant="outline" onClick={onCancel}><X className="h-3.5 w-3.5 mr-1" />Cancel / 取消</Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      {/* Class-level materials */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Class-Level Materials / 課程總教材</CardTitle>
          <p className="text-xs text-muted-foreground">Materials that apply to the entire class, not a specific lesson. / 適用於整個課程的教材。</p>
        </CardHeader>
        <CardContent>
          <MaterialsManager
            classId={classId}
            lessonId={null}
            materials={classLevelMaterials}
            onMaterialsChange={(updated) => {
              const lessonMats = materials.filter((m) => m.lesson_id);
              onMaterialsChange([...lessonMats, ...updated]);
            }}
            canEdit={canEdit}
          />
        </CardContent>
      </Card>

      {/* Lessons */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Lessons / 課堂 ({sortedLessons.length})</h3>
          <p className="text-xs text-muted-foreground">Organize your class into lessons with their own materials. / 將課程組織為多個課堂，每個課堂可有自己的教材。</p>
        </div>
        {canEdit && !adding && (
          <Button size="sm" onClick={() => { resetForm(); setAdding(true); }}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Lesson / 新增課堂
          </Button>
        )}
      </div>

      {sortedLessons.length === 0 && !adding && (
        <div className="text-center py-8 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
          No lessons yet. Add your first lesson to structure this class. / 尚無課堂。新增第一個課堂來組織此課程。
        </div>
      )}

      {sortedLessons.map((lesson, index) => {
        const lessonMaterials = materials.filter((m) => m.lesson_id === lesson.id);
        const isEditing = editingId === lesson.id;
        const isExpanded = expandedId === lesson.id;

        return (
          <Collapsible key={lesson.id} open={isExpanded} onOpenChange={(open) => setExpandedId(open ? lesson.id : null)}>
            <Card className={`transition-colors ${isExpanded ? "border-primary/30" : ""}`}>
              <div className="flex items-center gap-2 px-4 py-3">
                {canEdit && (
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => handleMove(index, "up")} disabled={index === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30 p-0.5"><GripVertical className="h-3 w-3" /></button>
                  </div>
                )}
                <CollapsibleTrigger className="flex items-center gap-2 flex-1 text-left">
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">#{index + 1}</span>
                      <span className="font-medium text-sm truncate">{lesson.english_title}</span>
                      {lesson.chinese_title_traditional && (
                        <span className="text-xs text-muted-foreground font-chinese truncate">{lesson.chinese_title_traditional}</span>
                      )}
                    </div>
                  </div>
                </CollapsibleTrigger>
                <div className="flex items-center gap-1.5">
                  <Badge variant={lesson.is_published ? "default" : "secondary"} className="text-[10px] h-5">
                    {lesson.is_published ? "Published" : "Draft"}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] h-5">{lessonMaterials.length} materials</Badge>
                  {canEdit && (
                    <>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleTogglePublish(lesson); }}>
                        {lesson.is_published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); startEdit(lesson); setExpandedId(lesson.id); }}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={(e) => e.stopPropagation()}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete lesson? / 刪除課堂？</AlertDialogTitle>
                            <AlertDialogDescription>This will delete the lesson and all its materials. This cannot be undone. / 將刪除課堂及其所有教材，無法復原。</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel / 取消</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(lesson.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete / 刪除</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </div>
              </div>

              <CollapsibleContent>
                <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                  {isEditing ? (
                    <LessonForm onSave={() => handleUpdate(lesson.id)} onCancel={() => setEditingId(null)} />
                  ) : (
                    <>
                      {(lesson.english_description || lesson.chinese_description_traditional) && (
                        <div className="text-sm text-muted-foreground">
                          {lesson.english_description && <p>{lesson.english_description}</p>}
                          {lesson.chinese_description_traditional && <p className="font-chinese mt-1">{lesson.chinese_description_traditional}</p>}
                        </div>
                      )}
                    </>
                  )}
                  <MaterialsManager
                    classId={classId}
                    lessonId={lesson.id}
                    materials={lessonMaterials}
                    onMaterialsChange={(updated) => {
                      const otherMats = materials.filter((m) => m.lesson_id !== lesson.id);
                      onMaterialsChange([...otherMats, ...updated]);
                    }}
                    canEdit={canEdit}
                  />
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}

      {adding && (
        <LessonForm onSave={handleAdd} onCancel={() => { setAdding(false); resetForm(); }} />
      )}
    </div>
  );
};

export default LessonsManager;
