import { sb } from '../services/supabase.js';
import { esc, toast } from './ui.js';
import { getUsuario } from './auth.js';

export async function carregarBadges() {
  const uid = getUsuario()?.id;
  if (!uid) return [];

  const { data: userBadges } = await sb
    .from('usuario_distintivos')
    .select('*, distintivo:distintivo_id(*)')
    .eq('usuario_id', uid);

  return userBadges || [];
}

export async function verificarEConcederBadges() {
  const uid = getUsuario()?.id;
  if (!uid) return;

  const { data: todosBadges } = await sb.from('distintivos').select('*');

  if (!todosBadges?.length) return;

  const { data: existentes } = await sb
    .from('usuario_distintivos')
    .select('distintivo_id')
    .eq('usuario_id', uid);

  const jaTem = new Set((existentes || []).map((e) => e.distintivo_id));

  for (const badge of todosBadges) {
    if (jaTem.has(badge.id)) continue;
    const conceder = await verificarCriterio(badge.criterio, uid);
    if (conceder) {
      await sb.from('usuario_distintivos').insert({
        usuario_id: uid,
        distintivo_id: badge.id,
      });
      toast(`🏅 Novo distintivo: ${badge.nome}!`, 'success');
      await sb.from('notificacoes').insert({
        usuario_id: uid,
        tipo: 'distintivo',
        titulo: `Novo distintivo: ${badge.nome}`,
        mensagem: badge.descricao,
        dados: { distintivo_id: badge.id },
      });
    }
  }
}

async function verificarCriterio(criterio, uid) {
  switch (criterio) {
    case 'primeiro_simulado': {
      const { count } = await sb
        .from('tentativas_simulado')
        .select('*', { count: 'exact', head: true })
        .eq('usuario_id', uid)
        .eq('status', 'concluido');
      return (count || 0) >= 1;
    }
    case 'cinco_simulados': {
      const { count } = await sb
        .from('tentativas_simulado')
        .select('*', { count: 'exact', head: true })
        .eq('usuario_id', uid)
        .eq('status', 'concluido');
      return (count || 0) >= 5;
    }
    case 'cem_porcento': {
      const { data: tentativas } = await sb
        .from('tentativas_simulado')
        .select('respostas_parciais, simulado_id')
        .eq('usuario_id', uid)
        .eq('status', 'concluido');
      if (!tentativas?.length) return false;
      for (const t of tentativas) {
        const { data: questoes } = await sb
          .from('questoes')
          .select('id, correta')
          .eq('simulado_id', t.simulado_id);
        if (!questoes?.length) continue;
        const respostas = t.respostas_parciais || {};
        let acertos = 0;
        for (const q of questoes) {
          if (respostas[q.id] === q.correta) acertos++;
        }
        if (acertos === questoes.length) return true;
      }
      return false;
    }
    case 'dez_questoes_dia': {
      const hoje = new Date().toISOString().slice(0, 10);
      const { data: metas } = await sb
        .from('metas_diarias')
        .select('questoes_respondidas')
        .eq('usuario_id', uid)
        .eq('data', hoje)
        .single();
      return (metas?.questoes_respondidas || 0) >= 10;
    }
    case 'sete_dias_streak': {
      const { data: metas } = await sb
        .from('metas_diarias')
        .select('streak_atual')
        .eq('usuario_id', uid)
        .order('data', { ascending: false })
        .limit(1);
      return (metas?.[0]?.streak_atual || 0) >= 7;
    }
    case 'primeiro_desafio': {
      const { count } = await sb
        .from('logs')
        .select('*', { count: 'exact', head: true })
        .eq('usuario_id', uid)
        .eq('acao', 'concluiu_desafio');
      return (count || 0) >= 1;
    }
    case 'tres_artigos': {
      const { count } = await sb
        .from('logs')
        .select('*', { count: 'exact', head: true })
        .eq('usuario_id', uid)
        .eq('acao', 'leu_artigo');
      return (count || 0) >= 3;
    }
    case 'cinquenta_questoes': {
      const { data: tentativas } = await sb
        .from('tentativas_simulado')
        .select('respostas_parciais')
        .eq('usuario_id', uid)
        .eq('status', 'concluido');
      let total = 0;
      for (const t of tentativas || []) {
        total += Object.keys(t.respostas_parciais || {}).length;
      }
      return total >= 50;
    }
    default:
      return false;
  }
}

export async function atualizarMetaDiaria(quantas = 1) {
  const uid = getUsuario()?.id;
  if (!uid) return;

  const hoje = new Date().toISOString().slice(0, 10);

  const { data: existente } = await sb
    .from('metas_diarias')
    .select('*')
    .eq('usuario_id', uid)
    .eq('data', hoje)
    .single();

  if (existente) {
    const novoTotal = (existente.questoes_respondidas || 0) + quantas;
    await sb
      .from('metas_diarias')
      .update({ questoes_respondidas: novoTotal })
      .eq('id', existente.id);
  } else {
    let streak = 1;
    const ontem = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const { data: ontemMeta } = await sb
      .from('metas_diarias')
      .select('streak_atual')
      .eq('usuario_id', uid)
      .eq('data', ontem)
      .single();
    if (ontemMeta) {
      streak = (ontemMeta.streak_atual || 0) + 1;
    }
    await sb.from('metas_diarias').insert({
      usuario_id: uid,
      data: hoje,
      questoes_respondidas: quantas,
      questoes_meta: 10,
      streak_atual: streak,
    });
  }
}

export async function renderizarBadgesNoDashboard() {
  const badgesEl = document.getElementById('badges-grid');
  if (!badgesEl) return;

  const userBadges = await carregarBadges();
  const { data: todos } = await sb.from('distintivos').select('*');

  if (!todos?.length) {
    badgesEl.innerHTML = '<div class="empty-hint">Nenhum distintivo disponível</div>';
    return;
  }

  const userBadgeIds = new Set(userBadges.map((b) => b.distintivo_id));

  badgesEl.innerHTML = todos
    .map(
      (b) => `
    <div class="badge-item${userBadgeIds.has(b.id) ? ' badge-conquistado' : ' badge-bloqueado'}">
      <div class="badge-icon" style="color:${userBadgeIds.has(b.id) ? esc(b.cor || '#888') : '#555'}">${b.icone || '🏅'}</div>
      <div class="badge-nome">${esc(b.nome)}</div>
      <div class="badge-desc">${esc(b.descricao || '')}</div>
    </div>`
    )
    .join('');
}
