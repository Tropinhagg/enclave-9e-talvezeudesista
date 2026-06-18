import { sb } from '../services/supabase.js';
import { esc, toast, confirmar, iniciais } from './ui.js';
import { getPerfil } from './auth.js';

let usuariosCache = [];

export function initAdminUsuarios() {
  document.getElementById('btn-admin-usuarios-fechar').addEventListener('click', fecharAdminUsuarios);
  document.getElementById('btn-admin-usuarios-add').addEventListener('click', abrirModalCriar);
  document.getElementById('btn-admin-criar-usuario').addEventListener('click', criarUsuario);
  document.getElementById('btn-admin-criar-cancelar').addEventListener('click', () => {
    document.getElementById('modal-admin-criar-usuario').classList.add('hidden');
  });
  document.getElementById('btn-admin-editar-cancelar').addEventListener('click', () => {
    document.getElementById('modal-admin-editar-usuario').classList.add('hidden');
  });
  document.getElementById('btn-admin-editar-salvar').addEventListener('click', editarUsuario);
  document.getElementById('btn-admin-senha-cancelar').addEventListener('click', () => {
    document.getElementById('modal-admin-reset-senha').classList.add('hidden');
  });
  document.getElementById('btn-admin-senha-salvar').addEventListener('click', resetarSenha);
  document.getElementById('btn-admin-notificar-enviar').addEventListener('click', enviarNotificacao);
  document.getElementById('btn-admin-notificar-cancelar').addEventListener('click', () => {
    document.getElementById('modal-admin-notificar').classList.add('hidden');
  });
  document.querySelectorAll('[data-notificar-alvo]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.getElementById('admin-notificar-alvo').value = btn.dataset.notificarAlvo;
    });
  });
  document.getElementById('admin-buscar-usuarios').addEventListener('input', (e) => {
    filtrarUsuarios(e.target.value);
  });
  document.querySelectorAll('.admin-role-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-role-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      filtrarUsuarios(document.getElementById('admin-buscar-usuarios').value);
    });
  });
}

export function abrirAdminUsuarios() {
  document.getElementById('modal-admin-usuarios').classList.remove('hidden');
  carregarUsuarios();
}

function fecharAdminUsuarios() {
  document.getElementById('modal-admin-usuarios').classList.add('hidden');
  document.getElementById('modal-admin-criar-usuario').classList.add('hidden');
  document.getElementById('modal-admin-editar-usuario').classList.add('hidden');
  document.getElementById('modal-admin-reset-senha').classList.add('hidden');
  document.getElementById('modal-admin-notificar').classList.add('hidden');
}

async function carregarUsuarios() {
  const lista = document.getElementById('admin-usuarios-lista');
  lista.innerHTML = '<div class="admin-loading">Carregando...</div>';

  const { data: usuarios, error } = await sb.rpc('admin_listar_usuarios');
  if (error) {
    lista.innerHTML = '<div class="empty-state"><p>Erro ao carregar usuários</p></div>';
    return;
  }

  usuariosCache = usuarios || [];
  const perfil = getPerfil();
  document.getElementById('btn-admin-criar-usuario').disabled = false;
  renderizarUsuarios(usuariosCache);
}

function filtrarUsuarios(termo) {
  const tabAtiva = document.querySelector('.admin-role-tab.active');
  const roleFiltro = tabAtiva?.dataset.role || 'todos';
  const termoLower = termo.toLowerCase();

  const filtrados = usuariosCache.filter((u) => {
    if (roleFiltro !== 'todos' && u.role !== roleFiltro) return false;
    if (!termoLower) return true;
    return (
      u.apelido.toLowerCase().includes(termoLower) ||
      u.nome.toLowerCase().includes(termoLower) ||
      u.email.toLowerCase().includes(termoLower)
    );
  });

  renderizarUsuarios(filtrados);
}

function renderizarUsuarios(usuarios) {
  const lista = document.getElementById('admin-usuarios-lista');
  lista.innerHTML = '';

  if (!usuarios.length) {
    lista.innerHTML = '<div class="empty-state"><div class="empty-icon">👥</div><p>Nenhum usuário encontrado</p></div>';
    return;
  }

  usuarios.forEach((u) => {
    const card = document.createElement('div');
    card.className = 'admin-user-card';
    card.dataset.id = u.id;

    const roleMap = { admin: 'tag-admin', professor: 'tag-prof', aluno: 'tag-aluno' };
    const roleDisplay = { admin: 'Admin', professor: 'Professor', aluno: 'Aluno' };

    card.innerHTML = `
      <div class="admin-user-avatar">${iniciais(u.nome)}</div>
      <div class="admin-user-info">
        <div class="admin-user-nome">
          <span>${esc(u.nome)}</span>
          <span class="tag-role ${roleMap[u.role] || 'tag-aluno'}">${roleDisplay[u.role] || u.role}</span>
        </div>
        <div class="admin-user-apelido">@${esc(u.apelido)}</div>
        <div class="admin-user-email">${esc(u.email)}</div>
        <div class="admin-user-data">Membro desde ${new Date(u.criado_em).toLocaleDateString('pt-BR')}</div>
      </div>
      <div class="admin-user-actions">
        <button class="btn-ghost btn-sm btn-icon" title="Editar" data-action="editar" data-id="${esc(u.id)}">✏️</button>
        <button class="btn-ghost btn-sm btn-icon" title="Resetar senha" data-action="senha" data-id="${esc(u.id)}">🔑</button>
        <button class="btn-ghost btn-sm btn-icon" title="Notificar" data-action="notificar" data-id="${esc(u.id)}">🔔</button>
        <button class="btn-danger btn-sm btn-icon" title="Excluir" data-action="excluir" data-id="${esc(u.id)}">🗑️</button>
      </div>
    `;

    card.querySelectorAll('button[data-action]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        const userId = btn.dataset.id;
        const usuario = usuariosCache.find((u) => u.id === userId);
        if (!usuario) return;
        switch (action) {
          case 'editar': abrirModalEditar(usuario); break;
          case 'senha': abrirModalSenha(usuario); break;
          case 'notificar': abrirModalNotificar(usuario); break;
          case 'excluir': confirmarExcluir(usuario); break;
        }
      });
    });

    lista.appendChild(card);
  });
}

function abrirModalCriar() {
  document.getElementById('admin-criar-apelido').value = '';
  document.getElementById('admin-criar-nome').value = '';
  document.getElementById('admin-criar-email').value = '';
  document.getElementById('admin-criar-senha').value = '';
  document.getElementById('admin-criar-role').value = 'aluno';
  document.getElementById('modal-admin-criar-usuario').classList.remove('hidden');
}

async function criarUsuario() {
  const apelido = document.getElementById('admin-criar-apelido').value.trim();
  const nome = document.getElementById('admin-criar-nome').value.trim();
  const email = document.getElementById('admin-criar-email').value.trim();
  const senha = document.getElementById('admin-criar-senha').value;
  const role = document.getElementById('admin-criar-role').value;

  if (!apelido || !nome || !email || !senha) {
    toast('Preencha todos os campos', 'warn');
    return;
  }
  if (senha.length < 6) {
    toast('Senha deve ter ao menos 6 caracteres', 'warn');
    return;
  }

  const btn = document.getElementById('btn-admin-criar-usuario');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';

  const { data, error } = await sb.rpc('admin_criar_usuario', {
    p_apelido: apelido,
    p_nome: nome,
    p_email: email,
    p_senha: senha,
    p_role: role,
  });

  btn.disabled = false;
  btn.innerHTML = 'Criar';

  if (error) {
    toast(error.message || 'Erro ao criar usuário', 'error');
    return;
  }

  document.getElementById('modal-admin-criar-usuario').classList.add('hidden');
  toast('Usuário criado! ✅', 'success');
  dispararEfeito('criar');
  carregarUsuarios();
}

function abrirModalEditar(usuario) {
  document.getElementById('admin-editar-id').value = usuario.id;
  document.getElementById('admin-editar-apelido').value = usuario.apelido;
  document.getElementById('admin-editar-nome').value = usuario.nome;
  document.getElementById('admin-editar-role').value = usuario.role;
  document.getElementById('modal-admin-editar-usuario').classList.remove('hidden');
}

async function editarUsuario() {
  const id = document.getElementById('admin-editar-id').value;
  const apelido = document.getElementById('admin-editar-apelido').value.trim();
  const nome = document.getElementById('admin-editar-nome').value.trim();
  const role = document.getElementById('admin-editar-role').value;

  if (!apelido || !nome) {
    toast('Preencha apelido e nome', 'warn');
    return;
  }

  const btn = document.getElementById('btn-admin-editar-salvar');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';

  const { error } = await sb.rpc('admin_atualizar_usuario', {
    p_user_id: id,
    p_apelido: apelido,
    p_nome: nome,
    p_role: role,
  });

  btn.disabled = false;
  btn.innerHTML = 'Salvar';

  if (error) {
    toast(error.message || 'Erro ao editar', 'error');
    return;
  }

  document.getElementById('modal-admin-editar-usuario').classList.add('hidden');
  toast('Usuário atualizado!', 'success');
  dispararEfeito('editar');
  carregarUsuarios();
}

function abrirModalSenha(usuario) {
  document.getElementById('admin-senha-id').value = usuario.id;
  document.getElementById('admin-senha-usuario').textContent = usuario.nome;
  document.getElementById('admin-senha-nova').value = '';
  document.getElementById('modal-admin-reset-senha').classList.remove('hidden');
}

async function resetarSenha() {
  const id = document.getElementById('admin-senha-id').value;
  const senha = document.getElementById('admin-senha-nova').value;

  if (!senha || senha.length < 6) {
    toast('Senha deve ter ao menos 6 caracteres', 'warn');
    return;
  }

  const btn = document.getElementById('btn-admin-senha-salvar');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';

  const { error } = await sb.rpc('admin_atualizar_usuario', {
    p_user_id: id,
    p_senha: senha,
  });

  btn.disabled = false;
  btn.innerHTML = 'Salvar';

  if (error) {
    toast(error.message || 'Erro ao resetar senha', 'error');
    return;
  }

  document.getElementById('modal-admin-reset-senha').classList.add('hidden');
  toast('Senha alterada!', 'success');
}

function confirmarExcluir(usuario) {
  confirmar(
    `Excluir ${usuario.nome}?`,
    `@${usuario.apelido} (${usuario.email}) será removido permanentemente. Todas as notificações e vínculos serão deletados.`,
    async () => {
      const { error } = await sb.rpc('admin_excluir_usuario', { p_user_id: usuario.id });
      if (error) {
        toast(error.message || 'Erro ao excluir', 'error');
        return;
      }
      toast('Usuário excluído', 'success');
      dispararEfeito('excluir');
      carregarUsuarios();
    },
    'Excluir'
  );
}

function abrirModalNotificar(usuario) {
  document.getElementById('admin-notificar-id').value = usuario.id;
  document.getElementById('admin-notificar-nome').textContent = usuario.nome;
  document.getElementById('admin-notificar-mensagem').value = '';
  document.getElementById('admin-notificar-alvo').value = 'usuario';
  document.getElementById('modal-admin-notificar').classList.remove('hidden');
}

async function enviarNotificacao() {
  const mensagem = document.getElementById('admin-notificar-mensagem').value.trim();
  if (!mensagem) {
    toast('Digite uma mensagem', 'warn');
    return;
  }

  const alvo = document.getElementById('admin-notificar-alvo').value;
  const btn = document.getElementById('btn-admin-notificar-enviar');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';

  let usuariosAlvo = [];
  if (alvo === 'usuario') {
    const id = document.getElementById('admin-notificar-id').value;
    usuariosAlvo = [id];
  } else if (alvo === 'alunos') {
    usuariosAlvo = usuariosCache.filter((u) => u.role === 'aluno').map((u) => u.id);
  } else if (alvo === 'professores') {
    usuariosAlvo = usuariosCache.filter((u) => u.role !== 'aluno').map((u) => u.id);
  } else {
    usuariosAlvo = usuariosCache.map((u) => u.id);
  }

  let successCount = 0;
  for (const uid of usuariosAlvo) {
    const { error } = await sb.from('notificacoes').insert({
      usuario_id: uid,
      tipo: 'admin',
      titulo: '📢 Comunicado',
      mensagem,
    });
    if (!error) successCount++;
  }

  btn.disabled = false;
  btn.innerHTML = 'Enviar';

  if (successCount > 0) {
    toast(`${successCount} notificação(ões) enviada(s)!`, 'success');
    dispararEfeito('notificar');
    document.getElementById('modal-admin-notificar').classList.add('hidden');
  } else {
    toast('Erro ao enviar notificações', 'error');
  }
}

function dispararEfeito(tipo) {
  import('https://cdn.jsdelivr.net/npm/canvas-confetti@1/+esm')
    .then((confetti) => {
      const cores = {
        criar: ['#34d399', '#60a5fa', '#a78bfa'],
        editar: ['#fbbf24', '#f59e0b', '#f97316'],
        excluir: ['#ef4444', '#f87171', '#fca5a5'],
        notificar: ['#60a5fa', '#818cf8', '#a78bfa'],
      };
      confetti.default({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.6 },
        colors: cores[tipo] || ['#7c9ef5'],
      });
    })
    .catch(() => {});
}
