-- Migration: novas_tabelas
-- Cria: artigos, distintivos, usuario_distintivos, notificacoes, metas_diarias, cache_progresso
-- Adiciona: questoes.explicacao

-- 1. Adicionar coluna explicacao em questoes
ALTER TABLE questoes ADD COLUMN IF NOT EXISTS explicacao text;

-- 2. artigos
CREATE TABLE IF NOT EXISTS artigos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo text NOT NULL,
    conteudo text NOT NULL,
    resumo text,
    imagem_capa text,
    autor_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    publicado boolean NOT NULL DEFAULT false,
    publicado_em timestamptz,
    criado_em timestamptz NOT NULL DEFAULT now(),
    atualizado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE artigos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "artigos: leitura para autenticados"
    ON artigos FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "artigos: professor e admin escrita"
    ON artigos FOR INSERT
    TO authenticated
    WITH CHECK (meu_role() = ANY (ARRAY['professor'::text, 'admin'::text]));

CREATE POLICY "artigos: professor e admin update"
    ON artigos FOR UPDATE
    TO authenticated
    USING (meu_role() = ANY (ARRAY['professor'::text, 'admin'::text]))
    WITH CHECK (meu_role() = ANY (ARRAY['professor'::text, 'admin'::text]));

CREATE POLICY "artigos: professor e admin delete"
    ON artigos FOR DELETE
    TO authenticated
    USING (meu_role() = ANY (ARRAY['professor'::text, 'admin'::text]));

-- 3. distintivos (catálogo de badges)
CREATE TABLE IF NOT EXISTS distintivos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nome text NOT NULL,
    descricao text,
    icone text,
    cor text,
    criterio text NOT NULL,
    criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE distintivos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "distintivos: leitura para autenticados"
    ON distintivos FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "distintivos: admin total"
    ON distintivos FOR ALL
    TO authenticated
    USING (meu_role() = 'admin'::text)
    WITH CHECK (meu_role() = 'admin'::text);

-- 4. usuario_distintivos (badges conquistados)
CREATE TABLE IF NOT EXISTS usuario_distintivos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    distintivo_id uuid NOT NULL REFERENCES distintivos(id) ON DELETE CASCADE,
    conquistado_em timestamptz NOT NULL DEFAULT now(),
    UNIQUE(usuario_id, distintivo_id)
);

ALTER TABLE usuario_distintivos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuario_distintivos: leitura para autenticados"
    ON usuario_distintivos FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "usuario_distintivos: insert proprio"
    ON usuario_distintivos FOR INSERT
    TO authenticated
    WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "usuario_distintivos: delete admin"
    ON usuario_distintivos FOR DELETE
    TO authenticated
    USING (meu_role() = 'admin'::text);

-- 5. notificacoes
CREATE TABLE IF NOT EXISTS notificacoes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo text NOT NULL,
    titulo text NOT NULL,
    mensagem text,
    dados jsonb,
    lida boolean NOT NULL DEFAULT false,
    criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario_lida ON notificacoes(usuario_id, lida);

ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notificacoes: select proprio"
    ON notificacoes FOR SELECT
    TO authenticated
    USING (usuario_id = auth.uid());

CREATE POLICY "notificacoes: insert sistema"
    ON notificacoes FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "notificacoes: update proprio"
    ON notificacoes FOR UPDATE
    TO authenticated
    USING (usuario_id = auth.uid())
    WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "notificacoes: delete admin"
    ON notificacoes FOR DELETE
    TO authenticated
    USING (meu_role() = 'admin'::text);

-- 6. metas_diarias
CREATE TABLE IF NOT EXISTS metas_diarias (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    data date NOT NULL,
    questoes_respondidas integer NOT NULL DEFAULT 0,
    questoes_meta integer NOT NULL DEFAULT 10,
    streak_atual integer NOT NULL DEFAULT 0,
    UNIQUE(usuario_id, data)
);

ALTER TABLE metas_diarias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "metas_diarias: select proprio"
    ON metas_diarias FOR SELECT
    TO authenticated
    USING (usuario_id = auth.uid());

CREATE POLICY "metas_diarias: insert proprio"
    ON metas_diarias FOR INSERT
    TO authenticated
    WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "metas_diarias: update proprio"
    ON metas_diarias FOR UPDATE
    TO authenticated
    USING (usuario_id = auth.uid())
    WITH CHECK (usuario_id = auth.uid());

-- 7. cache_progresso
CREATE TABLE IF NOT EXISTS cache_progresso (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    simulado_id uuid NOT NULL REFERENCES simulados(id) ON DELETE CASCADE,
    total_questoes integer NOT NULL,
    acertos integer NOT NULL,
    percentual numeric(5,2),
    atualizado_em timestamptz NOT NULL DEFAULT now(),
    UNIQUE(usuario_id, simulado_id)
);

ALTER TABLE cache_progresso ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cache_progresso: select proprio"
    ON cache_progresso FOR SELECT
    TO authenticated
    USING (usuario_id = auth.uid());

CREATE POLICY "cache_progresso: insert proprio"
    ON cache_progresso FOR INSERT
    TO authenticated
    WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "cache_progresso: update proprio"
    ON cache_progresso FOR UPDATE
    TO authenticated
    USING (usuario_id = auth.uid())
    WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "cache_progresso: delete proprio"
    ON cache_progresso FOR DELETE
    TO authenticated
    USING (usuario_id = auth.uid());
