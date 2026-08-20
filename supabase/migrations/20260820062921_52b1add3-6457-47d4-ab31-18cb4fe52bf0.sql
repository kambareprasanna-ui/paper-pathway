CREATE TYPE public.app_role AS ENUM ('hod','dqc','designer','coord');
CREATE TYPE public.year_level AS ENUM ('SY','TY','LY');
CREATE TYPE public.account_status AS ENUM ('pending','active','rejected');
CREATE TYPE public.assignment_status AS ENUM ('assigned','in_review','approved','returned');
CREATE TYPE public.paper_status AS ENUM ('draft','submitted','in_review','approved','returned');
CREATE TYPE public.notification_type AS ENUM ('assignment','decision','reminder','approval');

CREATE TABLE public.institutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.institutions TO anon;
GRANT SELECT ON public.institutions TO authenticated;
GRANT ALL ON public.institutions TO service_role;
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "institutions readable" ON public.institutions FOR SELECT USING (true);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  institution_id uuid REFERENCES public.institutions(id),
  department text NOT NULL DEFAULT '',
  account_status public.account_status NOT NULL DEFAULT 'pending',
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.my_institution()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT institution_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.my_department()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT department FROM public.profiles WHERE id = auth.uid();
$$;

CREATE POLICY "own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "same institution profiles" ON public.profiles FOR SELECT TO authenticated
  USING (institution_id = public.my_institution());
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "hod manages department profiles" ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'hod') AND institution_id = public.my_institution())
  WITH CHECK (public.has_role(auth.uid(),'hod') AND institution_id = public.my_institution());

CREATE POLICY "own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "hod reads roles" ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'hod'));
CREATE POLICY "hod writes roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'hod'));
CREATE POLICY "hod deletes roles" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'hod'));

CREATE TABLE public.dqc_scopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year_level public.year_level NOT NULL,
  UNIQUE (user_id, year_level)
);
GRANT SELECT, INSERT, DELETE ON public.dqc_scopes TO authenticated;
GRANT ALL ON public.dqc_scopes TO service_role;
ALTER TABLE public.dqc_scopes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own scopes" ON public.dqc_scopes FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "hod reads scopes" ON public.dqc_scopes FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'hod'));
CREATE POLICY "hod writes scopes" ON public.dqc_scopes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'hod'));
CREATE POLICY "hod removes scopes" ON public.dqc_scopes FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'hod'));

CREATE TABLE public.academic_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true
);
GRANT SELECT ON public.academic_years TO anon, authenticated;
GRANT ALL ON public.academic_years TO service_role;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
CREATE POLICY "years readable" ON public.academic_years FOR SELECT USING (true);

CREATE TABLE public.semesters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id uuid NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  year_level public.year_level NOT NULL,
  label text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (academic_year_id, label)
);
GRANT SELECT ON public.semesters TO anon, authenticated;
GRANT ALL ON public.semesters TO service_role;
ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "semesters readable" ON public.semesters FOR SELECT USING (true);

CREATE TABLE public.papers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES public.institutions(id),
  department text NOT NULL DEFAULT '',
  course_code text NOT NULL DEFAULT '',
  course_name text NOT NULL,
  class_name text NOT NULL DEFAULT '',
  year_level public.year_level,
  academic_year_id uuid REFERENCES public.academic_years(id),
  semester_id uuid REFERENCES public.semesters(id),
  exam_type text NOT NULL DEFAULT 'End Semester',
  duration_minutes int NOT NULL DEFAULT 180,
  max_marks int NOT NULL DEFAULT 100,
  course_outcomes jsonb NOT NULL DEFAULT '[]'::jsonb,
  sets jsonb NOT NULL DEFAULT '[]'::jsonb,
  status public.paper_status NOT NULL DEFAULT 'draft',
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  finalized_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.papers TO authenticated;
GRANT ALL ON public.papers TO service_role;
ALTER TABLE public.papers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "papers in my institution" ON public.papers FOR SELECT TO authenticated
  USING (institution_id = public.my_institution());
CREATE POLICY "create own paper" ON public.papers FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND institution_id = public.my_institution());
CREATE POLICY "edit own paper" ON public.papers FOR UPDATE TO authenticated
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "delete own draft" ON public.papers FOR DELETE TO authenticated
  USING (created_by = auth.uid() AND status = 'draft');

CREATE TABLE public.paper_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id uuid NOT NULL REFERENCES public.papers(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id),
  assigned_to uuid REFERENCES auth.users(id),
  year_level public.year_level,
  academic_year_id uuid REFERENCES public.academic_years(id),
  semester_id uuid REFERENCES public.semesters(id),
  status public.assignment_status NOT NULL DEFAULT 'assigned',
  is_primary boolean NOT NULL DEFAULT true,
  due_at timestamptz,
  submitted_at timestamptz,
  decided_at timestamptz,
  note text,
  reminder_count int NOT NULL DEFAULT 0,
  last_reminded_at timestamptz,
  last_reminded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.paper_assignments TO authenticated;
GRANT ALL ON public.paper_assignments TO service_role;
ALTER TABLE public.paper_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assignment visibility" ON public.paper_assignments FOR SELECT TO authenticated
  USING (
    assigned_to = auth.uid()
    OR assigned_by = auth.uid()
    OR public.has_role(auth.uid(),'hod')
    OR public.has_role(auth.uid(),'coord')
    OR EXISTS (SELECT 1 FROM public.papers p WHERE p.id = paper_id AND p.created_by = auth.uid())
  );
CREATE POLICY "create assignment" ON public.paper_assignments FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(),'hod')
    OR EXISTS (SELECT 1 FROM public.papers p WHERE p.id = paper_id AND p.created_by = auth.uid())
  );
CREATE POLICY "update assignment" ON public.paper_assignments FOR UPDATE TO authenticated
  USING (assigned_to = auth.uid() OR public.has_role(auth.uid(),'hod') OR public.has_role(auth.uid(),'coord'))
  WITH CHECK (true);

CREATE POLICY "reviewers update assigned papers" ON public.papers FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.paper_assignments a WHERE a.paper_id = papers.id AND a.assigned_to = auth.uid()))
  WITH CHECK (true);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.notification_type NOT NULL DEFAULT 'assignment',
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update own notifications" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inst uuid;
BEGIN
  SELECT id INTO inst FROM public.institutions
   WHERE code = NEW.raw_user_meta_data->>'institution_code' LIMIT 1;
  INSERT INTO public.profiles (id, email, full_name, institution_id, department, account_status)
  VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name',''),
    inst,
    COALESCE(NEW.raw_user_meta_data->>'department',''),
    'pending'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'designer') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_faculty_status(_user_id uuid, _status public.account_status)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'hod') THEN
    RAISE EXCEPTION 'Only an HOD can approve faculty';
  END IF;
  UPDATE public.profiles
     SET account_status = _status, approved_by = auth.uid(), approved_at = now()
   WHERE id = _user_id AND institution_id = public.my_institution();
  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (_user_id, 'approval',
    CASE WHEN _status = 'active' THEN 'Account approved' ELSE 'Account rejected' END,
    CASE WHEN _status = 'active' THEN 'Your Paper Path account has been approved. You can now create papers.'
         ELSE 'Your Paper Path account request was rejected.' END,
    '/designer');
END; $$;

INSERT INTO public.institutions (code, name) VALUES
 ('KJSIT','K. J. Somaiya Institute of Technology'),
 ('KJSCE','K. J. Somaiya College of Engineering'),
 ('KJSSE','K. J. Somaiya School of Engineering');

INSERT INTO public.academic_years (label, is_active) VALUES ('2026-27', true), ('2025-26', false);

INSERT INTO public.semesters (academic_year_id, year_level, label)
SELECT y.id, v.lvl::public.year_level, v.lbl
FROM public.academic_years y
CROSS JOIN (VALUES ('SY','III'),('SY','IV'),('TY','V'),('TY','VI'),('LY','VII'),('LY','VIII')) AS v(lvl,lbl);