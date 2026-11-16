-- Execute este arquivo no SQL Editor do Supabase.
-- Cria a tabela independente para os filmes assistidos pelo casal.

CREATE TABLE IF NOT EXISTS public.filmes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  ano integer,
  genero text,
  nota numeric(3,1) NOT NULL CHECK (nota >= 0 AND nota <= 10),
  data_assistido date,
  imagem_url text,
  apontamento text,
  cadastrado_por text NOT NULL DEFAULT 'Mateus'
    CHECK (cadastrado_por IN ('Mateus', 'Júlia')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.filmes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários autenticados podem ler filmes" ON public.filmes;
CREATE POLICY "Usuários autenticados podem ler filmes"
ON public.filmes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Usuários autenticados podem adicionar filmes" ON public.filmes;
CREATE POLICY "Usuários autenticados podem adicionar filmes"
ON public.filmes FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Usuários autenticados podem editar filmes" ON public.filmes;
CREATE POLICY "Usuários autenticados podem editar filmes"
ON public.filmes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Usuários autenticados podem excluir filmes" ON public.filmes;
CREATE POLICY "Usuários autenticados podem excluir filmes"
ON public.filmes FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS filmes_data_assistido_idx
ON public.filmes (data_assistido DESC);
