REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM anon;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO postgres;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO service_role;