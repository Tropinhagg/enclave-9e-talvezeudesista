import { sb } from '../services/supabase.js';
import { uploadCloudinary } from '../services/cloudinary.js';
import { esc, toast, confirmar } from './ui.js';
import { getPerfil } from './auth.js';
import { abrirBancoImagens } from './imagembank.js';

const blocoPendingImgs = [];
const blocoPendingLinks = [];
window._blocoPendingLinks = blocoPendingLinks;

let blocoEditandoId = null;
let blocoExistingImgs = [];

export async function carregarConteudo() {
  const { data: blocos } = await sb.from('conteudo_abas').select('*').order('ordem');
  const containers = {
    edital: document.getElementById('blocos-edital'),
    assuntos: document.getElementById('blocos-assuntos'),
    videos: document.getElementById('blocos-videos'),
    'materiais-aba': document.getElementById('blocos-materiais-aba'),
  };
  Object.values(containers).forEach((c) => (c.innerHTML = ''));
  (blocos || []).forEach((b) => {
    const c = containers[b.aba];
    if (c) c.appendChild(criarBlocoCard(b));
  });
  Object.entries(containers).forEach(([, c]) => {
    if (!c.children.length)
      c.innerHTML = '<div class="empty-state"><div class="empty-icon">📄</div><p>Nenhum conteúdo ainda.</p></div>';
  });
}

function criarBlocoCard(bloco) {
  const div = document.createElement('div');
  div.className = 'bloco-card';
  const imgsHtml = (bloco.imagens || [])
    .map((u) => `<img src="${esc(u)}" alt="" loading="lazy" />`)
    .join('');
  const linksHtml = (bloco.links || [])
    .map((l) => `<a class="post-link-chip" href="${esc(l.url)}" target="_blank" rel="noopener">🔗 ${esc(l.texto || l.url)}</a>`)
    .join('');
  const perfil = getPerfil();
  const manageHtml =
    perfil.role !== 'aluno'
      ? `<div class="bloco-manage"><button class="btn-ghost btn-sm" onclick="window.editarBloco('${esc(bloco.id)}')">✏️ Editar</button><button class="btn-danger btn-sm" onclick="window.excluirBloco('${esc(bloco.id)}')">🗑️</button></div>`
      : '';
  div.innerHTML = `<div class="bloco-header"><div class="bloco-titulo">${esc(bloco.titulo)}</div>${manageHtml}</div>${bloco.corpo ? `<div class="bloco-corpo">${esc(bloco.corpo)}</div>` : ''}${imgsHtml ? `<div class="bloco-images">${imgsHtml}</div>` : ''}${linksHtml ? `<div class="bloco-links">${linksHtml}</div>` : ''}`;
  return div;
}

export function initConteudo() {
  document.querySelectorAll('.aba-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.aba-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.aba-content').forEach((c) => c.classList.remove('active'));
      btn.classList.add('active');
      document.querySelector(`[data-aba-content="${btn.dataset.aba}"]`)?.classList.add('active');
    });
  });

  document.getElementById('btn-novo-bloco').addEventListener('click', () => {
    blocoEditandoId = null;
    blocoPendingImgs.length = 0;
    blocoPendingLinks.length = 0;
    blocoExistingImgs = [];
    document.getElementById('modal-bloco-titulo').textContent = 'Novo bloco';
    document.getElementById('bloco-titulo-inp').value = '';
    document.getElementById('bloco-corpo-inp').value = '';
    document.getElementById('bloco-images-preview').innerHTML = '';
    document.getElementById('bloco-links-preview').innerHTML = '';
    const abaAtiva = document.querySelector('.aba-btn.active')?.dataset.aba;
    if (abaAtiva) document.getElementById('bloco-aba').value = abaAtiva;
    document.getElementById('modal-bloco').classList.remove('hidden');
  });

  window.editarBloco = async (id) => {
    const { data: b } = await sb.from('conteudo_abas').select('*').eq('id', id).single();
    if (!b) return;
    blocoEditandoId = id;
    blocoPendingImgs.length = 0;
    blocoPendingLinks.length = 0;
    blocoExistingImgs = [...(b.imagens || [])];
    document.getElementById('modal-bloco-titulo').textContent = 'Editar bloco';
    document.getElementById('bloco-aba').value = b.aba;
    document.getElementById('bloco-titulo-inp').value = b.titulo || '';
    document.getElementById('bloco-corpo-inp').value = b.corpo || '';
    document.getElementById('bloco-images-preview').innerHTML = (b.imagens || [])
      .map(
        (u, i) =>
          `<div class="pending-img-wrap"><img src="${esc(u)}" alt="" /><button class="pending-img-remove" onclick="window.removerBlocoImgExist(${i})">✕</button></div>`
      )
      .join('');
    window._renderBlocoLinks();
    blocoPendingLinks.push(...(b.links || []));
    document.getElementById('modal-bloco').classList.remove('hidden');
  };

  window.removerBlocoImgExist = (i) => {
    blocoExistingImgs?.splice(i, 1);
  };

  document.getElementById('btn-bloco-add-img').addEventListener('click', () => {
    document.getElementById('file-bloco-img').click();
  });

  document.getElementById('file-bloco-img').addEventListener('change', (e) => {
    Array.from(e.target.files).forEach((file) => {
      const previewUrl = URL.createObjectURL(file);
      blocoPendingImgs.push({ file, previewUrl });
      const wrap = document.createElement('div');
      wrap.className = 'pending-img-wrap';
      wrap.innerHTML = `<img src="${previewUrl}" alt="" /><button class="pending-img-remove">✕</button>`;
      wrap.querySelector('button').addEventListener('click', () => {
        const i = blocoPendingImgs.findIndex((p) => p.previewUrl === previewUrl);
        if (i >= 0) blocoPendingImgs.splice(i, 1);
        wrap.remove();
      });
      document.getElementById('bloco-images-preview').appendChild(wrap);
    });
    e.target.value = '';
  });

  document.getElementById('btn-bloco-add-img-bank').addEventListener('click', () => {
    abrirBancoImagens((url) => {
      if (!url) return;
      blocoPendingImgs.push({ file: null, previewUrl: url, remoteUrl: url });
      const wrap = document.createElement('div');
      wrap.className = 'pending-img-wrap';
      wrap.innerHTML = `<img src="${url}" alt="" /><button class="pending-img-remove">✕</button>`;
      wrap.querySelector('button').addEventListener('click', () => {
        const i = blocoPendingImgs.findIndex((p) => p.previewUrl === url);
        if (i >= 0) blocoPendingImgs.splice(i, 1);
        wrap.remove();
      });
      document.getElementById('bloco-images-preview').appendChild(wrap);
    }, 'bloco');
  });

  document.getElementById('btn-bloco-add-link').addEventListener('click', () => {
    window._linkTarget = 'bloco';
    document.getElementById('inp-link-texto').value = '';
    document.getElementById('inp-link-url').value = '';
    document.getElementById('modal-link').classList.remove('hidden');
  });

  document.getElementById('btn-bloco-cancelar').addEventListener('click', () => {
    document.getElementById('modal-bloco').classList.add('hidden');
  });

  document.getElementById('btn-bloco-salvar').addEventListener('click', async () => {
    const aba = document.getElementById('bloco-aba').value;
    const titulo = document.getElementById('bloco-titulo-inp').value.trim();
    const corpo = document.getElementById('bloco-corpo-inp').value.trim();
    if (!titulo) {
      toast('Título obrigatório', 'warn');
      return;
    }
    const btn = document.getElementById('btn-bloco-salvar');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';
    const novasUrls = [];
    for (const img of blocoPendingImgs) {
      if (img.remoteUrl) {
        novasUrls.push(img.remoteUrl);
      } else if (img.file) {
        const url = await uploadCloudinary(img.file);
        if (url) novasUrls.push(url);
      }
    }
    const imagens = [...blocoExistingImgs, ...novasUrls];
    const payload = { aba, titulo, corpo, imagens, links: [...blocoPendingLinks] };
    let error;
    if (blocoEditandoId) {
      ({ error } = await sb.from('conteudo_abas').update(payload).eq('id', blocoEditandoId));
    } else {
      const { data: ord } = await sb
        .from('conteudo_abas')
        .select('ordem')
        .order('ordem', { ascending: false })
        .limit(1)
        .single();
      payload.ordem = (ord?.ordem || 0) + 1;
      ({ error } = await sb.from('conteudo_abas').insert(payload));
    }
    btn.disabled = false;
    btn.textContent = 'Salvar bloco';
    document.getElementById('modal-bloco').classList.add('hidden');
    if (error) {
      toast('Erro ao salvar bloco', 'error');
      return;
    }
    toast('Bloco salvo!', 'success');
    carregarConteudo();
  });

  window.excluirBloco = (id) => {
    confirmar('Excluir bloco', 'Esta ação não pode ser desfeita.', async () => {
      await sb.from('conteudo_abas').delete().eq('id', id);
      toast('Bloco excluído', 'success');
      carregarConteudo();
    }, 'Excluir');
  };
}

window._renderBlocoLinks = function renderBlocoLinks() {
  const c = document.getElementById('bloco-links-preview');
  c.innerHTML = '';
  (blocoPendingLinks || []).forEach((l, i) => {
    const div = document.createElement('div');
    div.className = 'pending-link-item';
    div.innerHTML = `<span>🔗 ${esc(l.texto)}</span><button onclick="window.removerBlocoLink(${i})">✕</button>`;
    c.appendChild(div);
  });
};

window.removerBlocoLink = (i) => {
  blocoPendingLinks.splice(i, 1);
  window._renderBlocoLinks();
};
