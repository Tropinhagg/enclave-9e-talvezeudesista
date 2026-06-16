import { sb } from '../services/supabase.js';
import { esc, tipoIcone, toast, confirmar } from './ui.js';
import { getPerfil } from './auth.js';

export async function carregarMateriais() {
  const { data: mats } = await sb
    .from('materiais')
    .select('*')
    .eq('visivel', true)
    .order('criado_em', { ascending: false });
  const grid = document.getElementById('materiais-grid');
  grid.innerHTML = '';
  if (!mats?.length) {
    grid.innerHTML =
      '<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📁</div><p>Nenhum material disponível.</p></div>';
    return;
  }
  mats.forEach((m) => {
    const div = document.createElement('div');
    const perfil = getPerfil();
    div.innerHTML =
      `<a class="material-card" href="${esc(m.url)}" target="_blank" rel="noopener"><span class="material-icon">${tipoIcone(m.tipo)}</span><div><div class="material-name">${esc(m.nome)}</div>${m.descricao ? `<div class="material-desc">${esc(m.descricao)}</div>` : ''}</div>${perfil.role !== 'aluno' ? `<button class="btn-danger btn-sm btn-icon" style="margin-left:auto;" onclick="window.excluirMaterial('${esc(m.id)}',event)">🗑️</button>` : ''}</a>`;
    grid.appendChild(div.firstElementChild);
  });
}

window.excluirMaterial = (id, e) => {
  e.preventDefault();
  e.stopPropagation();
  confirmar('Excluir material', 'Esta ação não pode ser desfeita.', async () => {
    await sb.from('materiais').update({ visivel: false }).eq('id', id);
    toast('Material removido', 'success');
    carregarMateriais();
  }, 'Excluir');
};

export function initNovoMaterial() {
  document.getElementById('btn-novo-material').addEventListener('click', () => {
    document.getElementById('modal-mat-titulo').textContent = 'Novo material';
    document.getElementById('mat-nome-inp').value = '';
    document.getElementById('mat-url-inp').value = '';
    document.getElementById('mat-desc-inp').value = '';
    document.getElementById('modal-novo-mat').classList.remove('hidden');
  });
  document.getElementById('btn-novo-mat-cancelar').addEventListener('click', () => {
    document.getElementById('modal-novo-mat').classList.add('hidden');
  });
  document.getElementById('btn-novo-mat-salvar').addEventListener('click', async () => {
    const nome = document.getElementById('mat-nome-inp').value.trim();
    const url = document.getElementById('mat-url-inp').value.trim();
    const descricao = document.getElementById('mat-desc-inp').value.trim();
    const tipo = document.getElementById('mat-tipo-inp').value;
    if (!nome || !url) {
      toast('Nome e URL obrigatórios', 'warn');
      return;
    }
    const { error } = await sb.from('materiais').insert({ nome, url, descricao, tipo, visivel: true });
    document.getElementById('modal-novo-mat').classList.add('hidden');
    if (error) {
      toast('Erro ao salvar material', 'error');
      return;
    }
    toast('Material salvo!', 'success');
    carregarMateriais();
  });
}
