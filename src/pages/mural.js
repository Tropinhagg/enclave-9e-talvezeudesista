import { sb } from '../services/supabase.js';
import { uploadCloudinary } from '../services/cloudinary.js';
import { esc, iniciais, tempoRelativo, toast, confirmar } from './ui.js';
import { getUsuario, getPerfil, registrarLog } from './auth.js';
import { abrirBancoImagens } from './imagembank.js';

let realtimeCanal = null;
let threadPubId = null;
const pendingImages = [];
const pendingLinks = [];

export function getPendingImages() {
  return pendingImages;
}
export function getPendingLinks() {
  return pendingLinks;
}
export function getThreadPubId() {
  return threadPubId;
}

export function iniciarRealtime() {
  if (realtimeCanal) sb.removeChannel(realtimeCanal);
  realtimeCanal = sb
    .channel('tropinha-realtime')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'publicacoes' },
      async (payload) => {
        const { data: post } = await sb
          .from('publicacoes')
          .select('*, usuarios(nome, foto_url), reacoes(id, usuario_id)')
          .eq('id', payload.new.id)
          .single();
        if (post) prependPostCard(post);
      }
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'reacoes' },
      (payload) => {
        const card = document.querySelector(`[data-pub-id="${payload.new.publicacao_id}"]`);
        if (card) {
          const cnt = card.querySelector('.reaction-count');
          if (cnt) cnt.textContent = parseInt(cnt.textContent || 0) + 1;
        }
      }
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'reacoes' },
      (payload) => {
        const card = document.querySelector(`[data-pub-id="${payload.old?.publicacao_id}"]`);
        if (card) {
          const cnt = card.querySelector('.reaction-count');
          if (cnt) cnt.textContent = Math.max(0, parseInt(cnt.textContent || 0) - 1);
        }
      }
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'comentarios' },
      async (payload) => {
        if (threadPubId && payload.new.publicacao_id === threadPubId) {
          const { data: com } = await sb
            .from('comentarios')
            .select('*, usuarios(nome, foto_url), curtidas_comentario(id, usuario_id)')
            .eq('id', payload.new.id)
            .single();
          if (com) appendCommentCard(com);
        }
      }
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'curtidas_comentario' },
      (payload) => {
        const el = document.querySelector(`[data-com-id="${payload.new.comentario_id}"] .com-like-count`);
        if (el) el.textContent = parseInt(el.textContent || 0) + 1;
      }
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'curtidas_comentario' },
      (payload) => {
        const el = document.querySelector(`[data-com-id="${payload.old?.comentario_id}"] .com-like-count`);
        if (el) el.textContent = Math.max(0, parseInt(el.textContent || 0) - 1);
      }
    )
    .subscribe();

  window._realtimeCanal = realtimeCanal;
}

export async function carregarMural() {
  const feed = document.getElementById('feed-mural');
  feed.innerHTML = '<div class="empty-state"><div class="spinner" style="width:24px;height:24px;margin:auto"></div></div>';

  const { data: posts, error: errPosts } = await sb
    .from('publicacoes')
    .select('*, usuarios(nome, foto_url), reacoes(id, usuario_id)')
    .order('fixado', { ascending: false })
    .order('criado_em', { ascending: false });
  if (errPosts) {
    console.warn('Erro ao carregar publicações:', errPosts);
    feed.innerHTML = '<div class="empty-state-illustrated"><span class="empty-art">📋</span><p>Erro ao carregar publicações</p><div class="empty-hint">Tente recarregar a página</div></div>';
    return;
  }

  feed.innerHTML = '';
  if (!posts?.length) {
    feed.innerHTML = '<div class="empty-state-illustrated"><span class="empty-art">📋</span><p>Nenhuma publicação ainda</p><div class="empty-hint">As publicações da turma aparecerão aqui</div></div>';
    return;
  }
  posts.forEach((p) => feed.appendChild(criarPostCard(p)));

  const perfil = getPerfil();
  const av = document.getElementById('compose-avatar');
  if (perfil.foto_url) {
    av.innerHTML = `<img src="${esc(perfil.foto_url)}" alt="" />`;
  } else {
    document.getElementById('compose-initials').textContent = iniciais(perfil.nome || perfil.apelido);
  }
}

function criarPostCard(post) {
  const card = document.createElement('div');
  card.className = `post-card${post.fixado ? ' fixado' : ''}`;
  card.dataset.pubId = post.id;
  const nome = post.usuarios?.nome || 'Usuário';
  const temReacao = post.reacoes?.some((r) => r.usuario_id === getUsuario()?.id);
  const numReacoes = post.reacoes?.length || 0;
  const imgsHtml = (post.imagens || [])
    .map((u) => `<img src="${esc(u)}" alt="imagem do post" loading="lazy" />`)
    .join('');
  const linksHtml = (post.links || [])
    .map((l) => `<a class="post-link-chip" href="${esc(l.url)}" target="_blank" rel="noopener">🔗 ${esc(l.texto || l.url)}</a>`)
    .join('');
  const perfil = getPerfil();
  const manageHtml =
    perfil.role !== 'aluno'
      ? `<div class="post-manage"><button class="post-manage-btn danger" onclick="window.excluirPost('${esc(post.id)}',event)">🗑️</button><button class="post-manage-btn" onclick="window.toggleFixado('${esc(post.id)}',${post.fixado},event)">${post.fixado ? '📌 Desafixar' : '📌 Fixar'}</button></div>`
      : '';
  card.innerHTML = `
    <div class="post-header">
      <div class="avatar-sm">${post.usuarios?.foto_url ? `<img src="${esc(post.usuarios.foto_url)}" alt="" />` : iniciais(nome)}</div>
      <span class="post-author-name">${esc(nome)}</span>
      <span class="post-time">${tempoRelativo(post.criado_em)}</span>
    </div>
    ${post.texto ? `<div class="post-text">${esc(post.texto)}</div>` : ''}
    ${imgsHtml ? `<div class="post-images">${imgsHtml}</div>` : ''}
    ${linksHtml ? `<div class="post-links">${linksHtml}</div>` : ''}
    <div class="post-footer">
      <button class="reaction-btn${temReacao ? ' ativo' : ''}" data-pub="${esc(post.id)}">❤️ <span class="reaction-count">${numReacoes}</span></button>
      <button class="reaction-btn" onclick="window.abrirThread('${esc(post.id)}',event)">💬</button>
      <button class="reaction-btn" onclick="window.compartilharPost('${esc(post.id)}',event)">🔗</button>
      ${manageHtml}
    </div>`;
  card.addEventListener('click', (e) => {
    if (e.target.closest('button') || e.target.closest('a') || e.target.closest('img')) return;
    window.abrirThread(post.id);
  });
  card.querySelector('.reaction-btn[data-pub]').addEventListener('click', async (e) => {
    e.stopPropagation();
    await toggleReacao(post.id, e.currentTarget);
  });
  return card;
}

function prependPostCard(post) {
  const feed = document.getElementById('feed-mural');
  const emptyEl = feed.querySelector('.empty-state');
  if (emptyEl) emptyEl.remove();
  feed.prepend(criarPostCard(post));
}

async function toggleReacao(pubId, btn) {
  const jaCurtiu = btn.classList.contains('ativo');
  const cnt = btn.querySelector('.reaction-count');
  if (jaCurtiu) {
    btn.classList.remove('ativo');
    cnt.textContent = Math.max(0, parseInt(cnt.textContent || 0) - 1);
    await sb.from('reacoes').delete().eq('publicacao_id', pubId).eq('usuario_id', getUsuario().id);
  } else {
    btn.classList.add('ativo');
    cnt.textContent = parseInt(cnt.textContent || 0) + 1;
    await sb.from('reacoes').insert({ publicacao_id: pubId, usuario_id: getUsuario().id });
  }
  await registrarLog('reagiu', { publicacao_id: pubId });
}

window.excluirPost = async (id, e) => {
  e.stopPropagation();
  confirmar('Excluir publicação', 'Esta ação não pode ser desfeita.', async () => {
    await sb.from('publicacoes').delete().eq('id', id);
    document.querySelector(`[data-pub-id="${id}"]`)?.remove();
    toast('Publicação excluída', 'success');
  }, 'Excluir');
};

window.toggleFixado = async (id, atual, e) => {
  e.stopPropagation();
  await sb.from('publicacoes').update({ fixado: !atual }).eq('id', id);
  carregarMural();
};

window.compartilharPost = async (pubId, e) => {
  if (e) e.stopPropagation();
  const url = `${location.href.split('#')[0]}#pub-${pubId}`;
  await navigator.clipboard.writeText(url).catch(() => {});
  await sb.from('compartilhamentos').insert({ publicacao_id: pubId, usuario_id: getUsuario().id }).catch(() => {});
  await registrarLog('compartilhou', { publicacao_id: pubId });
  toast('Link copiado!', 'success');
};

export function initMuralCompose() {
  document.getElementById('btn-publicar').addEventListener('click', async () => {
    const texto = document.getElementById('compose-texto').value.trim();
    if (!texto && !pendingImages.length && !pendingLinks.length) {
      toast('Escreva algo antes de publicar.', 'warn');
      return;
    }
    const btn = document.getElementById('btn-publicar');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';
    const urls = [];
    for (const img of pendingImages) {
      if (img.remoteUrl) {
        urls.push(img.remoteUrl);
      } else if (img.file) {
        const url = await uploadCloudinary(img.file);
        if (url) urls.push(url);
      }
    }
    const fixado = document.getElementById('chk-fixado').checked;
    const { data, error } = await sb
      .from('publicacoes')
      .insert({
        autor_id: getUsuario().id,
        texto: texto || null,
        imagens: urls,
        links: [...pendingLinks],
        fixado,
      })
      .select('*, usuarios(nome, foto_url), reacoes(id, usuario_id)')
      .single();
    btn.disabled = false;
    btn.textContent = 'Publicar';
    if (error) {
      toast('Erro ao publicar', 'error');
      return;
    }
    document.getElementById('compose-texto').value = '';
    document.getElementById('chk-fixado').checked = false;
    pendingImages.length = 0;
    pendingLinks.length = 0;
    document.getElementById('pending-images-preview').innerHTML = '';
    document.getElementById('pending-links-list').innerHTML = '';
    await registrarLog('publicacao_criada', { publicacao_id: data.id });
    toast('Publicado!', 'success');
  });

  document.getElementById('btn-add-imagem').addEventListener('click', () => {
    document.getElementById('file-compose-img').click();
  });

  document.getElementById('btn-add-imagem-bank').addEventListener('click', () => {
    abrirBancoImagens((url) => {
      if (!url) return;
      const previewUrl = url;
      pendingImages.push({ file: null, previewUrl, remoteUrl: url });
      const wrap = document.createElement('div');
      wrap.className = 'pending-img-wrap';
      const idx = pendingImages.length - 1;
      wrap.innerHTML = `<img src="${previewUrl}" alt="" /><button class="pending-img-remove" onclick="removerPendingImg(${idx})">✕</button>`;
      document.getElementById('pending-images-preview').appendChild(wrap);
    });
  });

  document.getElementById('file-compose-img').addEventListener('change', (e) => {
    Array.from(e.target.files).forEach((file) => {
      if (pendingImages.length >= 6) {
        toast('Máximo 6 imagens', 'warn');
        return;
      }
      const previewUrl = URL.createObjectURL(file);
      pendingImages.push({ file, previewUrl });
      const wrap = document.createElement('div');
      wrap.className = 'pending-img-wrap';
      const idx = pendingImages.length - 1;
      wrap.innerHTML = `<img src="${previewUrl}" alt="" /><button class="pending-img-remove" onclick="removerPendingImg(${idx})">✕</button>`;
      document.getElementById('pending-images-preview').appendChild(wrap);
    });
    e.target.value = '';
  });

  document.getElementById('btn-add-link').addEventListener('click', () => {
    window._linkTarget = 'compose';
    document.getElementById('inp-link-texto').value = '';
    document.getElementById('inp-link-url').value = '';
    document.getElementById('modal-link').classList.remove('hidden');
  });
}

window.removerPendingImg = (idx) => {
  pendingImages.splice(idx, 1);
  renderPendingImages();
};

function renderPendingImages() {
  const c = document.getElementById('pending-images-preview');
  c.innerHTML = '';
  pendingImages.forEach(({ previewUrl }, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'pending-img-wrap';
    wrap.innerHTML = `<img src="${previewUrl}" alt="" /><button class="pending-img-remove" onclick="removerPendingImg(${i})">✕</button>`;
    c.appendChild(wrap);
  });
}

export function renderPendingLinks() {
  const c = document.getElementById('pending-links-list');
  c.innerHTML = '';
  pendingLinks.forEach((l, i) => {
    const div = document.createElement('div');
    div.className = 'pending-link-item';
    div.innerHTML = `<span>🔗 ${esc(l.texto)}</span><button onclick="removerPendingLink(${i})">✕</button>`;
    c.appendChild(div);
  });
}

window.removerPendingLink = (i) => {
  pendingLinks.splice(i, 1);
  renderPendingLinks();
};

export function initLinkModal() {
  document.getElementById('btn-link-cancelar').addEventListener('click', () => {
    document.getElementById('modal-link').classList.add('hidden');
  });
  document.getElementById('btn-link-confirmar').addEventListener('click', () => {
    const texto = document.getElementById('inp-link-texto').value.trim();
    const url = document.getElementById('inp-link-url').value.trim();
    if (!url) {
      toast('URL obrigatória', 'warn');
      return;
    }
    const link = { texto: texto || url, url };
    if (window._linkTarget === 'compose') {
      pendingLinks.push(link);
      renderPendingLinks();
    } else     if (window._linkTarget === 'bloco') {
      window._blocoPendingLinks.push(link);
      window._renderBlocoLinks();
    }
    document.getElementById('inp-link-texto').value = '';
    document.getElementById('inp-link-url').value = '';
    document.getElementById('modal-link').classList.add('hidden');
  });
}

/* ══════════════════════════════════════════
   THREAD / COMENTÁRIOS
   ══════════════════════════════════════════ */
window.abrirThread = async (pubId, e) => {
  if (e) e.stopPropagation();
  threadPubId = pubId;
  document.getElementById('feed-mural').style.display = 'none';
  document.getElementById('tela-thread').classList.add('active');
  const perfil = getPerfil();
  const av = document.getElementById('thread-compose-avatar');
  if (perfil.foto_url) {
    av.innerHTML = `<img src="${esc(perfil.foto_url)}" alt="" />`;
  } else {
    document.getElementById('thread-compose-initials').textContent = iniciais(perfil.nome || perfil.apelido);
  }
  await carregarThread(pubId);
};

async function carregarThread(pubId) {
  const { data: post } = await sb
    .from('publicacoes')
    .select('*, usuarios(nome, foto_url), reacoes(id, usuario_id)')
    .eq('id', pubId)
    .single();
  const container = document.getElementById('thread-post-container');
  if (post) {
    const nome = post.usuarios?.nome || 'Usuário';
    const temReacao = post.reacoes?.some((r) => r.usuario_id === getUsuario()?.id);
    const numReacoes = post.reacoes?.length || 0;
    const imgsHtml = (post.imagens || [])
      .map((u) => `<img src="${esc(u)}" style="max-width:100%;border-radius:10px;margin-bottom:8px;" />`)
      .join('');
    const linksHtml = (post.links || [])
      .map((l) => `<a class="post-link-chip" href="${esc(l.url)}" target="_blank" rel="noopener">🔗 ${esc(l.texto || l.url)}</a>`)
      .join('');
    container.innerHTML = `<div class="thread-post-full"><div class="post-header"><div class="avatar-sm">${post.usuarios?.foto_url ? `<img src="${esc(post.usuarios.foto_url)}" alt="" />` : iniciais(nome)}</div><span class="post-author-name">${esc(nome)}</span><span class="post-time">${tempoRelativo(post.criado_em)}</span></div>${post.texto ? `<div class="post-text" style="font-size:16px;">${esc(post.texto)}</div>` : ''}${imgsHtml}${linksHtml ? `<div class="post-links">${linksHtml}</div>` : ''}<div class="post-footer"><button class="reaction-btn${temReacao ? ' ativo' : ''}" id="thread-reacao-btn" data-pub="${esc(pubId)}">❤️ <span class="reaction-count">${numReacoes}</span></button><button class="reaction-btn" onclick="window.compartilharPost('${esc(pubId)}')">🔗 Compartilhar</button></div></div>`;
    document.getElementById('thread-reacao-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      await toggleReacao(pubId, e.currentTarget);
    });
  }
  const { data: comentarios } = await sb
    .from('comentarios')
    .select('*, usuarios(nome, foto_url), curtidas_comentario(id, usuario_id)')
    .eq('publicacao_id', pubId)
    .order('criado_em');
  const lista = document.getElementById('comments-list');
  lista.innerHTML = '';
  const raiz = (comentarios || []).filter((c) => !c.parent_id);
  const respostas = (comentarios || []).filter((c) => !!c.parent_id);
  raiz.forEach((c) => {
    lista.appendChild(criarCommentCard(c));
    respostas
      .filter((r) => r.parent_id === c.id)
      .forEach((r) => lista.appendChild(criarCommentCard(r, true)));
  });
}

function criarCommentCard(com, isReply = false) {
  const div = document.createElement('div');
  div.className = `comment-card${isReply ? ' reply' : ''}`;
  div.dataset.comId = com.id;
  const nome = com.usuarios?.nome || 'Usuário';
  const jaCurtiu = com.curtidas_comentario?.some((c) => c.usuario_id === getUsuario()?.id);
  const numCurtidas = com.curtidas_comentario?.length || 0;
  const podeExcluir = getUsuario()?.id === com.autor_id || getPerfil().role !== 'aluno';
  div.innerHTML =
    `<div class="comment-header"><div class="avatar-sm" style="width:26px;height:26px;font-size:11px;">${com.usuarios?.foto_url ? `<img src="${esc(com.usuarios.foto_url)}" alt="" />` : iniciais(nome)}</div><span class="comment-name">${esc(nome)}</span><span class="comment-time">${tempoRelativo(com.criado_em)}</span></div><div class="comment-text">${esc(com.texto)}</div><div class="comment-footer"><button class="reaction-btn${jaCurtiu ? ' ativo' : ''}" onclick="window.toggleCurtidaComentario('${esc(com.id)}',this)">❤️ <span class="com-like-count">${numCurtidas}</span></button>${!isReply ? `<button class="reaction-btn" onclick="window.abrirReplyCompose('${esc(com.id)}')">↩️ Responder</button>` : ''} ${podeExcluir ? `<button class="reaction-btn danger-text" onclick="window.excluirComentario('${esc(com.id)}')">🗑️</button>` : ''}</div>${!isReply ? `<div id="reply-compose-${com.id}" class="hidden"></div>` : ''}`;
  return div;
}

function appendCommentCard(com) {
  document.getElementById('comments-list').appendChild(criarCommentCard(com, !!com.parent_id));
}

window.abrirReplyCompose = (parentId) => {
  const area = document.getElementById(`reply-compose-${parentId}`);
  if (!area) return;
  if (!area.classList.contains('hidden')) {
    area.classList.add('hidden');
    return;
  }
  area.classList.remove('hidden');
  area.innerHTML = `<div class="reply-compose"><textarea class="compose-textarea" id="reply-text-${parentId}" rows="2" placeholder="Escreva uma resposta…"></textarea><div style="display:flex;justify-content:flex-end;margin-top:8px;gap:8px;"><button class="btn-ghost btn-sm" onclick="document.getElementById('reply-compose-${parentId}').classList.add('hidden')">Cancelar</button><button class="btn-primary btn-sm" onclick="window.enviarResposta('${parentId}')">Responder</button></div></div>`;
};

window.enviarResposta = async (parentId) => {
  const texto = document.getElementById(`reply-text-${parentId}`)?.value.trim();
  if (!texto) return;
  await sb.from('comentarios').insert({
    publicacao_id: threadPubId,
    autor_id: getUsuario().id,
    parent_id: parentId,
    texto,
  });
  document.getElementById(`reply-compose-${parentId}`).classList.add('hidden');
  await registrarLog('comentou', { publicacao_id: threadPubId });
};

window.excluirComentario = async (id) => {
  confirmar('Excluir comentário', 'Esta ação não pode ser desfeita.', async () => {
    await sb.from('comentarios').delete().eq('id', id);
    document.querySelector(`[data-com-id="${id}"]`)?.remove();
    toast('Comentário excluído', 'success');
  }, 'Excluir');
};

window.toggleCurtidaComentario = async (comId, btn) => {
  const jaCurtiu = btn.classList.contains('ativo');
  const cnt = btn.querySelector('.com-like-count');
  if (jaCurtiu) {
    btn.classList.remove('ativo');
    cnt.textContent = Math.max(0, parseInt(cnt.textContent || 0) - 1);
    await sb.from('curtidas_comentario').delete().eq('comentario_id', comId).eq('usuario_id', getUsuario().id);
  } else {
    btn.classList.add('ativo');
    cnt.textContent = parseInt(cnt.textContent || 0) + 1;
    await sb.from('curtidas_comentario').insert({ comentario_id: comId, usuario_id: getUsuario().id });
  }
  await registrarLog('curtiu_comentario', { comentario_id: comId });
};

export function initThread() {
  document.getElementById('btn-comentar').addEventListener('click', async () => {
    const texto = document.getElementById('thread-compose-texto').value.trim();
    if (!texto) return;
    const btn = document.getElementById('btn-comentar');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';
    await sb.from('comentarios').insert({
      publicacao_id: threadPubId,
      autor_id: getUsuario().id,
      parent_id: null,
      texto,
    });
    btn.disabled = false;
    btn.textContent = 'Comentar';
    document.getElementById('thread-compose-texto').value = '';
    await registrarLog('comentou', { publicacao_id: threadPubId });
  });

  document.getElementById('btn-thread-back').addEventListener('click', () => {
    threadPubId = null;
    document.getElementById('feed-mural').style.display = '';
    document.getElementById('tela-thread').classList.remove('active');
  });
}
