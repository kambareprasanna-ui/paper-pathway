REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_institution() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_department() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_faculty_status(uuid, public.account_status) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_institution() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_department() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_faculty_status(uuid, public.account_status) TO authenticated;