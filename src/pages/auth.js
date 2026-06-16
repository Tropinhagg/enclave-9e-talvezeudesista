import { sb, EMAIL_DOMAIN } from '../services/supabase.js';
import { uploadCloudinary } from '../services/cloudinary.js';
import { esc, iniciais, toast, initUI } from './ui.js';
import { buildBackgroundCarousel } from './carousel.js';

let perfil = null;
let usuario = null;
let avatarPendente = null;

export function getUsuario() {
  return usuario;
}
export function getPerfil() {
  return perfil;
}

export async function iniciar() {
  buildBackgroundCarousel();
  initUI();

  const hash = window.location.hash;
  if (hash.includes('access_token') && hash.includes('type=recovery')) {
    document.getElementById('banner-reset').classList.remove('hidden');
    document.getElementById('form-nova-senha').classList.remove('hidden');
    document.getElementById('inp-apelido').closest('.form-group').classList.add('hidden');
    document.getElementById('inp-senha').closest('.form-group').classList.add('hidden');
    document.getElementById('btn-entrar').classList.add('hidden');
    document.getElementById('btn-esqueci').classList.add('hidden');
    return;
  }

  const { data: { session } } = await Promise.race([
    sb.auth.getSession(),
    new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 8000)),
  ]).catch(() => ({ data: { session: null } }));

  if (!session) return;
  usuario = session.user;

  const { data: p } = await sb.from('usuarios').select('*').eq('id', session.user.id).single();
  if (!p) {
    await sb.auth.signOut();
    return;
  }
  perfil = p;
  mostrarApp();
}

function mostrarApp() {
  document.getElementById('tela-login').classList.add('hidden');
  document.getElementById('header').classList.remove('hidden');
  document.getElementById('main-app').classList.remove('hidden');
  document.getElementById('mobile-nav').classList.remove('hidden');

  const nome = perfil.nome || perfil.apelido;
  document.getElementById('header-nome').textContent = nome;
  document.getElementById('header-initials').textContent = iniciais(nome);
  document.getElementById('dd-nome').textContent = nome;
  const roleMap = { admin: 'tag-admin', professor: 'tag-prof', aluno: 'tag-aluno' };
  document.getElementById('dd-role').innerHTML = `<span class="tag-role ${roleMap[perfil.role] || 'tag-aluno'}">${esc(perfil.role)}</span>`;
  if (perfil.foto_url) {
    document.getElementById('header-avatar').innerHTML = `<img src="${esc(perfil.foto_url)}" alt="${esc(nome)}" />`;
  }
  if (perfil.role !== 'aluno') {
    ['mural-compose-area', 'btn-novo-bloco', 'btn-novo-simulado', 'btn-novo-material', 'btn-novo-desafio'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('hidden');
    });
  }

  window._iniciarRealtime();
  window._navigateTo('inicio');
}

export function initAuth() {
  document.getElementById('btn-entrar').addEventListener('click', async () => {
    const apelido = document.getElementById('inp-apelido').value.trim();
    const senha = document.getElementById('inp-senha').value;
    if (!apelido || !senha) {
      document.getElementById('login-erro').textContent = 'Preencha apelido e senha.';
      return;
    }
    const btn = document.getElementById('btn-entrar');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';
    document.getElementById('login-erro').textContent = '';

    const { data: emailReal } = await sb.rpc('email_por_apelido', { p_apelido: apelido });
    if (!emailReal) {
      btn.disabled = false;
      btn.innerHTML = 'Entrar';
      document.getElementById('login-erro').textContent = 'Apelido ou senha incorretos.';
      return;
    }

    const { data, error } = await sb.auth.signInWithPassword({ email: emailReal, password: senha });
    btn.disabled = false;
    btn.innerHTML = 'Entrar';
    if (error) {
      document.getElementById('login-erro').textContent = 'Apelido ou senha incorretos.';
      return;
    }
    usuario = data.user;
    const { data: p } = await sb.from('usuarios').select('*').eq('id', data.user.id).single();
    if (!p) {
      document.getElementById('login-erro').textContent = 'Perfil não encontrado. Contate o admin.';
      return;
    }
    perfil = p;
    await registrarLog('login');
    mostrarApp();
  });

  document.getElementById('inp-senha').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-entrar').click();
  });
  document.getElementById('inp-apelido').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-entrar').click();
  });

  document.getElementById('btn-esqueci').addEventListener('click', async () => {
    const apelido = document.getElementById('inp-apelido').value.trim();
    if (!apelido) {
      document.getElementById('login-erro').textContent = 'Digite seu apelido primeiro.';
      return;
    }
    const { data: emailReal } = await sb.rpc('email_por_apelido', { p_apelido: apelido });
    if (emailReal) await sb.auth.resetPasswordForEmail(emailReal);
    document.getElementById('login-erro').style.color = 'var(--success)';
    document.getElementById('login-erro').textContent = 'Link de redefinição enviado (se o e-mail existir).';
  });

  document.getElementById('btn-salvar-nova-senha').addEventListener('click', async () => {
    const novaSenha = document.getElementById('inp-nova-senha').value;
    if (novaSenha.length < 6) {
      toast('Senha deve ter ao menos 6 caracteres', 'warn');
      return;
    }
    const { error } = await sb.auth.updateUser({ password: novaSenha });
    if (error) {
      toast('Erro ao salvar senha', 'error');
      return;
    }
    toast('Senha atualizada! Faça login.', 'success');
    window.location.hash = '';
    window.location.reload();
  });

  document.getElementById('dd-logout').addEventListener('click', async () => {
    await registrarLog('logout');
    if (typeof window._realtimeCanal !== 'undefined' && window._realtimeCanal) {
      sb.removeChannel(window._realtimeCanal);
    }
    if (typeof window._salvamentoInterval !== 'undefined' && window._salvamentoInterval) {
      clearInterval(window._salvamentoInterval);
    }
    await sb.auth.signOut();
    window.location.reload();
  });

  document.getElementById('dd-perfil').addEventListener('click', abrirModalPerfil);
  document.getElementById('dd-senha').addEventListener('click', () => {
    document.getElementById('account-dropdown').classList.add('hidden');
    document.getElementById('modal-senha').classList.remove('hidden');
  });
  document.getElementById('btn-senha-cancelar').addEventListener('click', () => {
    document.getElementById('modal-senha').classList.add('hidden');
  });
  document.getElementById('btn-senha-enviar').addEventListener('click', async () => {
    await sb.auth.resetPasswordForEmail(perfil.apelido + EMAIL_DOMAIN);
    toast('Link de redefinição enviado!', 'success');
    document.getElementById('modal-senha').classList.add('hidden');
  });
}

function abrirModalPerfil() {
  document.getElementById('account-dropdown').classList.add('hidden');
  const pv = document.getElementById('perfil-avatar-preview');
  if (perfil.foto_url) {
    pv.innerHTML = `<img src="${esc(perfil.foto_url)}" alt="avatar" />`;
  } else {
    pv.textContent = iniciais(perfil.nome || perfil.apelido);
  }
  document.getElementById('perfil-nome').value = perfil.nome || '';
  document.getElementById('modal-perfil').classList.remove('hidden');
}

export function initPerfil() {
  document.getElementById('btn-perfil-fechar').addEventListener('click', () => {
    document.getElementById('modal-perfil').classList.add('hidden');
  });
  document.getElementById('btn-trocar-avatar').addEventListener('click', () => {
    document.getElementById('file-avatar').click();
  });
  document.getElementById('file-avatar').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    avatarPendente = file;
    document.getElementById('perfil-avatar-preview').innerHTML = `<img src="${URL.createObjectURL(file)}" alt="preview" />`;
  });
  document.getElementById('btn-perfil-salvar').addEventListener('click', async () => {
    const nome = document.getElementById('perfil-nome').value.trim();
    let foto_url = perfil.foto_url;
    if (avatarPendente) {
      const url = await uploadCloudinary(avatarPendente);
      if (url) foto_url = url;
      avatarPendente = null;
    }
    const { error } = await sb.from('usuarios').update({ nome, foto_url }).eq('id', usuario.id);
    if (error) {
      toast('Erro ao salvar perfil', 'error');
      return;
    }
    perfil = { ...perfil, nome, foto_url };
    document.getElementById('header-nome').textContent = nome;
    document.getElementById('dd-nome').textContent = nome;
    if (foto_url) {
      document.getElementById('header-avatar').innerHTML = `<img src="${esc(foto_url)}" alt="${esc(nome)}" />`;
    } else {
      document.getElementById('header-initials').textContent = iniciais(nome);
    }
    toast('Perfil salvo!', 'success');
    document.getElementById('modal-perfil').classList.add('hidden');
  });
}

export async function registrarLog(acao, detalhes = {}) {
  if (!usuario) return;
  try {
    await sb.from('logs').insert({ usuario_id: usuario.id, acao, detalhes });
  } catch {}
}
