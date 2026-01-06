-- Add restrictive RLS policies to audit_logs table to protect audit integrity

-- Prohibit direct INSERT operations (audit logs should only be created via SECURITY DEFINER triggers)
CREATE POLICY "Prevent direct audit log inserts"
ON public.audit_logs FOR INSERT
WITH CHECK (false);

-- Prohibit all UPDATE operations (audit logs should be immutable)
CREATE POLICY "Prevent audit log modifications"
ON public.audit_logs FOR UPDATE
USING (false);

-- Prohibit all DELETE operations (audit logs should be permanent)
CREATE POLICY "Prevent audit log deletions"
ON public.audit_logs FOR DELETE
USING (false);