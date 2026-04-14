-- Fix member RLS policy to show published, open, and closed classes
DROP POLICY IF EXISTS "Members can view classes assigned to their church" ON public.classes;
CREATE POLICY "Members can view classes assigned to their church"
  ON public.classes FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'member') AND
    status IN ('published', 'open', 'closed') AND
    (
      EXISTS (SELECT 1 FROM public.class_church_assignments WHERE class_church_assignments.class_id = classes.id AND class_church_assignments.church_id = public.get_user_church_id(auth.uid()))
      OR (owner_type = 'church' AND owner_church_id = public.get_user_church_id(auth.uid()))
    )
  );

-- Fix church admin class visibility to correctly join on classes.id
DROP POLICY IF EXISTS "Church admins can view classes assigned to their church" ON public.classes;
CREATE POLICY "Church admins can view classes assigned to their church"
  ON public.classes FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'church_admin') AND
    (
      owner_type = 'platform' OR
      owner_church_id = public.get_user_church_id(auth.uid()) OR
      EXISTS (SELECT 1 FROM public.class_church_assignments WHERE class_church_assignments.class_id = classes.id AND class_church_assignments.church_id = public.get_user_church_id(auth.uid()))
    )
  );