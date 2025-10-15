-- Remover a constraint de foreign key da tabela audit_logs
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_usuario_id_fkey;