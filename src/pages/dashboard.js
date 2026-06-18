import { sb } from '../services/supabase.js';
import { esc, tempoRelativo, emojiPorValor, toast } from './ui.js';
import { getUsuario, getPerfil } from './auth.js';
import { renderizarBadgesNoDashboard } from './gamificacao.js';

export async function carregarInicio() {
  document.getElementById('stats-grid').innerHTML = Array(3).fill(0).map(() =>
    '<div class="stat-card"><div class="skeleton" style="width:80px;height:12px;margin-bottom:12px;"></div><div style="display:flex;justify-content:space-between;"><div class="skeleton" style="width:60px;height:32px;"></div><div class="skeleton" style="width:56px;height:56px;border-radius:50%;"></div></div></div>'
  ).join('');
  document.getElementById('panel-logs').innerHTML = '<div class="skeleton" style="height:120px;margin-top:12px;"></div>';
  document.getElementById('panel-sims').innerHTML = '<div class="skeleton" style="height:120px;margin-top:12px;"></div>';

  await carregarStats();
  await carregarLogsRecentes();
  await carregarSimuladosQuick();
  await renderizarBadgesNoDashboard();
}

async function carregarStats() {
  const uid = getUsuario().id;
  const { data: tentativas, error: errTent } = await sb
    .from('tentativas_simulado')
    .select('id, advertencias, simulado_id, status, respostas_parciais')
    .eq('usuario_id', uid)
    .eq('status', 'concluido');
  if (errTent) console.warn('Erro ao carregar tentativas:', errTent);

  const totalFeitos = tentativas?.length || 0;

  let totalAcertos = 0;
  let totalQuestoes = 0;
  if (tentativas?.length) {
    const simIds = [...new Set(tentativas.map((t) => t.simulado_id))];
    const { data: todasQuestoes } = await sb
      .from('questoes')
      .select('id, simulado_id, correta')
      .in('simulado_id', simIds);
    const gabarito = {};
    if (todasQuestoes) {
      for (const q of todasQuestoes) {
        if (!gabarito[q.simulado_id]) gabarito[q.simulado_id] = {};
        gabarito[q.simulado_id][q.id] = q.correta;
      }
    }
    for (const t of tentativas) {
      const respostas = t.respostas_parciais || {};
      const questoesSimulado = gabarito[t.simulado_id] || {};
      for (const [qId, resposta] of Object.entries(respostas)) {
        totalQuestoes++;
        if (questoesSimulado[qId] === resposta) totalAcertos++;
      }
    }
  }
  const mediaGeral = totalQuestoes > 0 ? Math.round((totalAcertos / totalQuestoes) * 100) : 0;

  const totalAdv = tentativas?.reduce((acc, t) => acc + (t.advertencias || 0), 0) || 0;
  const maxAdv = totalFeitos * 5 || 1;
  const advPct = Math.min(100, Math.round((totalAdv / maxAdv) * 100));
  const { count: totalSims, error: errCount } = await sb.from('simulados').select('*', { count: 'exact', head: true }).eq('ativo', true);
  if (errCount) console.warn('Erro ao contar simulados:', errCount);
  const feitosPct = totalSims ? Math.min(100, Math.round((totalFeitos / totalSims) * 100)) : 0;

  const statsGrid = document.getElementById('stats-grid');
  statsGrid.innerHTML = '';

  const statsData = [
    { label: 'Simulados Feitos', valor: totalFeitos, pct: feitosPct, cor: 'var(--accent)' },
    { label: 'Média Geral', valor: `${mediaGeral}%`, pct: mediaGeral, cor: 'var(--success)' },
    {
      label: 'Advertências',
      valor: totalAdv,
      pct: advPct,
      cor: advPct > 60 ? 'var(--danger)' : 'var(--warn)',
    },
  ];

  statsData.forEach(({ label, valor, pct, cor }) => {
    const card = document.createElement('div');
    card.className = 'stat-card';
    const canvasId = `canvas-${Math.random().toString(36).slice(2)}`;
    card.innerHTML = `<div class="stat-card-glow"></div><div class="stat-label">${esc(label)}</div><div class="stat-body"><div class="stat-value">${esc(String(valor))}</div><canvas class="stat-canvas" id="${canvasId}" width="56" height="56" title="Clique para comemorar!"></canvas></div>`;
    statsGrid.appendChild(card);
    card.querySelector('.stat-card-glow').style.opacity = (pct / 100) * 0.5;
    if (pct > 20) gerarParticulasGlitter(card, pct);
    const ctx = document.getElementById(canvasId).getContext('2d');
    desenharPizza(ctx, pct, cor);
    document.getElementById(canvasId).addEventListener('click', (e) => lancarEmojis(e, pct));
  });
}

function desenharPizza(ctx, pct, cor) {
  const cx = 28,
    cy = 28,
    r = 24,
    stroke = 5;
  ctx.clearRect(0, 0, 56, 56);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = 'var(--bg-4)';
  ctx.lineWidth = stroke;
  ctx.stroke();
  if (pct > 0) {
    const end = -Math.PI / 2 + (pct / 100) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, end);
    ctx.strokeStyle = cor;
    ctx.lineWidth = stroke;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}

function gerarParticulasGlitter(card, pct) {
  const count = Math.floor(pct / 20);
  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    p.className = 'glitter-particle';
    const size = Math.random() * 3 + 1;
    p.style.cssText = `width:${size}px;height:${size}px;left:${Math.random() * 100}%;top:${Math.random() * 100}%;background:${Math.random() > 0.5 ? 'var(--accent)' : 'var(--accent-2)'};--op:${0.3 + Math.random() * 0.4};--dur:${1.5 + Math.random() * 2}s;--gx:${(Math.random() - 0.5) * 20}px;--gy:${(Math.random() - 0.5) * 20}px;animation-delay:${Math.random() * 2}s;`;
    card.appendChild(p);
  }
}

function lancarEmojis(e, pct) {
  const emoji = emojiPorValor(pct);
  for (let i = 0; i < 6; i++) {
    const el = document.createElement('div');
    el.className = 'emoji-launch';
    el.textContent = emoji;
    el.style.cssText = `left:${e.clientX}px;top:${e.clientY}px;--dx:${(Math.random() - 0.5) * 80}px;animation-delay:${i * 0.07}s;`;
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}

async function carregarLogsRecentes() {
  const { data: logs, error: errLogs } = await sb
    .from('logs')
    .select('*')
    .eq('usuario_id', getUsuario().id)
    .order('criado_em', { ascending: false })
    .limit(5);
  if (errLogs) console.warn('Erro ao carregar logs:', errLogs);
  const container = document.getElementById('panel-logs');
  if (!logs?.length) {
    container.innerHTML = '<div class="empty-state-illustrated"><span class="empty-art">📋</span><p>Nenhuma atividade recente</p><div class="empty-hint">Complete um simulado para ver seu histórico aqui</div></div>';
    return;
  }
  const acaoMap = {
    login: '🔑',
    logout: '🚪',
    abriu_simulado: '🎯',
    concluiu_simulado: '✅',
    advertencia: '⚠️',
    expulso: '🚫',
    reagiu: '❤️',
    publicacao_criada: '📋',
    comentou: '💬',
    curtiu_comentario: '👍',
    compartilhou: '🔗',
    importou_questoes: '📥',
    concluiu_desafio: '🏆',
  };
  container.innerHTML = logs
    .map(
      (l) =>
        `<div class="log-item"><span class="log-icon">${acaoMap[l.acao] || '📌'}</span><div><div class="log-text">${esc(l.acao.replace(/_/g, ' '))}</div><div class="log-time">${tempoRelativo(l.criado_em)}</div></div></div>`
    )
    .join('');
}

async function carregarSimuladosQuick() {
  const { data: sims, error: errSims } = await sb
    .from('simulados')
    .select('*')
    .eq('ativo', true)
    .order('criado_em', { ascending: false })
    .limit(5);
  if (errSims) console.warn('Erro ao carregar simulados rápidos:', errSims);
  const container = document.getElementById('panel-sims');
  if (!sims?.length) {
    container.innerHTML = '<div class="empty-state-illustrated"><span class="empty-art">🎯</span><p>Nenhum simulado disponível</p><div class="empty-hint">Os simulados aparecerão aqui quando forem publicados</div></div>';
    return;
  }
  container.innerHTML = sims
    .map(
      (s) =>
        `<div class="sim-quick-item"><div><div class="sim-quick-name">${esc(s.nome)}</div><div class="sim-quick-meta">${s.total_questoes || 0} questões · <span class="badge badge-${s.tipo}">${esc(s.tipo)}</span></div></div><button class="btn-primary btn-sm" onclick="window._iniciarSimulado('${esc(s.id)}')">Iniciar</button></div>`
    )
    .join('');
}


