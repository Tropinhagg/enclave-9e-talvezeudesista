import { sb } from '../services/supabase.js';
import { esc, toast, confirmar } from './ui.js';
import { getUsuario, getPerfil, registrarLog } from './auth.js';

let simuladoAtual = null;
let tentativaId = null;
let respostas = {};
let advertencias = 0;
let salvamentoInterval = null;
let invalidationTimer = null;
let advModalAberto = false;
let questoesCache = [];

export { simuladoAtual, tentativaId, respostas, advertencias, advModalAberto };

export async function abrirSimulado(simId) {
  const { data: sim } = await sb.from('simulados').select('*').eq('id', simId).single();
  if (!sim) {
    toast('Simulado não encontrado', 'error');
    return;
  }

  let { data: tentativa } = await sb
    .from('tentativas_simulado')
    .select('*')
    .eq('simulado_id', simId)
    .eq('usuario_id', getUsuario().id)
    .maybeSingle();

  if (tentativa?.status === 'concluido') {
    toast('Você já concluiu este simulado.', 'warn');
    return;
  }
  if (tentativa?.status === 'expulso') {
    toast('Você foi expulso deste simulado.', 'error');
    return;
  }

  if (!tentativa) {
    const { data: nova, error } = await sb
      .from('tentativas_simulado')
      .insert({
        simulado_id: simId,
        usuario_id: getUsuario().id,
        status: 'em_andamento',
        respostas_parciais: {},
        advertencias: 0,
      })
      .select()
      .single();
    if (error) {
      toast('Erro ao iniciar simulado', 'error');
      return;
    }
    tentativa = nova;
  }

  const { data: questoes } = await sb
    .from('questoes_sem_gabarito')
    .select('*')
    .eq('simulado_id', simId)
    .order('ordem');

  if (!questoes?.length) {
    toast('Este simulado não tem questões ainda.', 'warn');
    return;
  }

  questoesCache = questoes;
  simuladoAtual = sim;
  tentativaId = tentativa.id;
  respostas = tentativa.respostas_parciais || {};
  advertencias = tentativa.advertencias || 0;

  document.getElementById('main-app').classList.add('hidden');
  document.getElementById('tela-simulado').classList.remove('hidden');
  document.getElementById('sim-titulo-bar').textContent = sim.nome;
  renderizarPips();
  renderizarQuestoes(questoes);

  salvamentoInterval = setInterval(() => salvarParcial(), 30000);
  window._salvamentoInterval = salvamentoInterval;
  ativarMonitoramento();
  await registrarLog('abriu_simulado', { simulado_id: simId });
}

function renderizarPips() {
  document.querySelectorAll('.adv-pip').forEach((pip, i) => {
    pip.classList.remove('ativo', 'danger');
    if (i < advertencias) pip.classList.add(advertencias >= 4 ? 'danger' : 'ativo');
  });
}

function renderizarQuestoes(questoes) {
  const lista = document.getElementById('questoes-lista');
  lista.innerHTML = '';
  const letras = ['A', 'B', 'C', 'D', 'E'];
  questoes.forEach((q, qi) => {
    const card = document.createElement('div');
    card.className = 'questao-card';
    const imgsHtml = (q.imagens || [])
      .map((u) => `<img src="${esc(u)}" alt="imagem" loading="lazy" />`)
      .join('');
    card.innerHTML =
      `<div class="questao-num">Questão ${qi + 1}</div><div class="questao-enunciado">${esc(q.enunciado)}</div>${imgsHtml ? `<div class="questao-images">${imgsHtml}</div>` : ''}<div class="alternativas-lista" data-qid="${esc(q.id)}">${(q.alternativas || []).map((alt, ai) => `<button class="alt-btn${respostas[q.id] === ai ? ' selecionada' : ''}" data-qid="${esc(q.id)}" data-idx="${ai}"><span class="alt-letra">${letras[ai]}</span><span>${esc(alt)}</span></button>`).join('')}</div>`;
    lista.appendChild(card);
  });
  lista.querySelectorAll('.alt-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const qid = btn.dataset.qid;
      const idx = parseInt(btn.dataset.idx);
      respostas[qid] = idx;
      document.querySelectorAll(`.alt-btn[data-qid="${qid}"]`).forEach((b) => b.classList.remove('selecionada'));
      btn.classList.add('selecionada');
      const respondidas = Object.keys(respostas).length;
      document.getElementById('sim-progresso').textContent = `${respondidas} respondida${respondidas !== 1 ? 's' : ''}`;
    });
  });
}

async function salvarParcial() {
  if (!tentativaId) return;
  await sb
    .from('tentativas_simulado')
    .update({ respostas_parciais: respostas, advertencias })
    .eq('id', tentativaId);
}

async function entregarSimulado() {
  await salvarParcial();
  await sb
    .from('tentativas_simulado')
    .update({ status: 'concluido', encerrado_em: new Date().toISOString() })
    .eq('id', tentativaId);
  clearInterval(salvamentoInterval);
  salvamentoInterval = null;
  window._salvamentoInterval = null;
  removerMonitoramento();
  await registrarLog('concluiu_simulado', { tentativa_id: tentativaId });

  dispararConfete();
  toast('Simulado entregue!', 'success');
  voltarDashboard();
}

function dispararConfete() {
  import('https://cdn.jsdelivr.net/npm/canvas-confetti@1/+esm').then((confetti) => {
    confetti.default({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#7c9ef5', '#a78bfa', '#d4a843', '#34d399'],
    });
  }).catch(() => {});
}

function voltarDashboard() {
  document.getElementById('tela-simulado').classList.add('hidden');
  document.getElementById('main-app').classList.remove('hidden');
  simuladoAtual = null;
  tentativaId = null;
  respostas = {};
  advertencias = 0;
  questoesCache = [];
  window._navigateTo('inicio');
}

/* ── MONITORAMENTO DE TRAPAÇA ── */
function ativarMonitoramento() {
  document.addEventListener('visibilitychange', onVisibilityChange);
  reiniciarTimerInatividade();
}

function removerMonitoramento() {
  document.removeEventListener('visibilitychange', onVisibilityChange);
  clearTimeout(invalidationTimer);
  invalidationTimer = null;
}

function onVisibilityChange() {
  if (document.hidden) emitirAdvertencia('troca_de_aba');
}

function reiniciarTimerInatividade() {
  clearTimeout(invalidationTimer);
  invalidationTimer = setTimeout(() => emitirAdvertencia('inatividade'), 60000);
}

document.addEventListener('click', () => {
  if (simuladoAtual) reiniciarTimerInatividade();
});
document.addEventListener('keydown', () => {
  if (simuladoAtual) reiniciarTimerInatividade();
});

async function emitirAdvertencia(motivo) {
  if (advModalAberto || !simuladoAtual) return;
  advertencias++;
  renderizarPips();
  await salvarParcial();
  await registrarLog('advertencia', {
    motivo,
    tentativa_id: tentativaId,
    total: advertencias,
  });

  if (advertencias >= 5) {
    await expulsarAluno();
    return;
  }

  advModalAberto = true;
  document.getElementById('adv-modal-icon').textContent = advertencias >= 4 ? '🚨' : '⚠️';
  document.getElementById('adv-modal-texto').textContent =
    motivo === 'troca_de_aba'
      ? `Você trocou de aba! Advertência ${advertencias}/5.`
      : `Inatividade detectada! Advertência ${advertencias}/5.`;
  const pipsEl = document.getElementById('adv-modal-pips');
  pipsEl.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    const p = document.createElement('div');
    p.className = `adv-modal-pip${i < advertencias ? (advertencias >= 4 ? ' danger' : ' ativo') : ''}`;
    pipsEl.appendChild(p);
  }
  document.getElementById('modal-adv').classList.remove('hidden');
}

async function expulsarAluno() {
  await sb.from('tentativas_simulado').update({ status: 'expulso' }).eq('id', tentativaId);
  await registrarLog('expulso', { tentativa_id: tentativaId });
  removerMonitoramento();
  clearInterval(salvamentoInterval);
  toast('Você foi expulso do simulado após 5 advertências.', 'error');
  voltarDashboard();
}

export function initSimuladoButtons() {
  document.getElementById('btn-entregar-sim').addEventListener('click', () => {
    confirmar('Entregar simulado', 'Tem certeza? Você não poderá alterar suas respostas depois.', entregarSimulado, 'Entregar');
  });
  document.getElementById('btn-entregar-sim-2').addEventListener('click', () => {
    confirmar('Entregar simulado', 'Tem certeza? Você não poderá alterar suas respostas depois.', entregarSimulado, 'Entregar');
  });
  document.getElementById('btn-sair-simulado').addEventListener('click', () => {
    confirmar('Sair do simulado', 'Seu progresso será salvo. Você pode retomar depois.', async () => {
      await salvarParcial();
      await registrarLog('saiu_simulado', { tentativa_id: tentativaId });
      voltarDashboard();
    }, 'Sair');
  });
  document.getElementById('btn-adv-ok').addEventListener('click', () => {
    document.getElementById('modal-adv').classList.add('hidden');
    advModalAberto = false;
  });
}
