-- Tornar o campo usuario_id nullable temporariamente para permitir deleção
ALTER TABLE audit_logs ALTER COLUMN usuario_id DROP NOT NULL;

-- Adicionar um valor padrão para quando auth.uid() for NULL
CREATE OR REPLACE FUNCTION public.log_venda_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.audit_logs (usuario_id, acao, tabela, registro_id, dados_anteriores, dados_novos)
    VALUES (
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
      'UPDATE',
      'vendas',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
    NEW.editado_por = auth.uid();
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO public.audit_logs (usuario_id, acao, tabela, registro_id, dados_novos)
    VALUES (
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
      'INSERT',
      'vendas',
      NEW.id,
      to_jsonb(NEW)
    );
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO public.audit_logs (usuario_id, acao, tabela, registro_id, dados_anteriores)
    VALUES (
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
      'DELETE',
      'vendas',
      OLD.id,
      to_jsonb(OLD)
    );
  END IF;
  RETURN NEW;
END;
$function$;