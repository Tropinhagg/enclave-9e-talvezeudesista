import { sb } from '../services/supabase.js';
import { esc } from './ui.js';

let debounceTimer = null;

export function initSearch() {
  const input = document.getElementById('search-input');
  const results = document.getElementById('search-results');

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const q = input.value.trim();
    if (!q || q.length < 2) {
      results.classList.add('hidden');
      return;
    }
    debounceTimer = setTimeout(() => buscar(q), 300);
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-bar-wrap')) {
      results.classList.add('hidden');
    }
  });
}

async function buscar(q) {
  const results = document.getElementById('search-results');
  results.innerHTML = '<div class="search-loading">Buscando...</div>';
  results.classList.remove('hidden');

  const term = `%${q}%`;

  const [simulados, artigos, materiais] = await Promise.all([
    sb.from('simulados').select('id, titulo').ilike('titulo', term).limit(3).eq('ativo', true),
    sb.from('artigos').select('id, titulo').ilike('titulo', term).limit(3).eq('publicado', true),
    sb.from('materiais').select('id, nome').ilike('nome', term).limit(3),
  ]);

  const items = [];

  (simulados.data || []).forEach((s) => {
    items.push({ tipo: 'simulado', id: s.id, label: s.titulo, icon: '🎯' });
  });
  (artigos.data || []).forEach((a) => {
    items.push({ tipo: 'artigo', id: a.id, label: a.titulo, icon: '📝' });
  });
  (materiais.data || []).forEach((m) => {
    items.push({ tipo: 'material', id: m.id, label: m.nome, icon: '📁' });
  });

  if (!items.length) {
    results.innerHTML = '<div class="search-empty">Nenhum resultado</div>';
    return;
  }

  results.innerHTML = items
    .map(
      (item) =>
        `<div class="search-item" data-tipo="${esc(item.tipo)}" data-id="${esc(item.id)}"><span>${item.icon}</span><span>${esc(item.label)}</span><span class="search-tag">${esc(item.tipo)}</span></div>`
    )
    .join('');

  results.querySelectorAll('.search-item').forEach((el) => {
    el.addEventListener('click', () => {
      results.classList.add('hidden');
      document.getElementById('search-input').value = '';
      const tipo = el.dataset.tipo;
      const id = el.dataset.id;
      switch (tipo) {
        case 'simulado':
          window._navigateTo('simulados');
          break;
        case 'artigo':
          window._navigateTo('artigos');
          import('./artigos.js').then((mod) => mod.abrirLeitor(id));
          break;
        case 'material':
          window._navigateTo('materiais');
          break;
      }
    });
  });
}
