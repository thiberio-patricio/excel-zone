CREATE TABLE public.ai_scheduler_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid,
  run_type text NOT NULL,
  trigger_source text NOT NULL DEFAULT 'cron',
  status text NOT NULL DEFAULT 'sucesso',
  message text,
  analyses_generated integer NOT NULL DEFAULT 0,
  notifications_created integer NOT NULL DEFAULT 0,
  duration_ms integer NOT NULL DEFAULT 0,
  details jsonb,
  executed_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ai_scheduler_logs TO authenticated;
GRANT ALL ON public.ai_scheduler_logs TO service_role;

ALTER TABLE public.ai_scheduler_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ver logs do agendador"
ON public.ai_scheduler_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_ai_scheduler_logs_executed_at ON public.ai_scheduler_logs (executed_at DESC);

ALTER TABLE public.ai_notification_settings
  ADD COLUMN IF NOT EXISTS weekly_weekday integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS monthly_day integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  ADD COLUMN IF NOT EXISTS last_daily_run_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS last_weekly_run_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS last_monthly_run_at timestamp with time zone;