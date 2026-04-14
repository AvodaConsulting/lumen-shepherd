
-- Create lessons table for class structure
CREATE TABLE public.lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  english_title TEXT NOT NULL,
  chinese_title_traditional TEXT,
  english_description TEXT,
  chinese_description_traditional TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add lesson_id to materials (nullable = class-level material)
ALTER TABLE public.materials ADD COLUMN lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE;

-- Enable RLS on lessons
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- Super admins full access to lessons
CREATE POLICY "Super admins can do everything with lessons"
ON public.lessons FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Church admins can manage lessons for their church's classes
CREATE POLICY "Church admins can manage lessons for their classes"
ON public.lessons FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'church_admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.classes
    WHERE classes.id = lessons.class_id
    AND classes.owner_church_id = get_user_church_id(auth.uid())
  )
)
WITH CHECK (
  has_role(auth.uid(), 'church_admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.classes
    WHERE classes.id = lessons.class_id
    AND classes.owner_church_id = get_user_church_id(auth.uid())
  )
);

-- Members can view published lessons
CREATE POLICY "Members can view published lessons"
ON public.lessons FOR SELECT TO authenticated
USING (
  is_published = true
  AND has_role(auth.uid(), 'member'::app_role)
);

-- Church admins can manage materials for their church's classes
CREATE POLICY "Church admins can manage materials for their classes"
ON public.materials FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'church_admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.classes
    WHERE classes.id = materials.class_id
    AND classes.owner_church_id = get_user_church_id(auth.uid())
  )
)
WITH CHECK (
  has_role(auth.uid(), 'church_admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.classes
    WHERE classes.id = materials.class_id
    AND classes.owner_church_id = get_user_church_id(auth.uid())
  )
);

-- Trigger for updated_at on lessons
CREATE TRIGGER update_lessons_updated_at
BEFORE UPDATE ON public.lessons
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index for performance
CREATE INDEX idx_lessons_class_id ON public.lessons(class_id);
CREATE INDEX idx_materials_lesson_id ON public.materials(lesson_id);
