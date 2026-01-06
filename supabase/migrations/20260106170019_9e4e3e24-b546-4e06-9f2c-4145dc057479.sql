-- Fix 1: Add SECURITY DEFINER to update_updated_at_column() function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- Fix 2: Make profile-photos bucket private for better data protection
UPDATE storage.buckets 
SET public = false 
WHERE id = 'profile-photos';