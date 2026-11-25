-- Novas funcionalidades: lista de sonhos e surpresas do dia
CREATE TABLE IF NOT EXISTS public.sonhos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  prioridade TEXT NOT NULL DEFAULT 'normal' CHECK (prioridade IN ('low','normal','high')),
  concluido BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.sonhos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso compartilhado aos sonhos" ON public.sonhos;
CREATE POLICY "Acesso compartilhado aos sonhos"
ON public.sonhos FOR ALL TO authenticated
USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.surpresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  ativa BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.surpresas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso compartilhado às surpresas" ON public.surpresas;
CREATE POLICY "Acesso compartilhado às surpresas"
ON public.surpresas FOR ALL TO authenticated
USING (true) WITH CHECK (true);