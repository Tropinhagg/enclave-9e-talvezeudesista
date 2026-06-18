const passos = [
  {
    id: 'welcome',
    titulo: '👋 Bem-vindo ao Enclave 9ºE!',
    texto: 'Oi! Eu sou o <strong>Gui</strong>, seu guia por aqui! 🎮\n\nVou te mostrar cada cantinho do site para você não se perder. Bora?',
    expressao: 'feliz',
    ilustracao: 'welcome',
    destaque: null,
  },
  {
    id: 'inicio',
    titulo: '🏠 Início — Seu painel',
    texto: 'Aqui é o <strong>Início</strong>, seu painel de controle!\n\nVocê vê:\n• 📊 Seus <strong>stats</strong> (simulados feitos, média, advertências)\n• 🏅 Seus <strong>badges</strong> e conquistas\n• 🎯 Os <strong>simulados disponíveis</strong> pra começar',
    expressao: 'normal',
    ilustracao: 'dashboard',
    destaque: '.nav-btn[data-section="inicio"], .mnav-btn[data-section="inicio"]',
  },
  {
    id: 'mural',
    titulo: '📋 Mural — Comunicação',
    texto: 'No <strong>Mural</strong> a turma se comunica!\n\n• ✍️ <strong>Publique</strong> posts com texto, imagens e links\n• ❤️ <strong>Reaja</strong> curtindo as publicações\n• 💬 <strong>Comente</strong> e responda comentários\n• 🔗 <strong>Compartilhe</strong> links com a turma\n\nTudo em <strong>tempo real</strong>!',
    expressao: 'normal',
    ilustracao: 'mural',
    destaque: '.nav-btn[data-section="mural"], .mnav-btn[data-section="mural"]',
  },
  {
    id: 'artigos',
    titulo: '📝 Artigos — Leituras',
    texto: 'Nos <strong>Artigos</strong> você encontra conteúdo completo pra estudar!\n\n📖 São textos formatados com imagens, links e explicações detalhadas.\n\nÉ como ter um <strong>livro digital</strong> da turma!',
    expressao: 'normal',
    ilustracao: 'artigos',
    destaque: '.nav-btn[data-section="artigos"], .mnav-btn[data-section="artigos"]',
  },
  {
    id: 'conteudo',
    titulo: '📚 Conteúdo — Estudo organizado',
    texto: 'O <strong>Conteúdo</strong> é separado em <strong>4 abas</strong>:\n\n📋 <strong>Edital</strong> — cronograma e avisos\n📖 <strong>Assuntos</strong> — matérias detalhadas\n🎬 <strong>Vídeos</strong> — videoaulas\n📄 <strong>Materiais</strong> — PDFs e recursos\n\nTudo organizado pelo professor!',
    expressao: 'normal',
    ilustracao: 'conteudo',
    destaque: '.nav-btn[data-section="conteudo"], .mnav-btn[data-section="conteudo"]',
  },
  {
    id: 'simulados',
    titulo: '🎯 Simulados — Testes',
    texto: 'Os <strong>Simulados</strong> são a hora da verdade! 🧠\n\n⚠️ <strong>Regras importantes:</strong>\n• 🚫 <strong>Trocar de aba</strong> = 🔴 advertência\n• ⏰ <strong>Inatividade 60s</strong> = 🔴 advertência\n• 🔴🔴🔴🔴🔴 <strong>5 advertências</strong> = 🚷 expulso!\n\n✅ Seu progresso é <strong>salvo automaticamente</strong> a cada 30s.\n💡 Você pode <strong>sair e retomar</strong> depois!',
    expressao: 'alerta',
    ilustracao: 'simulado',
    destaque: '.nav-btn[data-section="simulados"], .mnav-btn[data-section="simulados"]',
  },
  {
    id: 'materiais',
    titulo: '📁 Materiais — Recursos',
    texto: 'Nos <strong>Materiais</strong> você encontra recursos extras:\n\n📄 <strong>PDFs</strong>, 🎬 <strong>Vídeos</strong>, 🌐 <strong>Sites</strong> e muito mais!\n\nÉ só <strong>clicar</strong> que abre em uma nova aba. 😊',
    expressao: 'normal',
    ilustracao: 'materiais',
    destaque: '.nav-btn[data-section="materiais"], .mnav-btn[data-section="materiais"]',
  },
  {
    id: 'desafio',
    titulo: '🏆 Desafio — Quiz relâmpago',
    texto: 'O <strong>Desafio</strong> é um quiz contra o tempo! ⏱️\n\n• ⏳ <strong>20 segundos</strong> por pergunta\n• ⚡ <strong>Responda rápido</strong> pra ganhar mais pontos\n• 🏅 <strong>Bônus</strong> de tempo restante na pontuação\n• 🎯 Veja seu resultado com <strong>trofeu</strong> no final!\n\nBora testar seus reflexos? 💪',
    expressao: 'feliz',
    ilustracao: 'desafio',
    destaque: '.nav-btn[data-section="desafio"], .mnav-btn[data-section="desafio"]',
  },
  {
    id: 'regras',
    titulo: '⚠️ Resumo das regras',
    texto: 'Só pra relembrar:\n\n• 🎯 <strong>Simulados:</strong> nada de trocar de aba ou ficar parado\n• 🏆 <strong>Desafio:</strong> responda antes do tempo acabar\n• 📋 <strong>Mural:</strong> seja respeitoso nos comentários\n\nO <strong>💡</strong> estará sempre aqui no cantinho se precisar de ajuda!',
    expressao: 'normal',
    ilustracao: 'regras',
    destaque: null,
  },
  {
    id: 'fim',
    titulo: '🚀 Prontinho!',
    texto: 'Agora você já conhece o <strong>Enclave 9ºE</strong>! 🎉\n\nQualquer dúvida, é só clicar no <strong>💡</strong> que estarei aqui.\n\n<strong>Bons estudos!</strong> 📚✨',
    expressao: 'feliz',
    ilustracao: 'fim',
    destaque: null,
  },
];

let passoAtual = 0;
let tourAtivo = false;
let destaquesAtivos = [];

const ILC = {
  welcome: `<span class="ilustracao-welcome">🎮✨🚀</span>`,
  dashboard: `
    <div class="ilustracao-dashboard">
      <div class="dash-stat dash-stat--simulados">
        <div class="dash-stat-circulo">12</div>
        <span class="dash-stat-label">Simulados</span>
      </div>
      <div class="dash-stat dash-stat--media">
        <div class="dash-stat-circulo">78%</div>
        <span class="dash-stat-label">Média</span>
      </div>
      <div class="dash-stat dash-stat--adv">
        <div class="dash-stat-circulo">2</div>
        <span class="dash-stat-label">Advert.</span>
      </div>
    </div>`,
  mural: `
    <div class="ilustracao-mural">
      <div class="mural-mini-post">
        <div class="mural-mini-linha mural-mini-linha--media"></div>
        <div class="mural-mini-linha mural-mini-linha--curta"></div>
        <div class="mural-mini-acoes">
          <span>❤️ 5</span>
          <span>💬 3</span>
          <span>🔗</span>
        </div>
      </div>
    </div>`,
  artigos: `
    <div class="ilustracao-artigos">
      <div class="artigo-mini-card">
        <div class="artigo-mini-img"></div>
        <div class="artigo-mini-linhas">
          <div class="artigo-mini-linha artigo-mini-linha--titulo"></div>
          <div class="artigo-mini-linha artigo-mini-linha--desc"></div>
        </div>
      </div>
    </div>`,
  conteudo: `
    <div class="ilustracao-conteudo">
      <div class="conteudo-mini-abas">
        <span class="conteudo-mini-aba conteudo-mini-aba--ativa">Edital</span>
        <span class="conteudo-mini-aba">Assuntos</span>
        <span class="conteudo-mini-aba">Vídeos</span>
        <span class="conteudo-mini-aba">Materiais</span>
      </div>
      <div class="conteudo-mini-bloco">
        <div class="conteudo-mini-bloco-linha" style="width:75%"></div>
        <div class="conteudo-mini-bloco-linha" style="width:50%"></div>
      </div>
    </div>`,
  simulado: `
    <div class="ilustracao-simulado">
      <div class="sim-mini-pips">
        <span class="sim-mini-pip sim-mini-pip--ok">✓</span>
        <span class="sim-mini-pip sim-mini-pip--ok">✓</span>
        <span class="sim-mini-pip sim-mini-pip--warn">⚠</span>
        <span class="sim-mini-pip sim-mini-pip--danger">!</span>
        <span class="sim-mini-pip">5</span>
      </div>
      <div class="sim-mini-aviso">
        <span>⚠️</span>
        <span>Trocar de aba = advertência!</span>
      </div>
    </div>`,
  materiais: `
    <div class="ilustracao-materiais">
      <span>📄</span><span>🎬</span><span>🌐</span><span>📁</span>
    </div>`,
  desafio: `
    <div class="ilustracao-desafio">
      <div class="desafio-mini-timer">20</div>
      <span class="desafio-mini-trofeu">🏆</span>
    </div>`,
  regras: `
    <div class="ilustracao-regras">
      <div class="regra-item">⚠️ Nada de trocar de aba no simulado</div>
      <div class="regra-item">⏱️ Responda o desafio antes do tempo</div>
      <div class="regra-item">💬 Seja respeitoso no mural</div>
    </div>`,
  fim: `
    <div class="ilustracao-fim">
      <span>🎉</span><span>✨</span><span>🚀</span><span>⭐</span><span>💫</span>
    </div>`,
};

export function initHelpTutorial() {
  const btn = document.getElementById('btn-ajuda');
  const panel = document.getElementById('help-panel');
  const fechar = document.getElementById('btn-help-fechar');
  const anterior = document.getElementById('btn-help-anterior');
  const proximo = document.getElementById('btn-help-proximo');
  const pular = document.getElementById('btn-help-pular');

  if (!btn || !panel) return;

  const jaCompletou = localStorage.getItem('tour_completo') === 'true';
  if (!jaCompletou) {
    btn.classList.add('help-btn--novidade');
  }

  btn.addEventListener('click', () => {
    if (tourAtivo) {
      fecharTour();
    } else {
      abrirTour();
    }
  });

  fechar.addEventListener('click', fecharTour);
  pular.addEventListener('click', () => {
    completarTour();
    fecharTour();
  });

  anterior.addEventListener('click', () => {
    if (passoAtual > 0) {
      passoAtual--;
      mostrarPasso(passoAtual);
    }
  });

  proximo.addEventListener('click', () => {
    if (passoAtual < passos.length - 1) {
      passoAtual++;
      mostrarPasso(passoAtual);
    } else {
      completarTour();
      fecharTour();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (!tourAtivo) return;
    if (e.key === 'Escape') fecharTour();
    if (e.key === 'ArrowRight') {
      if (passoAtual < passos.length - 1) {
        passoAtual++;
        mostrarPasso(passoAtual);
      } else {
        completarTour();
        fecharTour();
      }
    }
    if (e.key === 'ArrowLeft' && passoAtual > 0) {
      passoAtual--;
      mostrarPasso(passoAtual);
    }
  });
}

export function abrirTour() {
  const panel = document.getElementById('help-panel');
  const btn = document.getElementById('btn-ajuda');
  if (!panel) return;

  tourAtivo = true;
  passoAtual = 0;
  panel.classList.remove('hidden');
  btn.classList.remove('help-btn--novidade');
  btn.style.animation = 'none';
  mostrarPasso(0);
}

export function fecharTour() {
  const panel = document.getElementById('help-panel');
  if (!panel) return;
  tourAtivo = false;
  panel.classList.add('hidden');
  limparDestaques();
}

function completarTour() {
  localStorage.setItem('tour_completo', 'true');
  const btn = document.getElementById('btn-ajuda');
  if (btn) btn.classList.remove('help-btn--novidade');
}

function mostrarPasso(index) {
  const passo = passos[index];
  if (!passo) return;

  const corpo = document.getElementById('help-corpo');
  const indice = document.getElementById('help-indice');
  const anterior = document.getElementById('btn-help-anterior');
  const proximo = document.getElementById('btn-help-proximo');
  const mascote = document.querySelector('.help-mascote');
  const panel = document.getElementById('help-panel');

  limparDestaques();

  mascote.className = 'help-mascote';
  if (passo.expressao) {
    mascote.classList.add('help-mascote--' + passo.expressao);
  }

  const ilcHtml = ILC[passo.ilustracao] || '';

  corpo.innerHTML = `
    <div class="help-mensagem">
      <div class="help-mensagem-avatar">${passo.expressao === 'feliz' ? '😊' : passo.expressao === 'alerta' ? '😯' : '👋'}</div>
      <div class="help-mensagem-conteudo">
        <div class="help-mensagem-nome">Gui</div>
        <div class="help-mensagem-titulo">${passo.titulo}</div>
        <div class="help-mensagem-texto">${passo.texto}</div>
      </div>
    </div>
    ${ilcHtml ? `<div class="help-ilustracao">${ilcHtml}</div>` : ''}
  `;

  indice.textContent = `${index + 1}/${passos.length}`;
  anterior.disabled = index === 0;
  anterior.style.opacity = index === 0 ? '0.4' : '1';
  proximo.textContent = index === passos.length - 1 ? '✅ Concluir' : 'Próximo →';

  if (passo.destaque) {
    ativarDestaque(passo.destaque);
  }

  corpo.scrollTop = 0;
}

function ativarDestaque(seletor) {
  const elementos = document.querySelectorAll(seletor);
  elementos.forEach((el) => {
    el.classList.add('help-destacado');
    el.style.position = 'relative';
    el.style.zIndex = '502';
    el.style.boxShadow = '0 0 0 3px var(--accent), 0 0 20px rgba(124,158,245,0.35)';
    el.style.borderRadius = '8px';
    el.style.transition = 'box-shadow 0.3s';
    destaquesAtivos.push(el);

    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}

function limparDestaques() {
  destaquesAtivos.forEach((el) => {
    el.classList.remove('help-destacado');
    el.style.position = '';
    el.style.zIndex = '';
    el.style.boxShadow = '';
    el.style.borderRadius = '';
    el.style.transition = '';
  });
  destaquesAtivos = [];
}
