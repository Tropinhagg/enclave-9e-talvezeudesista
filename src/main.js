import { iniciar, initAuth, initPerfil } from './pages/auth.js';
import { carregarInicio } from './pages/dashboard.js';
import { carregarMural, initMuralCompose, initThread, initLinkModal, iniciarRealtime } from './pages/mural.js';
import { carregarConteudo, initConteudo } from './pages/conteudo.js';
import { initSimuladoButtons } from './pages/simulados.js';
import { carregarSimulados, initNovoSimulado } from './pages/simulados-lista.js';
import { carregarMateriais, initNovoMaterial } from './pages/materiais.js';
import { initBancoImagens } from './pages/imagembank.js';
import { carregarDesafios, initDesafio } from './pages/desafio.js';
import { carregarArtigos, initArtigos } from './pages/artigos.js';
import './pages/editor-simulado.js';
import { initSearch } from './pages/search.js';
import { initNotifications } from './pages/notifications.js';
import { initAdminUsuarios } from './pages/admin-usuarios.js';
import { initHelpTutorial } from './pages/help-tutorial.js';

window._iniciarRealtime = iniciarRealtime;

window._navigateTo = function navigateTo(sec) {
  document.getElementById('main-app').classList.remove('hidden');
  document.getElementById('tela-simulado').classList.add('hidden');
  document.getElementById('tela-editor-simulado').classList.add('hidden');
  document.getElementById('tela-desafio').classList.add('hidden');
  document.getElementById('tela-leitor-artigo').classList.add('hidden');
  document.getElementById('tela-editor-artigo').classList.add('hidden');
  document.getElementById('feed-mural').style.display = '';
  document.getElementById('tela-thread').classList.remove('active');
  document.querySelectorAll('.section').forEach((s) => s.classList.remove('active'));
  const alvo = document.querySelector(`.section[data-section="${sec}"]`);
  if (alvo) alvo.classList.add('active');
  document.querySelectorAll('.nav-btn, .mnav-btn').forEach((b) =>
    b.classList.toggle('active', b.dataset.section === sec)
  );

  switch (sec) {
    case 'inicio':
      carregarInicio();
      break;
    case 'mural':
      carregarMural();
      break;
    case 'artigos':
      carregarArtigos();
      break;
    case 'conteudo':
      carregarConteudo();
      break;
    case 'simulados':
      carregarSimulados();
      break;
    case 'materiais':
      carregarMateriais();
      break;
    case 'desafio':
      carregarDesafios();
      break;
  }
};

window._navigateToDesafio = () => window._navigateTo('desafio');

document.querySelectorAll('.nav-btn, .mnav-btn').forEach((btn) =>
  btn.addEventListener('click', () => window._navigateTo(btn.dataset.section))
);

initAuth();
initPerfil();
initMuralCompose();
initThread();
initLinkModal();
initConteudo();
initSimuladoButtons();
initNovoSimulado();
initNovoMaterial();
initBancoImagens();
initArtigos();
initSearch();
initNotifications();
initAdminUsuarios();
initHelpTutorial();
initDesafio();

iniciar();
