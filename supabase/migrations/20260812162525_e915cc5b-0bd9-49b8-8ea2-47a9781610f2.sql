-- ai_assistants
CREATE TABLE public.ai_assistants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid,
  assistant_name text NOT NULL DEFAULT 'ANA',
  assistant_photo text,
  assistant_role text NOT NULL DEFAULT 'Assistente Virtual de Gestão de Vendas',
  tone text NOT NULL DEFAULT 'profissional',
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_assistants TO authenticated;
GRANT ALL ON public.ai_assistants TO service_role;
ALTER TABLE public.ai_assistants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins gerenciam assistentes" ON public.ai_assistants
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ai_notifications
CREATE TABLE public.ai_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid,
  store_id uuid REFERENCES public.filiais(id) ON DELETE SET NULL,
  recipient_name text NOT NULL,
  recipient_phone text NOT NULL,
  notification_type text NOT NULL,
  message text NOT NULL,
  sent_at timestamp with time zone,
  delivery_status text NOT NULL DEFAULT 'pendente',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_notifications TO authenticated;
GRANT ALL ON public.ai_notifications TO service_role;
ALTER TABLE public.ai_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins gerenciam notificacoes de IA" ON public.ai_notifications
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ai_notification_settings
CREATE TABLE public.ai_notification_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid,
  daily_report_enabled boolean NOT NULL DEFAULT true,
  weekly_report_enabled boolean NOT NULL DEFAULT true,
  monthly_report_enabled boolean NOT NULL DEFAULT true,
  sales_drop_alert boolean NOT NULL DEFAULT true,
  goal_risk_alert boolean NOT NULL DEFAULT true,
  ticket_average_alert boolean NOT NULL DEFAULT true,
  conversion_alert boolean NOT NULL DEFAULT false,
  stock_alert boolean NOT NULL DEFAULT false,
  ranking_alert boolean NOT NULL DEFAULT true,
  send_time time NOT NULL DEFAULT '08:00',
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_notification_settings TO authenticated;
GRANT ALL ON public.ai_notification_settings TO service_role;
ALTER TABLE public.ai_notification_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins gerenciam configuracoes de IA" ON public.ai_notification_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_ai_notification_settings_updated_at
  BEFORE UPDATE ON public.ai_notification_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ai_analysis_history
CREATE TABLE public.ai_analysis_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid,
  store_id uuid REFERENCES public.filiais(id) ON DELETE SET NULL,
  analysis_date date NOT NULL DEFAULT CURRENT_DATE,
  analysis_type text NOT NULL,
  generated_text text NOT NULL,
  generated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_analysis_history TO authenticated;
GRANT ALL ON public.ai_analysis_history TO service_role;
ALTER TABLE public.ai_analysis_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins gerenciam historico de analises" ON public.ai_analysis_history
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_ai_notifications_created_at ON public.ai_notifications (created_at DESC);
CREATE INDEX idx_ai_analysis_history_date ON public.ai_analysis_history (analysis_date DESC);