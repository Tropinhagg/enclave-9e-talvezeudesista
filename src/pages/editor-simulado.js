import { sb } from '../services/supabase.js';
import { uploadCloudinary } from '../services/cloudinary.js';
import { esc, toast, confirmar } from './ui.js';
import { getUsuario, registrarLog } from './auth.js';
import { carregarSimulados } from './simulados-lista.js';

let editorSimuladoId = null;
let editorQuestaoId = null;
let editorQuestaoImgs = [];
let questaoExistingImgs = [];
let editorSimuladoAtivo = false;

window.abrirEditorSimulado = async (simId) => {
  editorSimuladoId = simId;
  const { data: sim } = await sb.from('simulados').select('*').eq('id', simId).single();
  if (!sim) return;
  document.getElementById('main-app').classList.add('hidden');
  document.getElementById('tela-editor-simulado').classList.remove('hidden');
  document.getElementById('editor-sim-titulo').textContent = sim.nome;
  editorSimuladoAtivo = sim.ativo;
  atualizarStatusEditor();
  await carregarEditorQuestoes();
};

function atualizarStatusEditor() {
  const statusEl = document.getElementById('editor-sim-status');
  const publicarBtn = document.getElementById('btn-publicar-simulado');
  const rascunhoBtn = document.getElementById('btn-rascunho-simulado');
  
  if (editorSimuladoAtivo) {
    statusEl.textContent = '✅ Publicado';
    statusEl.className = 'badge badge-materia';
    publicarBtn.classList.add('hidden');
    rascunhoBtn.classList.remove('hidden');
  } else {
    statusEl.textContent = '📝 Rascunho';
    statusEl.className = 'badge badge-geral';
    publicarBtn.classList.remove('hidden');
    rascunhoBtn.classList.add('hidden');
  }
}

async function carregarEditorQuestoes() {
  const { data: questoes } = await sb
    .from('questoes')
    .select('*')
    .eq('simulado_id', editorSimuladoId)
    .order('ordem');
  const lista = document.getElementById('editor-questoes-lista');
  lista.innerHTML = '';
  (questoes || []).forEach((q, i) => {
    const card = document.createElement('div');
    card.className = `editor-q-card${editorQuestaoId === q.id ? ' active' : ''}`;
    card.innerHTML =
      `<div class="editor-q-num">Questão ${i + 1} ${q.imagens?.length ? '<span class="has-img-badge">📷</span>' : ''}</div><div class="editor-q-preview">${esc(q.enunciado?.slice(0, 60)) || '(sem enunciado)'}</div><div class="editor-q-actions"><button class="btn-ghost btn-sm" data-action="mover" data-id="${esc(q.id)}" data-dir="up">↑</button><button class="btn-ghost btn-sm" data-action="mover" data-id="${esc(q.id)}" data-dir="down">↓</button><button class="btn-ghost btn-sm" data-action="selecionar" data-id="${esc(q.id)}">✏️</button><button class="btn-danger btn-sm" data-action="excluir" data-id="${esc(q.id)}">🗑️</button></div>`;
    lista.appendChild(card);
  });
  if (!questoes?.length)
    lista.innerHTML = '<div class="empty-state"><div class="empty-icon">📝</div><p>Nenhuma questão ainda.</p></div>';
}

window.selecionarQuestao = async (id) => {
  editorQuestaoId = id;
  editorQuestaoImgs = [];
  const { data: q } = await sb.from('questoes').select('*').eq('id', id).single();
  if (!q) return;
  renderizarEditorForm(q);
};

function criarElementoSeguro(tag, attributes = {}, children = []) {
  const element = document.createElement(tag);
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'style' && typeof value === 'object') {
      Object.entries(value).forEach(([styleKey, styleValue]) => {
        element.style[styleKey] = styleValue;
      });
    } else if (key === 'dataset') {
      Object.entries(value).forEach(([datasetKey, datasetValue]) => {
        element.dataset[datasetKey] = datasetValue;
      });
    } else {
      element[key] = value;
    }
  });
  
  children.forEach(child => {
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child));
    } else {
      element.appendChild(child);
    }
  });
  
  return element;
}

function renderizarEditorForm(q) {
  const painel = document.getElementById('editor-questao-painel');
  const letras = ['A', 'B', 'C', 'D', 'E'];
  
  // Limpar o painel primeiro
  painel.innerHTML = '';
  
  // Criar elementos de forma segura
  const formDiv = criarElementoSeguro('div', { className: 'editor-form' });
  
  // Enunciado
  const enunciadoLabel = criarElementoSeguro('label', { textContent: 'Enunciado' });
  const enunciadoTextarea = criarElementoSeguro('textarea', { 
    id: 'q-enunciado', 
    rows: 5,
    value: q.enunciado || ''
  });
  
  // Alternativas
  const alternativasLabel = criarElementoSeguro('label', { 
    innerHTML: 'Alternativas <small style="color:var(--text-muted);text-transform:none;">(marque a correta)</small>' 
  });
  
  const altsContainer = criarElementoSeguro('div', { id: 'alts-editor' });
  
  (q.alternativas || []).forEach((alt, i) => {
    const altRow = criarElementoSeguro('div', { className: 'alt-editor-row' });
    
    const radio = criarElementoSeguro('input', { 
      type: 'radio', 
      className: 'alt-editor-radio',
      name: 'alt-correta',
      value: i,
      checked: q.correta === i
    });
    
    const input = criarElementoSeguro('input', { 
      type: 'text', 
      className: 'alt-editor-inp',
      dataset: { idx: i },
      value: alt,
      placeholder: `Alternativa ${letras[i]}`
    });
    
    const removeBtn = criarElementoSeguro('button', { 
      className: 'btn-danger btn-sm btn-icon',
      textContent: '✕'
    });
    removeBtn.addEventListener('click', () => window.removerAlternativa(removeBtn));
    
    altRow.appendChild(radio);
    altRow.appendChild(input);
    altRow.appendChild(removeBtn);
    altsContainer.appendChild(altRow);
  });
  
  const addAltBtn = criarElementoSeguro('button', { 
    className: 'btn-ghost btn-sm',
    id: 'btn-add-alt',
    style: { marginTop: '8px' },
    disabled: (q.alternativas || []).length >= 5,
    textContent: '+ Alternativa'
  });
  
  // Explicação
  const explicacaoLabel = criarElementoSeguro('label', { 
    innerHTML: 'Explicação <small style="color:var(--text-muted);text-transform:none;">(opcional — mostrada após o gabarito)</small>' 
  });
  const explicacaoTextarea = criarElementoSeguro('textarea', { 
    id: 'q-explicacao', 
    rows: 3,
    value: q.explicacao || ''
  });
  
  // Ordem
  const ordemLabel = criarElementoSeguro('label', { textContent: 'Ordem' });
  const ordemInput = criarElementoSeguro('input', { 
    type: 'number',
    id: 'q-ordem',
    value: q.ordem || 1,
    style: {
      width: '100%',
      background: 'var(--bg-3)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)',
      padding: '10px 14px',
      color: 'var(--text)',
      fontFamily: 'inherit',
      fontSize: '14.5px',
      outline: 'none'
    }
  });
  
  // Imagens
  const imagensLabel = criarElementoSeguro('label', { textContent: 'Imagens' });
  const imgsContainer = criarElementoSeguro('div', { id: 'editor-q-imgs' });
  
  (q.imagens || []).forEach((u, i) => {
    const imgWrap = criarElementoSeguro('div', { className: 'pending-img-wrap' });
    
    const img = criarElementoSeguro('img', { 
      src: u,
      alt: ''
    });
    
    const removeImgBtn = criarElementoSeguro('button', { 
      className: 'pending-img-remove',
      textContent: '✕'
    });
    removeImgBtn.addEventListener('click', () => window.removerImgQuestao(i));
    
    imgWrap.appendChild(img);
    imgWrap.appendChild(removeImgBtn);
    imgsContainer.appendChild(imgWrap);
  });
  
  const addImgBtn = criarElementoSeguro('button', { 
    className: 'btn-ghost btn-sm',
    id: 'btn-q-add-img',
    style: { marginTop: '8px' },
    textContent: '+ Imagem'
  });
  
  // Botões de ação
  const buttonsDiv = criarElementoSeguro('div', { 
    style: {
      display: 'flex',
      gap: '10px',
      justifyContent: 'flex-end',
      marginTop: '20px'
    }
  });
  
  const cancelBtn = criarElementoSeguro('button', { 
    className: 'btn-ghost',
    textContent: 'Cancelar'
  });
  cancelBtn.addEventListener('click', window.cancelarEdicaoQuestao);
  
  const saveBtn = criarElementoSeguro('button', { 
    className: 'btn-primary',
    id: 'btn-salvar-questao',
    style: { width: 'auto' },
    textContent: 'Salvar questão'
  });
  
  buttonsDiv.appendChild(cancelBtn);
  buttonsDiv.appendChild(saveBtn);
  
  // Montar o formulário
  formDiv.appendChild(enunciadoLabel);
  formDiv.appendChild(enunciadoTextarea);
  formDiv.appendChild(alternativasLabel);
  formDiv.appendChild(altsContainer);
  formDiv.appendChild(addAltBtn);
  formDiv.appendChild(explicacaoLabel);
  formDiv.appendChild(explicacaoTextarea);
  formDiv.appendChild(ordemLabel);
  formDiv.appendChild(ordemInput);
  formDiv.appendChild(imagensLabel);
  formDiv.appendChild(imgsContainer);
  formDiv.appendChild(addImgBtn);
  formDiv.appendChild(buttonsDiv);
  
  painel.appendChild(formDiv);
  
  // Adicionar eventos após criar os elementos
  addAltBtn.addEventListener('click', adicionarAlternativa);
  addImgBtn.addEventListener('click', () => document.getElementById('file-questao-img').click());
  saveBtn.addEventListener('click', () => salvarQuestao(editorQuestaoId));
  
  questaoExistingImgs = [...(q.imagens || [])];
}

window.removerAlternativa = (btnEl) => {
  const row = btnEl.closest('.alt-editor-row');
  if (!row) return;
  const rows = document.querySelectorAll('.alt-editor-row');
  if (rows.length <= 2) {
    toast('Mínimo 2 alternativas', 'warn');
    return;
  }
  row.remove();
};

function adicionarAlternativa() {
  const alts = document.querySelectorAll('.alt-editor-row');
  if (alts.length >= 5) {
    toast('Máximo 5 alternativas', 'warn');
    return;
  }
  const div = document.createElement('div');
  div.className = 'alt-editor-row';
  const idx = alts.length;
  const letras = ['A', 'B', 'C', 'D', 'E'];
  const radio = document.createElement('input');
  radio.type = 'radio';
  radio.className = 'alt-editor-radio';
  radio.name = 'alt-correta';
  radio.value = idx;
  
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'alt-editor-inp';
  input.dataset.idx = idx;
  input.placeholder = `Alternativa ${letras[idx]}`;
  input.style.width = '100%';
  input.style.background = 'var(--bg-3)';
  input.style.border = '1px solid var(--border)';
  input.style.borderRadius = 'var(--radius-sm)';
  input.style.padding = '10px 14px';
  input.style.color = 'var(--text)';
  input.style.fontFamily = 'inherit';
  input.style.fontSize = '14.5px';
  input.style.outline = 'none';
  
  const removeBtn = document.createElement('button');
  removeBtn.className = 'btn-danger btn-sm btn-icon';
  removeBtn.textContent = '✕';
  removeBtn.addEventListener('click', () => window.removerAlternativa(removeBtn));
  
  div.appendChild(radio);
  div.appendChild(input);
  div.appendChild(removeBtn);
  document.getElementById('alts-editor').appendChild(div);
}

document.getElementById('file-questao-img').addEventListener('change', (e) => {
  Array.from(e.target.files).forEach((file) => {
    const previewUrl = URL.createObjectURL(file);
    editorQuestaoImgs.push({ file, previewUrl });
    const wrap = document.createElement('div');
    wrap.className = 'pending-img-wrap';
    const img = document.createElement('img');
    img.src = previewUrl;
    img.alt = '';
    const removeBtn = document.createElement('button');
    removeBtn.className = 'pending-img-remove';
    removeBtn.textContent = '✕';
    removeBtn.addEventListener('click', () => {
      const i = editorQuestaoImgs.findIndex((p) => p.previewUrl === previewUrl);
      if (i >= 0) editorQuestaoImgs.splice(i, 1);
      wrap.remove();
    });
    wrap.appendChild(img);
    wrap.appendChild(removeBtn);
    document.getElementById('editor-q-imgs').appendChild(wrap);
  });
  e.target.value = '';
});

window.removerImgQuestao = (i) => {
  questaoExistingImgs?.splice(i, 1);
};

async function salvarQuestao(qid) {
  const enunciado = document.getElementById('q-enunciado')?.value.trim();
  if (!enunciado) {
    toast('Enunciado obrigatório', 'warn');
    return;
  }
  const altInputs = document.querySelectorAll('.alt-editor-inp');
  const alternativas = Array.from(altInputs).map((i) => i.value.trim());
  if (alternativas.length < 2) {
    toast('Mínimo 2 alternativas', 'warn');
    return;
  }
  if (alternativas.some((a) => !a)) {
    toast('Preencha todas as alternativas', 'warn');
    return;
  }
  const corretaRadio = document.querySelector('input[name="alt-correta"]:checked');
  if (!corretaRadio) {
    toast('Selecione a alternativa correta', 'warn');
    return;
  }
  const correta = parseInt(corretaRadio.value);
  const explicacao = (document.getElementById('q-explicacao')?.value || '').trim() || null;
  const ordem = parseInt(document.getElementById('q-ordem')?.value) || 1;
  const btn = document.getElementById('btn-salvar-questao');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';
  const novasUrls = [];
  for (const img of editorQuestaoImgs) {
    if (img.remoteUrl) {
      novasUrls.push(img.remoteUrl);
    } else if (img.file) {
      const url = await uploadCloudinary(img.file);
      if (url) novasUrls.push(url);
    }
  }
  const imagens = [...questaoExistingImgs, ...novasUrls];
  const payload = { enunciado, alternativas, correta, explicacao, ordem, imagens, simulado_id: editorSimuladoId };
  const { error } = qid
    ? await sb.from('questoes').update(payload).eq('id', qid)
    : await sb.from('questoes').insert(payload);
  btn.disabled = false;
  btn.textContent = 'Salvar questão';
  if (error) {
    toast('Erro ao salvar questão', 'error');
    return;
  }
  toast('Questão salva!', 'success');
  editorQuestaoImgs = [];
  carregarEditorQuestoes();
}

window.cancelarEdicaoQuestao = () => {
  editorQuestaoId = null;
  document.getElementById('editor-questao-painel').innerHTML =
    '<div class="empty-state"><div class="empty-icon">✏️</div><p>Selecione ou crie uma questão para editar.</p></div>';
};

document.getElementById('btn-nova-questao').addEventListener('click', () => {
  editorQuestaoId = null;
  editorQuestaoImgs = [];
  questaoExistingImgs = [];
  renderizarEditorForm({ enunciado: '', alternativas: ['', ''], correta: 0, explicacao: '', ordem: 1, imagens: [] });
});

window.moverQuestao = async (id, dir) => {
  const { data: questoes } = await sb
    .from('questoes')
    .select('id,ordem')
    .eq('simulado_id', editorSimuladoId)
    .order('ordem');
  const idx = questoes.findIndex((q) => q.id === id);
  const swap = dir === 'up' ? idx - 1 : idx + 1;
  if (swap < 0 || swap >= questoes.length) return;
  await sb.from('questoes').update({ ordem: questoes[swap].ordem }).eq('id', questoes[idx].id);
  await sb.from('questoes').update({ ordem: questoes[idx].ordem }).eq('id', questoes[swap].id);
  carregarEditorQuestoes();
};

window.excluirQuestao = (id) => {
  confirmar('Excluir questão', 'Esta ação não pode ser desfeita.', async () => {
    await sb.from('questoes').delete().eq('id', id);
    if (editorQuestaoId === id) cancelarEdicaoQuestao();
    carregarEditorQuestoes();
    toast('Questão excluída', 'success');
  }, 'Excluir');
};

document.getElementById('btn-importar-json').addEventListener('click', () => {
  document.getElementById('file-import-json').click();
});

document.getElementById('file-import-json').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (ev) => {
    let questoes;
    try {
      questoes = JSON.parse(ev.target.result);
    } catch {
      toast('JSON inválido', 'error');
      return;
    }
    if (!Array.isArray(questoes)) {
      toast('O arquivo deve conter um array de questões', 'error');
      return;
    }
    const validas = [];
    const erros = [];
    questoes.forEach((q, i) => {
      const errosQ = [];
      if (!q.enunciado?.trim()) errosQ.push('enunciado vazio');
      if (!Array.isArray(q.alternativas) || q.alternativas.length < 2 || q.alternativas.length > 5)
        errosQ.push('alternativas inválidas (2-5)');
      if (typeof q.correta !== 'number' || q.correta < 0 || q.correta >= (q.alternativas?.length || 0))
        errosQ.push('correta inválido');
      if (errosQ.length) {
        erros.push(`Q${i + 1}: ${errosQ.join(', ')}`);
        return;
      }
      validas.push({ ...q, simulado_id: editorSimuladoId, imagens: q.imagens || [], explicacao: q.explicacao || null });
    });
    const msg = erros.length
      ? `${validas.length} questão(ões) válida(s). Erros: ${erros.slice(0, 3).join('; ')}${erros.length > 3 ? '…' : ''}`
      : `${validas.length} questão(ões) prontas para importar.`;
    if (!validas.length) {
      toast('Nenhuma questão válida', 'error');
      return;
    }
    confirmar('Importar questões', msg, async () => {
      const { error } = await sb.from('questoes').insert(validas);
      if (error) {
        toast('Erro ao importar', 'error');
        return;
      }
      await registrarLog('importou_questoes', { simulado_id: editorSimuladoId, count: validas.length });
      toast(`${validas.length} questão(ões) importada(s)!`, 'success');
      carregarEditorQuestoes();
    }, 'Importar');
  };
  reader.readAsText(file);
  e.target.value = '';
});

async function publicarSimulado() {
  if (!editorSimuladoId) return;
  const { error } = await sb.from('simulados').update({ ativo: true }).eq('id', editorSimuladoId);
  if (error) {
    toast('Erro ao publicar', 'error');
    return;
  }
  editorSimuladoAtivo = true;
  atualizarStatusEditor();
  toast('Simulado publicado! ✅', 'success');
  carregarSimulados();
}

async function salvarComoRascunho() {
  if (!editorSimuladoId) return;
  const { error } = await sb.from('simulados').update({ ativo: false }).eq('id', editorSimuladoId);
  if (error) {
    toast('Erro ao salvar', 'error');
    return;
  }
  editorSimuladoAtivo = false;
  atualizarStatusEditor();
  toast('Salvo como rascunho 📝', 'success');
  carregarSimulados();
}

document.getElementById('btn-publicar-simulado').addEventListener('click', () => {
  const questoesList = document.getElementById('editor-questoes-lista');
  if (!questoesList.children.length || questoesList.querySelector('.empty-state')) {
    toast('Adicione ao menos uma questão antes de publicar', 'warn');
    return;
  }
  confirmar('Publicar simulado', 'Ao publicar, o simulado ficará visível para os alunos.', publicarSimulado, 'Publicar');
});

document.getElementById('btn-rascunho-simulado').addEventListener('click', () => {
  confirmar('Salvar como rascunho', 'O simulado será removido da visão dos alunos.', salvarComoRascunho, 'Salvar como rascunho');
});

document.getElementById('btn-voltar-editor').addEventListener('click', () => {
  document.getElementById('tela-editor-simulado').classList.add('hidden');
  document.getElementById('main-app').classList.remove('hidden');
  editorSimuladoId = null;
  editorQuestaoId = null;
  carregarSimulados();
  window._navigateTo('simulados');
});