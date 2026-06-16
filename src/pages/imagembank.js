import { esc, toast } from './ui.js';
import { UNSPLASH_ACCESS_KEY, PEXELS_API_KEY } from '../config.js';

let currentCallback = null;
let currentTarget = null;

export function abrirBancoImagens(callback, target = 'compose') {
  currentCallback = callback;
  currentTarget = target;
  document.getElementById('inp-imagembank').value = '';
  document.getElementById('imagembank-grid').innerHTML =
    '<div class="imagembank-loading">Digite algo para buscar imagens</div>';
  document.getElementById('modal-imagembank').classList.remove('hidden');
}

export function initBancoImagens() {
  document.getElementById('btn-imagembank-fechar').addEventListener('click', () => {
    document.getElementById('modal-imagembank').classList.add('hidden');
    currentCallback = null;
  });

  document.getElementById('btn-imagembank-buscar').addEventListener('click', buscarImagens);
  document.getElementById('inp-imagembank').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') buscarImagens();
  });
}

async function buscarImagens() {
  const query = document.getElementById('inp-imagembank').value.trim();
  if (!query) {
    toast('Digite um termo para buscar', 'warn');
    return;
  }

  const grid = document.getElementById('imagembank-grid');
  grid.innerHTML = '<div class="imagembank-loading"><span class="spinner"></span> Buscando...</div>';

  let results = [];

  if (UNSPLASH_ACCESS_KEY) {
    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=12`,
        { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` } }
      );
      const data = await res.json();
      if (data.results) {
        results = data.results.map((r) => ({
          url: r.urls.small,
          fullUrl: r.urls.regular,
          credit: `Foto: ${r.user.name}`,
          creditUrl: r.links.html,
          source: 'Unsplash',
          downloadLocation: r.links.download_location,
        }));
      }
    } catch {}
  }

  if (results.length === 0 && PEXELS_API_KEY) {
    try {
      const res = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=12`,
        { headers: { Authorization: PEXELS_API_KEY } }
      );
      const data = await res.json();
      if (data.photos) {
        results = data.photos.map((r) => ({
          url: r.src.medium,
          fullUrl: r.src.large,
          credit: `Foto: ${r.photographer}`,
          creditUrl: r.photographer_url,
          source: 'Pexels',
        }));
      }
    } catch {}
  }

  if (results.length === 0) {
    grid.innerHTML = '<div class="imagembank-loading">Nenhuma imagem encontrada. Configure as chaves de API em config.js ou tente outro termo.</div>';
    return;
  }

  grid.innerHTML = '';
  results.forEach((img) => {
    const item = document.createElement('div');
    item.className = 'imagembank-item';
    item.innerHTML = `<img src="${esc(img.url)}" alt="" loading="lazy" /><div class="credit">${esc(img.credit)}</div>`;
    item.addEventListener('click', async () => {
      if (img.source === 'Unsplash' && img.downloadLocation && UNSPLASH_ACCESS_KEY) {
        fetch(img.downloadLocation, {
          headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` },
        }).catch(() => {});
      }
      if (currentCallback) currentCallback(img.fullUrl);
      document.getElementById('modal-imagembank').classList.add('hidden');
    });
    grid.appendChild(item);
  });
}
