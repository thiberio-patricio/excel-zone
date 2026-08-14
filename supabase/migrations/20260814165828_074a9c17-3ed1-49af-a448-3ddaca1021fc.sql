CREATE TABLE public.whatsapp_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'evolution' CHECK (provider IN ('evolution','business')),
  base_url text,
  instance text,
  phone_number_id text,
  sender_label text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_name text NOT NULL,
  recipient_phone text NOT NULL,
  kind text NOT NULL DEFAULT 'texto' CHECK (kind IN ('texto','relatorio','pdf','imagem')),
  message text,
  media_url text,
  media_filename text,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','enviado','erro','falha')),
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  provider text,
  provider_message_id text,
  alert_id uuid,
  created_by uuid,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_whatsapp_messages_fila ON public.whatsapp_messages (status, next_attempt_at);

CREATE TABLE public.whatsapp_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES public.whatsapp_messages(id) ON DELETE CASCADE,
  attempt integer NOT NULL DEFAULT 1,
  status text NOT NULL,
  http_status integer,
  error text,
  response jsonb,
  executed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_whatsapp_logs_message ON public.whatsapp_logs (message_id, executed_at DESC);

CREATE TABLE public.ai_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  severity text NOT NULL DEFAULT 'atencao' CHECK (severity IN ('positivo','atencao','moderado','elevado')),
  store_id uuid REFERENCES public.filiais(id) ON DELETE CASCADE,
  store_name text,
  title text NOT NULL,
  message text NOT NULL,
  metrics jsonb,
  dedupe_key text UNIQUE,
  notified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_alerts_recentes ON public.ai_alerts (created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_config TO authenticated;
GRANT ALL ON public.whatsapp_config TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_messages TO authenticated;
GRANT ALL ON public.whatsapp_messages TO service_role;
GRANT SELECT ON public.whatsapp_logs TO authenticated;
GRANT ALL ON public.whatsapp_logs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_alerts TO authenticated;
GRANT ALL ON public.ai_alerts TO service_role;

ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins gerenciam config do whatsapp" ON public.whatsapp_config
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins gerenciam mensagens do whatsapp" ON public.whatsapp_messages
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins visualizam logs do whatsapp" ON public.whatsapp_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Diretores e admins visualizam alertas" ON public.ai_alerts
  FOR SELECT TO authenticated
  USING (public.is_diretor(auth.uid()));

CREATE POLICY "Admins gerenciam alertas" ON public.ai_alerts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_whatsapp_config_updated_at BEFORE UPDATE ON public.whatsapp_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_whatsapp_messages_updated_at BEFORE UPDATE ON public.whatsapp_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();