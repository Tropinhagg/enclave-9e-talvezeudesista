import { sb } from '../services/supabase.js';
import { esc, toast } from './ui.js';
import { getUsuario, getPerfil, registrarLog } from './auth.js';
import { verificarEConcederBadges } from './gamificacao.js';

let quill = null;
let artigoEditandoId = null;

function sanitizarHTML(html) {
  const temp = document.createElement('div');
  temp.innerHTML = html;
  const scripts = temp.querySelectorAll('script, iframe, object, embed, form, input, textarea, select, button, style, link');
  scripts.forEach(el => el.remove());
  const allElements = temp.querySelectorAll('*');
  allElements.forEach(el => {
    const attrs = el.attributes;
    for (let i = attrs.length - 1; i >= 0; i--) {
      const name = attrs[i].name;
      if (name.startsWith('on') || name === 'srcset' || name === 'srcdoc') {
        el.removeAttribute(name);
      }
    }
  });
  return temp.innerHTML;
}

export async function carregarArtigos() {
  const container = document.getElementById('artigos-grid');
  container.innerHTML = '<div class="skeleton" style="height:200px;"></div>';

  const perfil = getPerfil();
  const isProf = perfil && perfil.role !== 'aluno';

  const { data: artigos, error } = await sb
    .from('artigos')
    .select('*, autor:autor_id(nome, apelido, foto_url)')
    .order('criado_em', { ascending: false });

  if (error) {
    console.warn('Erro ao carregar artigos:', error);
    container.innerHTML = '<div class="empty-state-illustrated"><span class="empty-art">📝</span><p>Erro ao carregar artigos</p></div>';
    return;
  }

  const btnNovo = document.getElementById('btn-novo-artigo');
  if (isProf) {
    btnNovo.classList.remove('hidden');
  }

  if (!artigos?.length) {
    container.innerHTML = '<div class="empty-state-illustrated"><span class="empty-art">📝</span><p>Nenhum artigo publicado ainda</p><div class="empty-hint">Artigos e textos complementares aparecerão aqui</div></div>';
    return;
  }

  const visiveis = isProf ? artigos : artigos.filter((a) => a.publicado);

  if (!visiveis.length) {
    container.innerHTML = '<div class="empty-state-illustrated"><span class="empty-art">📝</span><p>Nenhum artigo publicado ainda</p><div class="empty-hint">Artigos e textos complementares aparecerão aqui</div></div>';
    return;
  }

  container.innerHTML = visiveis
    .map(
      (a) => `
    <div class="artigo-card" data-id="${esc(a.id)}">
      ${a.imagem_capa ? `<img class="artigo-capa" src="${esc(a.imagem_capa)}" alt="" loading="lazy" />` : '<div class="artigo-capa-placeholder"><span>📝</span></div>'}
      <div class="artigo-card-body">
        <div class="artigo-titulo">${esc(a.titulo)}${!a.publicado ? ' <span class="badge badge-geral">Rascunho</span>' : ''}</div>
        ${a.resumo ? `<div class="artigo-resumo">${esc(a.resumo)}</div>` : ''}
        <div class="artigo-meta">
          <span>${a.autor ? esc(a.autor.apelido || a.autor.nome) : '—'}</span>
          <span>·</span>
          <span>${new Date(a.publicado_em || a.criado_em).toLocaleDateString('pt-BR')}</span>
        </div>
      </div>
    </div>`
    )
    .join('');

  container.querySelectorAll('.artigo-card').forEach((card) => {
    card.addEventListener('click', () => abrirLeitor(card.dataset.id));
  });
}

export async function abrirLeitor(artigoId) {
  const { data: artigo, error } = await sb
    .from('artigos')
    .select('*, autor:autor_id(nome, apelido, foto_url)')
    .eq('id', artigoId)
    .single();

  if (error || !artigo) {
    toast('Artigo não encontrado', 'error');
    return;
  }

  document.getElementById('leitor-titulo').textContent = artigo.titulo;
  const container = document.getElementById('leitor-conteudo');

  const autorNome = artigo.autor ? esc(artigo.autor.apelido || artigo.autor.nome) : '—';
  const dataStr = new Date(artigo.publicado_em || artigo.criado_em).toLocaleDateString('pt-BR');

  container.innerHTML = `
    ${artigo.imagem_capa ? `<img class="leitor-capa" src="${esc(artigo.imagem_capa)}" alt="" />` : ''}
    <div class="leitor-meta">Por ${autorNome} · ${dataStr}</div>
    ${artigo.resumo ? `<div class="leitor-resumo">${esc(artigo.resumo)}</div>` : ''}
    <div class="leitor-corpo">${sanitizarHTML(artigo.conteudo || '')}</div>
  `;

  document.getElementById('main-app').classList.add('hidden');
  document.getElementById('tela-leitor-artigo').classList.remove('hidden');
  document.getElementById('tela-editor-artigo').classList.add('hidden');
  document.getElementById('tela-simulado').classList.add('hidden');
  document.getElementById('tela-desafio').classList.add('hidden');

  registrarLog('leu_artigo', { artigo_id: artigoId });
  verificarEConcederBadges();
}

export async function abrirEditor(artigoId) {
  const perfil = getPerfil();
  if (!perfil || perfil.role === 'aluno') {
    toast('Acesso negado', 'error');
    return;
  }

  artigoEditandoId = artigoId || null;
  document.getElementById('editor-artigo-titulo').textContent = artigoId ? 'Editar artigo' : 'Novo artigo';

  document.getElementById('artigo-titulo-inp').value = '';
  document.getElementById('artigo-resumo-inp').value = '';
  document.getElementById('artigo-capa-inp').value = '';
  document.getElementById('artigo-publicado-chk').checked = false;

  if (quill) {
    quill.setText('');
  }

  if (artigoId) {
    const { data: artigo } = await sb.from('artigos').select('*').eq('id', artigoId).single();
    if (artigo) {
      document.getElementById('artigo-titulo-inp').value = artigo.titulo || '';
      document.getElementById('artigo-resumo-inp').value = artigo.resumo || '';
      document.getElementById('artigo-capa-inp').value = artigo.imagem_capa || '';
      document.getElementById('artigo-publicado-chk').checked = artigo.publicado || false;
      if (quill && artigo.conteudo) {
        quill.root.innerHTML = sanitizarHTML(artigo.conteudo);
      }
    }
  }

  document.getElementById('main-app').classList.add('hidden');
  document.getElementById('tela-leitor-artigo').classList.add('hidden');
  document.getElementById('tela-editor-artigo').classList.remove('hidden');
  document.getElementById('tela-simulado').classList.add('hidden');
  document.getElementById('tela-desafio').classList.add('hidden');

  initQuill();
}

async function salvarArtigo() {
  const titulo = document.getElementById('artigo-titulo-inp').value.trim();
  if (!titulo) {
    toast('Digite um título', 'warn');
    return;
  }

  if (!quill) {
    toast('Editor não iniciado', 'error');
    return;
  }

  const conteudo = quill.root.innerHTML;
  if (!conteudo || conteudo === '<p><br></p>') {
    toast('Escreva o conteúdo do artigo', 'warn');
    return;
  }

  const resumo = document.getElementById('artigo-resumo-inp').value.trim();
  const imagem_capa = document.getElementById('artigo-capa-inp').value.trim();
  const publicado = document.getElementById('artigo-publicado-chk').checked;

  const payload = {
    titulo,
    conteudo,
    resumo: resumo || null,
    imagem_capa: imagem_capa || null,
    publicado,
    autor_id: getUsuario().id,
    atualizado_em: new Date().toISOString(),
  };

  if (publicado) {
    payload.publicado_em = new Date().toISOString();
  }

  if (artigoEditandoId) {
    const { error } = await sb.from('artigos').update(payload).eq('id', artigoEditandoId);
    if (error) {
      toast('Erro ao salvar artigo', 'error');
      return;
    }
    toast('Artigo atualizado!', 'success');
  } else {
    const { error } = await sb.from('artigos').insert(payload);
    if (error) {
      toast('Erro ao criar artigo', 'error');
      return;
    }
    toast('Artigo criado!', 'success');
  }

  fecharEditor();
  carregarArtigos();
}

function fecharEditor() {
  artigoEditandoId = null;
  document.getElementById('tela-editor-artigo').classList.add('hidden');
  document.getElementById('main-app').classList.remove('hidden');
}

export function initArtigos() {
  document.getElementById('btn-novo-artigo').addEventListener('click', () => abrirEditor(null));
  document.getElementById('btn-voltar-leitor').addEventListener('click', () => {
    document.getElementById('tela-leitor-artigo').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
  });
  document.getElementById('btn-voltar-editor-artigo').addEventListener('click', fecharEditor);
  document.getElementById('btn-publicar-artigo').addEventListener('click', salvarArtigo);
}

async function initQuill() {
  if (quill) return;
  if (typeof Quill === 'undefined') {
    toast('Erro ao carregar editor', 'warn');
    return;
  }
  if (!document.getElementById('quill-editor')) return;
  quill = new Quill('#quill-editor', {
    theme: 'snow',
    modules: {
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['blockquote', 'code-block'],
        [{ align: [] }],
        ['link', 'image'],
        ['clean'],
      ],
    },
  });
}

export async function initQuillOnDemand() {
  await initQuill();
}
