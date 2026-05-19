-- Add 'admin' role to enum
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'admin';