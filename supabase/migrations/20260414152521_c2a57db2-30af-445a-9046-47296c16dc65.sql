ALTER TYPE public.class_status ADD VALUE IF NOT EXISTS 'open' AFTER 'published';
ALTER TYPE public.class_status ADD VALUE IF NOT EXISTS 'closed' AFTER 'open';