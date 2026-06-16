import { sb } from '../services/supabase.js';
import { esc, toast } from './ui.js';
import { getPerfil } from './auth.js';
import { abrirSimulado } from './simulados.js';

let materiaSelecionadaId = null;

export async function carregarSimulados() {
  const { data: materias } = await sb
    .from('materias')
    .select('*, simulados(id,nome,ativo,tipo,total_questoes)')
    .order('ordem');

  const materiasGrid = document.getElementById('materias-grid');
  materiasGrid.innerHTML = '';

  (materias || []).forEach((m) => {
    const div = document.createElement('div');
    div.className = 'materia-card';
    const count = m.simulados?.filter((s) => s.ativo).length || 0;
    div.innerHTML = `
      <span class="materia-icon">${esc(m.icone || '📚')}</span>
      <div>
        <div class="materia-name">${esc(m.nome)}</div>
        <div class="materia-count">${count} simulado${count !== 1 ? 's' : ''}</div>
      </div>`;
    div.style.borderColor = materiaSelecionadaId === m.id ? m.cor || 'var(--accent)' : m.cor || '';

    div.addEventListener('click', () => {
      if (materiaSelecionadaId === m.id) {
        materiaSelecionadaId = null;
        document.getElementById('materia-sims-panel').classList.add('hidden');
        document.querySelectorAll('.materia-card').forEach((c) => (c.style.outline = ''));
      } else {
        materiaSelecionadaId = m.id;
        abrirPainelSimuladosMateria(m);
        document.querySelectorAll('.materia-card').forEach((c) => (c.style.outline = ''));
        div.style.outline = `2px solid ${m.cor || 'var(--accent)'}`;
      }
    });

    materiasGrid.appendChild(div);
  });

  if (!materias?.length) {
    materiasGrid.innerHTML =
      '<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📚</div><p>Nenhuma matéria cadastrada.</p></div>';
  }

  const { data: gerais } = await sb
    .from('simulados')
    .select('*')
    .eq('tipo', 'geral')
    .eq('ativo', true)
    .order('criado_em', { ascending: false });

  const lista = document.getElementById('simulados-geral-lista');
  lista.innerHTML = '';
  (gerais || []).forEach((s) => lista.appendChild(criarSimCard(s)));
  if (!gerais?.length)
    lista.innerHTML = '<div class="empty-state"><div class="empty-icon">🎯</div><p>Nenhum simulado geral disponível.</p></div>';

  const sel = document.getElementById('sim-materia-inp');
  sel.innerHTML = '<option value="">— Nenhuma —</option>';
  (materias || []).forEach((m) => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.nome;
    sel.appendChild(opt);
  });

  if (materiaSelecionadaId) {
    const m = (materias || []).find((m) => m.id === materiaSelecionadaId);
    if (m) abrirPainelSimuladosMateria(m);
  }
}

function abrirPainelSimuladosMateria(materia) {
  const panel = document.getElementById('materia-sims-panel');
  const isProf = getPerfil().role !== 'aluno';
  const simulados = (materia.simulados || []).filter((s) => (isProf ? true : s.ativo));

  panel.innerHTML = `
    <div class="materia-sims-header">
      <div class="materia-sims-title">
        <span>${esc(materia.icone || '📚')}</span>
        <span>${esc(materia.nome)}</span>
        <span class="badge badge-materia">${simulados.length} simulado${simulados.length !== 1 ? 's' : ''}</span>
      </div>
      <button class="btn-ghost btn-sm" onclick="window.fecharPainelMateria()">✕ Fechar</button>
    </div>
    <div class="materia-sims-lista" id="materia-sims-lista">
      ${simulados.length ? '' : '<div class="empty-state" style="padding:30px 0;"><div class="empty-icon">📝</div><p>Nenhum simulado nesta matéria.</p></div>'}
    </div>`;

  const lista = panel.querySelector('#materia-sims-lista');
  simulados.forEach((s) => lista.appendChild(criarSimCard(s)));
  panel.classList.remove('hidden');
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

window.fecharPainelMateria = () => {
  materiaSelecionadaId = null;
  document.getElementById('materia-sims-panel').classList.add('hidden');
  document.querySelectorAll('.materia-card').forEach((c) => (c.style.outline = ''));
};

function criarSimCard(sim) {
  const div = document.createElement('div');
  div.className = 'sim-card';
  const isProf = getPerfil().role !== 'aluno';
  div.innerHTML = `
    <div class="sim-card-left">
      <div class="sim-card-title">${esc(sim.nome)}</div>
      <div class="sim-card-meta">${sim.total_questoes || 0} questões · <span class="badge badge-${sim.tipo}">${esc(sim.tipo)}</span></div>
    </div>
    <div class="sim-card-right">
      <button class="btn-primary btn-sm" onclick="window._iniciarSimulado('${esc(sim.id)}')">Iniciar</button>
      ${isProf ? `<button class="btn-ghost btn-sm" onclick="window.abrirEditorSimulado('${esc(sim.id)}')">✏️ Editar</button>` : ''}
    </div>`;
  return div;
}

window._iniciarSimulado = (id) => abrirSimulado(id);

export function initNovoSimulado() {
  document.getElementById('btn-novo-simulado').addEventListener('click', () => {
    window._simEditandoId = null;
    document.getElementById('modal-sim-titulo').textContent = 'Novo simulado';
    document.getElementById('sim-nome-inp').value = '';
    document.getElementById('modal-novo-sim').classList.remove('hidden');
  });
  document.getElementById('btn-novo-sim-cancelar').addEventListener('click', () => {
    document.getElementById('modal-novo-sim').classList.add('hidden');
  });
  document.getElementById('btn-novo-sim-criar').addEventListener('click', async () => {
    const nome = document.getElementById('sim-nome-inp').value.trim();
    const tipo = document.getElementById('sim-tipo-inp').value;
    const materia_id = document.getElementById('sim-materia-inp').value || null;
    if (!nome) {
      toast('Nome obrigatório', 'warn');
      return;
    }
    const { error } = await sb.from('simulados').insert({ nome, tipo, materia_id, ativo: true });
    document.getElementById('modal-novo-sim').classList.add('hidden');
    if (error) {
      toast('Erro ao criar simulado', 'error');
      return;
    }
    toast('Simulado criado!', 'success');
    carregarSimulados();
  });
}
