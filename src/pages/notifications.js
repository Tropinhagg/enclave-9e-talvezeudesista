import { sb } from '../services/supabase.js';
import { esc, tempoRelativo } from './ui.js';
import { getUsuario } from './auth.js';

let notifCanal = null;

export function initNotifications() {
  document.getElementById('btn-notif').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('notif-dropdown').classList.toggle('hidden');
    carregarNotificacoes();
  });

  document.addEventListener('click', () => {
    document.getElementById('notif-dropdown').classList.add('hidden');
  });
}

export function iniciarNotificacoes() {
  carregarNotificacoes();
  assinarRealtime();
}

async function carregarNotificacoes() {
  const uid = getUsuario()?.id;
  if (!uid) return;

  const { data } = await sb
    .from('notificacoes')
    .select('*')
    .eq('usuario_id', uid)
    .order('criado_em', { ascending: false })
    .limit(10);

  renderizarNotificacoes(data || []);
}

function renderizarNotificacoes(notifs) {
  const naoLidas = notifs.filter((n) => !n.lida).length;
  const badge = document.getElementById('notif-badge');
  const list = document.getElementById('notif-list');

  if (naoLidas > 0) {
    badge.textContent = naoLidas > 9 ? '9+' : String(naoLidas);
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }

  if (!notifs.length) {
    list.innerHTML = '<div class="notif-empty">Nenhuma notificação</div>';
    return;
  }

  const iconMap = {
    distintivo: '🏅',
    simulado: '🎯',
    meta: '🔥',
    sistema: 'ℹ️',
  };

  list.innerHTML = notifs
    .map(
      (n) =>
        `<div class="notif-item${n.lida ? '' : ' notif-naolida'}" data-id="${esc(n.id)}">
          <div class="notif-icon">${iconMap[n.tipo] || 'ℹ️'}</div>
          <div class="notif-body">
            <div class="notif-titulo">${esc(n.titulo)}</div>
            ${n.mensagem ? `<div class="notif-msg">${esc(n.mensagem)}</div>` : ''}
            <div class="notif-time">${tempoRelativo(n.criado_em)}</div>
          </div>
        </div>`
    )
    .join('');

  list.querySelectorAll('.notif-item').forEach((el) => {
    el.addEventListener('click', async () => {
      const id = el.dataset.id;
      await sb.from('notificacoes').update({ lida: true }).eq('id', id);
      el.classList.remove('notif-naolida');
    });
  });
}

function assinarRealtime() {
  const uid = getUsuario()?.id;
  if (!uid) return;

  if (notifCanal) {
    sb.removeChannel(notifCanal);
  }

  notifCanal = sb
    .channel('notificacoes-realtime')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notificacoes',
        filter: `usuario_id=eq.${uid}`,
      },
      () => {
        carregarNotificacoes();
      }
    )
    .subscribe();
}
