
-- Create enum types
CREATE TYPE public.app_role AS ENUM ('super_admin', 'church_admin', 'member');
CREATE TYPE public.church_status AS ENUM ('pending', 'active', 'inactive', 'disabled', 'archived');
CREATE TYPE public.member_status AS ENUM ('active', 'inactive', 'disabled', 'pending');
CREATE TYPE public.class_status AS ENUM ('draft', 'published', 'archived', 'cancelled');
CREATE TYPE public.enrollment_status AS ENUM ('pending', 'approved', 'rejected', 'withdrawn', 'completed');
CREATE TYPE public.class_owner_type AS ENUM ('platform', 'church');
CREATE TYPE public.approval_mode AS ENUM ('auto', 'manual');
CREATE TYPE public.material_type AS ENUM ('document', 'video', 'audio', 'link', 'image');

-- ============================================================
-- CHURCHES
-- ============================================================
CREATE TABLE public.churches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  english_name TEXT NOT NULL,
  chinese_name_traditional TEXT,
  contact_person TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  district_or_address TEXT,
  logo_url TEXT,
  status public.church_status NOT NULL DEFAULT 'pending',
  theme_color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PROFILES (linked to auth.users)
-- ============================================================
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  english_name TEXT NOT NULL,
  chinese_name_traditional TEXT,
  gender TEXT,
  date_of_birth DATE,
  phone TEXT,
  email TEXT,
  church_id UUID REFERENCES public.churches(id),
  status public.member_status NOT NULL DEFAULT 'active',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- USER ROLES (separate table, not on profiles)
-- ============================================================
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- ============================================================
-- SECURITY DEFINER FUNCTIONS (prevent RLS recursion)
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_church_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT church_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- ============================================================
-- CLASSES
-- ============================================================
CREATE TABLE public.classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  english_title TEXT NOT NULL,
  chinese_title_traditional TEXT,
  english_description TEXT,
  chinese_description_traditional TEXT,
  owner_type public.class_owner_type NOT NULL DEFAULT 'platform',
  owner_church_id UUID REFERENCES public.churches(id),
  status public.class_status NOT NULL DEFAULT 'draft',
  enrollment_start DATE,
  enrollment_end DATE,
  access_start DATE,
  access_end DATE,
  approval_mode public.approval_mode NOT NULL DEFAULT 'manual',
  retake_policy TEXT DEFAULT 'not_allowed',
  min_age INT,
  max_age INT,
  gender_requirement TEXT,
  prerequisites TEXT,
  max_enrollment INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- CLASS-CHURCH ASSIGNMENTS
-- ============================================================
CREATE TABLE public.class_church_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(class_id, church_id)
);

-- ============================================================
-- ENROLLMENTS
-- ============================================================
CREATE TABLE public.enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  church_id UUID NOT NULL REFERENCES public.churches(id),
  status public.enrollment_status NOT NULL DEFAULT 'pending',
  advisory_result TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- MATERIALS
-- ============================================================
CREATE TABLE public.materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  english_title TEXT NOT NULL,
  chinese_title_traditional TEXT,
  type public.material_type NOT NULL DEFAULT 'document',
  file_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ANNOUNCEMENTS
-- ============================================================
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id UUID REFERENCES public.churches(id),
  english_title TEXT NOT NULL,
  chinese_title_traditional TEXT,
  english_content TEXT,
  chinese_content_traditional TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  author_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'general',
  english_title TEXT,
  chinese_title_traditional TEXT,
  english_message TEXT,
  chinese_message_traditional TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  reference_type TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- FAVORITE BOOKMARKS
-- ============================================================
CREATE TABLE public.favorite_bookmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, entity_type, entity_id)
);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply updated_at triggers
CREATE TRIGGER update_churches_updated_at BEFORE UPDATE ON public.churches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON public.classes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_enrollments_updated_at BEFORE UPDATE ON public.enrollments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON public.materials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, english_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'english_name', NEW.email), NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- CHURCHES
ALTER TABLE public.churches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can do everything with churches"
  ON public.churches FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Church admins can view their own church"
  ON public.churches FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'church_admin') AND id = public.get_user_church_id(auth.uid()));

CREATE POLICY "Church admins can update their own church"
  ON public.churches FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'church_admin') AND id = public.get_user_church_id(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'church_admin') AND id = public.get_user_church_id(auth.uid()));

CREATE POLICY "Members can view their own church"
  ON public.churches FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'member') AND id = public.get_user_church_id(auth.uid()));

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can do everything with profiles"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Church admins can view profiles in their church"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'church_admin') AND church_id = public.get_user_church_id(auth.uid()));

CREATE POLICY "Church admins can update profiles in their church"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'church_admin') AND church_id = public.get_user_church_id(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'church_admin') AND church_id = public.get_user_church_id(auth.uid()));

CREATE POLICY "Church admins can insert profiles in their church"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'church_admin') AND church_id = public.get_user_church_id(auth.uid()));

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- USER ROLES
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can do everything with roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- CLASSES
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can do everything with classes"
  ON public.classes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Church admins can view classes assigned to their church"
  ON public.classes FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'church_admin') AND (
      owner_type = 'platform' OR
      owner_church_id = public.get_user_church_id(auth.uid()) OR
      EXISTS (SELECT 1 FROM public.class_church_assignments WHERE class_id = id AND church_id = public.get_user_church_id(auth.uid()))
    )
  );

CREATE POLICY "Church admins can manage their own church classes"
  ON public.classes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'church_admin') AND owner_church_id = public.get_user_church_id(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'church_admin') AND owner_church_id = public.get_user_church_id(auth.uid()));

CREATE POLICY "Members can view classes assigned to their church"
  ON public.classes FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'member') AND
    status = 'published' AND
    EXISTS (SELECT 1 FROM public.class_church_assignments WHERE class_id = id AND church_id = public.get_user_church_id(auth.uid()))
  );

-- CLASS_CHURCH_ASSIGNMENTS
ALTER TABLE public.class_church_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can do everything with class assignments"
  ON public.class_church_assignments FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Church admins can view assignments for their church"
  ON public.class_church_assignments FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'church_admin') AND church_id = public.get_user_church_id(auth.uid()));

-- ENROLLMENTS
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can do everything with enrollments"
  ON public.enrollments FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Church admins can manage enrollments in their church"
  ON public.enrollments FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'church_admin') AND church_id = public.get_user_church_id(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'church_admin') AND church_id = public.get_user_church_id(auth.uid()));

CREATE POLICY "Members can view own enrollments"
  ON public.enrollments FOR SELECT
  TO authenticated
  USING (member_id = auth.uid());

CREATE POLICY "Members can create own enrollments"
  ON public.enrollments FOR INSERT
  TO authenticated
  WITH CHECK (member_id = auth.uid() AND public.has_role(auth.uid(), 'member'));

-- MATERIALS
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can do everything with materials"
  ON public.materials FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Authenticated users can view published materials"
  ON public.materials FOR SELECT
  TO authenticated
  USING (is_published = true);

-- ANNOUNCEMENTS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can do everything with announcements"
  ON public.announcements FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Church admins can manage their church announcements"
  ON public.announcements FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'church_admin') AND church_id = public.get_user_church_id(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'church_admin') AND church_id = public.get_user_church_id(auth.uid()));

CREATE POLICY "Members can view published announcements for their church"
  ON public.announcements FOR SELECT
  TO authenticated
  USING (
    is_published = true AND (
      church_id IS NULL OR
      church_id = public.get_user_church_id(auth.uid())
    )
  );

-- NOTIFICATIONS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- AUDIT LOGS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view all audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Church admins can view audit logs for their church entities"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'church_admin'));

CREATE POLICY "Anyone authenticated can insert audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- FAVORITE BOOKMARKS
ALTER TABLE public.favorite_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own bookmarks"
  ON public.favorite_bookmarks FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- STORAGE BUCKET FOR CHURCH LOGOS
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('church-logos', 'church-logos', true);

CREATE POLICY "Anyone can view church logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'church-logos');

CREATE POLICY "Authenticated users can upload church logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'church-logos');

CREATE POLICY "Authenticated users can update church logos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'church-logos');

CREATE POLICY "Authenticated users can delete church logos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'church-logos');

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_profiles_church_id ON public.profiles(church_id);
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_classes_owner_church_id ON public.classes(owner_church_id);
CREATE INDEX idx_class_church_assignments_class_id ON public.class_church_assignments(class_id);
CREATE INDEX idx_class_church_assignments_church_id ON public.class_church_assignments(church_id);
CREATE INDEX idx_enrollments_member_id ON public.enrollments(member_id);
CREATE INDEX idx_enrollments_class_id ON public.enrollments(class_id);
CREATE INDEX idx_enrollments_church_id ON public.enrollments(church_id);
CREATE INDEX idx_materials_class_id ON public.materials(class_id);
CREATE INDEX idx_announcements_church_id ON public.announcements(church_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_favorite_bookmarks_user_id ON public.favorite_bookmarks(user_id);
