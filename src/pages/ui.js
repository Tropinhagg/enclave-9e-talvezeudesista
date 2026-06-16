let confirmCallback = null;

export function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function iniciais(nome) {
  if (!nome) return '?';
  return nome
    .trim()
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function tempoRelativo(isoStr) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const seg = Math.floor(diff / 1000);
  if (seg < 60) return 'agora';
  const min = Math.floor(seg / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function emojiPorValor(pct) {
  if (pct <= 10) return '😞';
  if (pct <= 25) return '😢';
  if (pct <= 40) return '🤡';
  if (pct <= 55) return '💪';
  if (pct <= 65) return '🎯';
  if (pct <= 80) return '⚡';
  if (pct <= 90) return '😄';
  return '😎';
}

export function tipoIcone(tipo) {
  const map = {
    edital: '📜',
    pdf: '📄',
    video: '🎬',
    ppt: '📊',
    doc: '📝',
    site: '🌐',
    assunto: '📚',
    outro: '📎',
  };
  return map[tipo] || '📎';
}

export function toast(msg, tipo = 'success') {
  const el = document.createElement('div');
  el.className = `toast ${tipo}`;
  const icons = { success: '✅', error: '❌', warn: '⚠️' };
  el.innerHTML = `<span>${icons[tipo] || 'ℹ️'}</span> <span>${esc(msg)}</span>`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 4400);
}

export function confirmar(titulo, texto, onOk, btnLabel = 'Confirmar') {
  document.getElementById('modal-confirmar-titulo').textContent = titulo;
  document.getElementById('modal-confirmar-texto').textContent = texto;
  document.getElementById('btn-confirmar-ok').textContent = btnLabel;
  confirmCallback = onOk;
  document.getElementById('modal-confirmar').classList.remove('hidden');
}

export function abrirLightbox(src) {
  document.getElementById('lightbox-img').src = src;
  document.getElementById('lightbox').classList.remove('hidden');
}

export function fecharLightbox() {
  document.getElementById('lightbox').classList.add('hidden');
}

export function getConfirmCallback() {
  return confirmCallback;
}

export function clearConfirmCallback() {
  confirmCallback = null;
}

export function initUI() {
  document.getElementById('lightbox-close').addEventListener('click', fecharLightbox);
  document.getElementById('lightbox').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) fecharLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') fecharLightbox();
  });
  document.addEventListener('click', (e) => {
    if (e.target.matches('.post-images img, .bloco-images img, .questao-images img')) {
      abrirLightbox(e.target.src);
    }
  });

  document.getElementById('btn-confirmar-cancel').addEventListener('click', () => {
    document.getElementById('modal-confirmar').classList.add('hidden');
    clearConfirmCallback();
  });
  document.getElementById('btn-confirmar-ok').addEventListener('click', () => {
    document.getElementById('modal-confirmar').classList.add('hidden');
    if (confirmCallback) confirmCallback();
    clearConfirmCallback();
  });

  document.getElementById('account-trigger').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('account-dropdown').classList.toggle('hidden');
  });
  document.addEventListener('click', () => {
    document.getElementById('account-dropdown').classList.add('hidden');
  });
}
