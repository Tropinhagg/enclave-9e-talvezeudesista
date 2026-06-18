import { sb } from '../services/supabase.js';
import { esc, toast, confirmar } from './ui.js';
import { getPerfil } from './auth.js';
import { abrirSimulado } from './simulados.js';

let materiaSelecionadaId = null;

export async function carregarSimulados() {
  const { data: materias, error: errMats } = await sb
    .from('materias')
    .select('*')
    .order('ordem');

  let simuladosPorMateria = {};
  if (errMats) {
    console.warn('Erro ao buscar matérias:', errMats);
  } else if (materias?.length) {
    const matIds = materias.map((m) => m.id);
    const { data: sims } = await sb
      .from('simulados')
      .select('*')
      .in('materia_id', matIds)
      .order('criado_em', { ascending: false });
    if (sims) {
      for (const s of sims) {
        if (!simuladosPorMateria[s.materia_id]) simuladosPorMateria[s.materia_id] = [];
        simuladosPorMateria[s.materia_id].push(s);
      }
    }
  }

  const materiasGrid = document.getElementById('materias-grid');
  materiasGrid.innerHTML = '';

  (materias || []).forEach((m, idx) => {
    const div = document.createElement('div');
    div.className = 'materia-card';
    const simsDaMateria = simuladosPorMateria[m.id] || [];
    const isProf = getPerfil().role !== 'aluno';
    const ativos = simsDaMateria.filter((s) => s.ativo);
    const count = isProf ? simsDaMateria.length : ativos.length;
    const bgImgs = [
      'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400',
      'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400',
      'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400',
      'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400',
      'https://images.unsplash.com/photo-1488190211105-8b0e65b80b4f?w=400',
      'https://images.unsplash.com/photo-1491841573634-28140fc7ced7?w=400',
      'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400',
      'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=400',
      'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=400',
      'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400',
    ];
    const bgIdx = idx % bgImgs.length;
    div.style.setProperty('--materia-bg', `url('${bgImgs[bgIdx]}')`);
    div.style.backgroundColor = 'var(--bg-3)';
    div.innerHTML = `
      <span class="materia-icon">${esc(m.icone || '📚')}</span>
      <div>
        <div class="materia-name">${esc(m.nome)}</div>
        <div class="materia-count">${count} simulado${count !== 1 ? 's' : ''}</div>
      </div>`;
    div.style.borderColor = materiaSelecionadaId === m.id ? m.cor || 'var(--accent)' : m.cor || '';
    if (m.cor) div.style.setProperty('--materia-accent', m.cor);

    div.addEventListener('click', () => {
      if (materiaSelecionadaId === m.id) {
        materiaSelecionadaId = null;
        document.getElementById('materia-sims-panel').classList.add('hidden');
        document.querySelectorAll('.materia-card').forEach((c) => (c.style.outline = ''));
      } else {
        materiaSelecionadaId = m.id;
        abrirPainelSimuladosMateria({ ...m, simulados: simsDaMateria });
        document.querySelectorAll('.materia-card').forEach((c) => (c.style.outline = ''));
        div.style.outline = `2px solid ${m.cor || 'var(--accent)'}`;
      }
    });

    materiasGrid.appendChild(div);
  });

  if (!materias?.length) {
    materiasGrid.innerHTML =
      '<div class="empty-state-illustrated" style="grid-column:1/-1"><span class="empty-art">📚</span><p>Nenhuma matéria cadastrada</p><div class="empty-hint">As matérias com simulados aparecerão aqui</div></div>';
  }

  const isProf = getPerfil().role !== 'aluno';
  const geraisQuery = sb.from('simulados').select('*').eq('tipo', 'geral');
  if (!isProf) geraisQuery.eq('ativo', true);
  const { data: gerais } = await geraisQuery.order('criado_em', { ascending: false });

  const lista = document.getElementById('simulados-geral-lista');
  lista.innerHTML = '';
  (gerais || []).forEach((s) => lista.appendChild(criarSimCard(s)));
  if (!gerais?.length)
    lista.innerHTML = '<div class="empty-state-illustrated"><span class="empty-art">🎯</span><p>Nenhum simulado geral disponível</p><div class="empty-hint">Simulados gerais serão listados aqui quando publicados</div></div>';

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
    if (m) abrirPainelSimuladosMateria({ ...m, simulados: simuladosPorMateria[m.id] || [] });
  }
}

function abrirPainelSimuladosMateria(materia) {
  const panel = document.getElementById('materia-sims-panel');
  const isProf = getPerfil().role !== 'aluno';
  const simulados = (materia.simulados || []).filter((s) => (isProf ? true : s.ativo));

  panel.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'materia-sims-header';

  const title = document.createElement('div');
  title.className = 'materia-sims-title';
  const iconSpan = document.createElement('span');
  iconSpan.textContent = materia.icone || '📚';
  const nameSpan = document.createElement('span');
  nameSpan.textContent = materia.nome;
  const badge = document.createElement('span');
  badge.className = 'badge badge-materia';
  badge.textContent = `${simulados.length} simulado${simulados.length !== 1 ? 's' : ''}`;
  title.appendChild(iconSpan);
  title.appendChild(nameSpan);
  title.appendChild(badge);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'btn-ghost btn-sm';
  closeBtn.textContent = '✕ Fechar';
  closeBtn.addEventListener('click', window.fecharPainelMateria);
  header.appendChild(title);
  header.appendChild(closeBtn);

  const lista = document.createElement('div');
  lista.className = 'materia-sims-lista';
  lista.id = 'materia-sims-lista';

  if (!simulados.length) {
    lista.innerHTML = '<div class="empty-state" style="padding:30px 0;"><div class="empty-icon">📝</div><p>Nenhum simulado nesta matéria.</p></div>';
  } else {
    simulados.forEach((s) => lista.appendChild(criarSimCard(s)));
  }

  panel.appendChild(header);
  panel.appendChild(lista);
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

  const left = document.createElement('div');
  left.className = 'sim-card-left';

  const title = document.createElement('div');
  title.className = 'sim-card-title';
  title.textContent = sim.nome;
  if (!sim.ativo && isProf) {
    const badgeRascunho = document.createElement('span');
    badgeRascunho.className = 'badge badge-geral';
    badgeRascunho.textContent = 'Rascunho';
    title.appendChild(document.createTextNode(' '));
    title.appendChild(badgeRascunho);
  }
  left.appendChild(title);

  const meta = document.createElement('div');
  meta.className = 'sim-card-meta';
  meta.innerHTML = `${sim.total_questoes || 0} questões · <span class="badge badge-${sim.tipo}">${esc(sim.tipo)}</span>`;
  left.appendChild(meta);

  const right = document.createElement('div');
  right.className = 'sim-card-right';

  const iniciarBtn = document.createElement('button');
  iniciarBtn.className = 'btn-primary btn-sm';
  iniciarBtn.textContent = 'Iniciar';
  iniciarBtn.addEventListener('click', () => abrirSimulado(sim.id));
  right.appendChild(iniciarBtn);

  if (isProf) {
    const editarBtn = document.createElement('button');
    editarBtn.className = 'btn-ghost btn-sm';
    editarBtn.textContent = '✏️ Editar';
    editarBtn.addEventListener('click', () => window.abrirEditorSimulado(sim.id));
    right.appendChild(editarBtn);

    const excluirBtn = document.createElement('button');
    excluirBtn.className = 'btn-danger btn-sm';
    excluirBtn.textContent = '🗑️';
    excluirBtn.title = 'Excluir simulado';
    excluirBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      confirmar('Excluir simulado', `Tem certeza? "${sim.nome}" será removido permanentemente, incluindo todas as questões.`, async () => {
        await sb.from('questoes').delete().eq('simulado_id', sim.id);
        await sb.from('simulados').delete().eq('id', sim.id);
        toast('Simulado excluído', 'success');
        carregarSimulados();
      }, 'Excluir');
    });
    right.appendChild(excluirBtn);
  }

  div.appendChild(left);
  div.appendChild(right);
  return div;
}

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
    const { data: novoSim, error } = await sb.from('simulados').insert({ titulo: nome, tipo, materia_id, ativo: false }).select().single();
    document.getElementById('modal-novo-sim').classList.add('hidden');
    if (error) {
      toast('Erro ao criar simulado', 'error');
      return;
    }
    toast('Rascunho criado!', 'success');
    window.abrirEditorSimulado(novoSim.id);
    carregarSimulados();
  });
}
