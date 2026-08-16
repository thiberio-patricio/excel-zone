CREATE TABLE public.ai_recipients (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  cargo text NOT NULL DEFAULT 'diretor',
  telefone text NOT NULL,
  lojas uuid[] NOT NULL DEFAULT '{}',
  alert_types text[] NOT NULL DEFAULT '{diario,semanal,mensal,alertas}',
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_recipients TO authenticated;
GRANT ALL ON public.ai_recipients TO service_role;

ALTER TABLE public.ai_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins gerenciam destinatarios da IA"
ON public.ai_recipients FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_ai_recipients_updated_at
BEFORE UPDATE ON public.ai_recipients
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_whatsapp_messages_phone ON public.whatsapp_messages (recipient_phone);
CREATE INDEX idx_whatsapp_messages_created_at ON public.whatsapp_messages (created_at DESC);