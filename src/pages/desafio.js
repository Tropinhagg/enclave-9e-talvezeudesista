import { sb } from '../services/supabase.js';
import { esc, toast, confirmar } from './ui.js';
import { getUsuario, getPerfil, registrarLog } from './auth.js';

const DESAFIO_TEMPO_PERGUNTA = 20;
const LETRAS = ['A', 'B', 'C', 'D', 'E'];

let desafioAtivo = null;
let questoesDesafio = [];
let questaoAtual = 0;
let pontuacao = 0;
let acertos = 0;
let timer = null;
let tempoRestante = DESAFIO_TEMPO_PERGUNTA;
let respondendo = false;
let respostasDesafio = [];

export function initDesafio() {
  document.getElementById('btn-novo-desafio').addEventListener('click', () => {
    if (getPerfil().role === 'aluno') return;
    document.getElementById('modal-desafio-titulo').textContent = 'Novo Desafio';
    document.getElementById('desafio-nome-inp').value = '';
    document.getElementById('desafio-qtd-inp').value = '10';
    document.getElementById('modal-novo-desafio').classList.remove('hidden');
  });

  document.getElementById('btn-desafio-cancelar').addEventListener('click', () => {
    document.getElementById('modal-novo-desafio').classList.add('hidden');
  });

  document.getElementById('btn-desafio-criar').addEventListener('click', async () => {
    const nome = document.getElementById('desafio-nome-inp').value.trim();
    const qtd = parseInt(document.getElementById('desafio-qtd-inp').value) || 10;
    if (!nome) {
      toast('Nome do desafio obrigatório', 'warn');
      return;
    }
    const { data: questoes } = await sb
      .from('questoes')
      .select('*')
      .limit(qtd);
    if (!questoes?.length) {
      toast('Nenhuma questão disponível para o desafio', 'error');
      return;
    }
    const shuffled = questoes.sort(() => Math.random() - 0.5);
    const selecionadas = shuffled.slice(0, Math.min(qtd, shuffled.length));

    const { data: desafio, error } = await sb
      .from('desafios')
      .insert({
        titulo: nome,
        criado_por: getUsuario().id,
        questoes: selecionadas.map((q) => ({
          id: q.id,
          enunciado: q.enunciado,
          alternativas: q.alternativas,
          correta: q.correta,
          imagens: q.imagens || [],
        })),
      })
      .select()
      .single();

    document.getElementById('modal-novo-desafio').classList.add('hidden');
    if (error) {
      toast('Erro ao criar desafio', 'error');
      return;
    }
    toast('Desafio criado!', 'success');
    carregarDesafios();
  });
}

export async function carregarDesafios() {
  const { data: desafios } = await sb
    .from('desafios')
    .select('*')
    .order('criado_em', { ascending: false });

  const lista = document.getElementById('desafios-lista');
  lista.innerHTML = '';

  if (!desafios?.length) {
    lista.innerHTML = '<div class="empty-state"><div class="empty-icon">🏆</div><p>Nenhum desafio ainda.</p></div>';
    return;
  }

  desafios.forEach((d) => {
    const card = document.createElement('div');
    card.className = 'desafio-card';
    card.innerHTML = `
      <div>
        <div class="sim-card-title">${esc(d.titulo)}</div>
        <div class="sim-card-meta">${(d.questoes || []).length} perguntas</div>
      </div>
      <button class="btn-primary btn-sm" onclick="window.iniciarDesafio('${esc(d.id)}')">Iniciar</button>`;
    lista.appendChild(card);
  });
}

window.iniciarDesafio = async (desafioId) => {
  const { data: desafio } = await sb.from('desafios').select('*').eq('id', desafioId).single();
  if (!desafio || !desafio.questoes?.length) {
    toast('Desafio vazio', 'error');
    return;
  }

  desafioAtivo = desafio;
  questoesDesafio = desafio.questoes.sort(() => Math.random() - 0.5);
  questaoAtual = 0;
  pontuacao = 0;
  acertos = 0;
  respostasDesafio = [];

  document.getElementById('main-app').classList.add('hidden');
  document.getElementById('tela-desafio').classList.remove('hidden');
  document.getElementById('desafio-titulo-header').textContent = desafio.titulo;

  mostrarQuestao();
};

function mostrarQuestao() {
  if (questaoAtual >= questoesDesafio.length) {
    finalizarDesafio();
    return;
  }

  respondendo = true;
  const q = questoesDesafio[questaoAtual];
  document.getElementById('desafio-progress').textContent = `Pergunta ${questaoAtual + 1} de ${questoesDesafio.length}`;
  document.getElementById('desafio-questao-numero').textContent = `Pergunta ${questaoAtual + 1}`;
  document.getElementById('desafio-questao-texto').textContent = q.enunciado;

  const altContainer = document.getElementById('desafio-alternativas');
  altContainer.innerHTML = '';
  q.alternativas.forEach((alt, i) => {
    const btn = document.createElement('button');
    btn.className = 'desafio-alt-btn';
    btn.innerHTML = `<span class="desafio-alt-letra">${LETRAS[i]}</span><span>${esc(alt)}</span>`;
    btn.addEventListener('click', () => responder(i, q.correta));
    altContainer.appendChild(btn);
  });

  document.getElementById('desafio-resultado-container').classList.add('hidden');
  document.getElementById('desafio-questao-card').classList.remove('hidden');

  tempoRestante = DESAFIO_TEMPO_PERGUNTA;
  atualizarTimer();
  clearInterval(timer);
  timer = setInterval(() => {
    tempoRestante--;
    atualizarTimer();
    if (tempoRestante <= 0) {
      responder(-1, q.correta);
    }
  }, 1000);
}

function atualizarTimer() {
  const el = document.getElementById('desafio-timer');
  el.textContent = tempoRestante;
  el.className = 'desafio-timer';
  if (tempoRestante <= 5) el.classList.add('danger');
  else if (tempoRestante <= 10) el.classList.add('warning');
}

function responder(resposta, correta) {
  if (!respondendo) return;
  respondendo = false;
  clearInterval(timer);

  const acertou = resposta === correta;
  if (acertou) {
    acertos++;
    const bonus = Math.max(0, Math.floor(tempoRestante / 2));
    pontuacao += 10 + bonus;
  }

  respostasDesafio.push({
    questao: questaoAtual,
    resposta,
    correta,
    acertou,
    tempo: DESAFIO_TEMPO_PERGUNTA - tempoRestante,
  });

  const botoes = document.querySelectorAll('.desafio-alt-btn');
  botoes.forEach((btn, i) => {
    btn.style.pointerEvents = 'none';
    if (i === correta) btn.classList.add('correta');
    else if (i === resposta && !acertou) btn.classList.add('errada');
  });

  setTimeout(() => {
    questaoAtual++;
    mostrarQuestao();
  }, 1500);
}

function finalizarDesafio() {
  clearInterval(timer);
  document.getElementById('desafio-questao-card').classList.add('hidden');
  document.getElementById('desafio-timer').textContent = '0';
  document.getElementById('desafio-timer').className = 'desafio-timer';

  const container = document.getElementById('desafio-resultado-container');
  container.classList.remove('hidden');

  const total = questoesDesafio.length;
  const pct = Math.round((acertos / total) * 100);
  let feedback;
  if (pct >= 90) feedback = 'Incrível! Nota máxima! 🏆';
  else if (pct >= 70) feedback = 'Muito bom! Continue assim! ⚡';
  else if (pct >= 50) feedback = 'Bom, mas pode melhorar! 💪';
  else if (pct >= 30) feedback = 'Estude mais um pouco! 📚';
  else feedback = 'Que tal tentar de novo? 😅';

  container.innerHTML = `
    <div class="desafio-resultado">
      <div style="font-size:48px;">${pct >= 70 ? '🏆' : '🎯'}</div>
      <div class="pontuacao">${pontuacao}</div>
      <div class="feedback">${feedback}</div>
      <div style="font-size:15px;color:var(--text-dim);margin-bottom:24px;">
        ${acertos} de ${total} questões corretas (${pct}%)
      </div>
      <button class="btn-primary" onclick="window.voltarDoDesafio()" style="max-width:200px;margin:0 auto;">Voltar</button>
    </div>`;

  registrarLog('concluiu_desafio', {
    desafio_id: desafioAtivo?.id,
    pontuacao,
    acertos,
    total,
  });

  dispararConfete();
}

function dispararConfete() {
  import('https://cdn.jsdelivr.net/npm/canvas-confetti@1/+esm')
    .then((confetti) => {
      confetti.default({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#7c9ef5', '#a78bfa', '#d4a843', '#34d399'],
      });
    })
    .catch(() => {});
}

window.voltarDoDesafio = () => {
  document.getElementById('tela-desafio').classList.add('hidden');
  document.getElementById('main-app').classList.remove('hidden');
  desafioAtivo = null;
  questoesDesafio = [];
  window._navigateTo('desafio');
};
