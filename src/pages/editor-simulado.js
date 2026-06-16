import { sb } from '../services/supabase.js';
import { uploadCloudinary } from '../services/cloudinary.js';
import { esc, toast, confirmar } from './ui.js';
import { getUsuario, registrarLog } from './auth.js';
import { carregarSimulados } from './simulados-lista.js';

let editorSimuladoId = null;
let editorQuestaoId = null;
let editorQuestaoImgs = [];
let questaoExistingImgs = [];

window.abrirEditorSimulado = async (simId) => {
  editorSimuladoId = simId;
  const { data: sim } = await sb.from('simulados').select('*').eq('id', simId).single();
  if (!sim) return;
  document.getElementById('main-app').classList.add('hidden');
  document.getElementById('tela-editor-simulado').classList.remove('hidden');
  document.getElementById('editor-sim-titulo').textContent = `Editor: ${sim.nome}`;
  await carregarEditorQuestoes();
};

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
      `<div class="editor-q-num">Questão ${i + 1} ${q.imagens?.length ? '<span class="has-img-badge">📷</span>' : ''}</div><div class="editor-q-preview">${esc(q.enunciado?.slice(0, 60)) || '(sem enunciado)'}</div><div class="editor-q-actions"><button class="btn-ghost btn-sm" onclick="window.moverQuestao('${esc(q.id)}','up')">↑</button><button class="btn-ghost btn-sm" onclick="window.moverQuestao('${esc(q.id)}','down')">↓</button><button class="btn-ghost btn-sm" onclick="window.selecionarQuestao('${esc(q.id)}')">✏️</button><button class="btn-danger btn-sm" onclick="window.excluirQuestao('${esc(q.id)}')">🗑️</button></div>`;
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

function renderizarEditorForm(q) {
  const painel = document.getElementById('editor-questao-painel');
  const letras = ['A', 'B', 'C', 'D', 'E'];
  const altsHtml = (q.alternativas || [])
    .map(
      (alt, i) =>
        `<div class="alt-editor-row"><input class="alt-editor-radio" type="radio" name="alt-correta" value="${i}" ${q.correta === i ? 'checked' : ''} /><input type="text" class="alt-editor-inp" data-idx="${i}" value="${esc(alt)}" placeholder="Alternativa ${letras[i]}" /></div>`
    )
    .join('');
  const imgsExistHtml = (q.imagens || [])
    .map(
      (u, i) =>
        `<div class="pending-img-wrap"><img src="${esc(u)}" alt="" /><button class="pending-img-remove" onclick="window.removerImgQuestao(${i})">✕</button></div>`
    )
    .join('');
  painel.innerHTML =
    `<div class="editor-form"><div style="margin-bottom:16px;"><label>Enunciado</label><textarea id="q-enunciado" rows="5">${esc(q.enunciado || '')}</textarea></div><div style="margin-bottom:16px;"><label>Alternativas <small style="color:var(--text-muted);text-transform:none;">(marque a correta)</small></label><div id="alts-editor">${altsHtml}</div><button class="btn-ghost btn-sm" id="btn-add-alt" style="margin-top:8px;" ${(q.alternativas || []).length >= 5 ? 'disabled' : ''}>+ Alternativa</button></div><div style="margin-bottom:16px;"><label>Ordem</label><input type="number" id="q-ordem" value="${q.ordem || 1}" style="width:100%;background:var(--bg-3);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 14px;color:var(--text);font-family:inherit;font-size:14.5px;outline:none;" /></div><div style="margin-bottom:16px;"><label>Imagens</label><div id="editor-q-imgs">${imgsExistHtml}</div><button class="btn-ghost btn-sm" id="btn-q-add-img" style="margin-top:8px;">+ Imagem</button></div><div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px;"><button class="btn-ghost" onclick="window.cancelarEdicaoQuestao()">Cancelar</button><button class="btn-primary" id="btn-salvar-questao" style="width:auto;">Salvar questão</button></div></div>`;
  document.getElementById('btn-add-alt').addEventListener('click', () => adicionarAlternativa());
  document.getElementById('btn-q-add-img').addEventListener('click', () => document.getElementById('file-questao-img').click());
  document.getElementById('btn-salvar-questao').addEventListener('click', () => salvarQuestao(q.id));
  questaoExistingImgs = [...(q.imagens || [])];
}

window.removerAlternativa = (idx) => {
  const inputs = document.querySelectorAll('.alt-editor-inp');
  if (inputs.length <= 2) {
    toast('Mínimo 2 alternativas', 'warn');
    return;
  }
  document.querySelectorAll('.alt-editor-row')[idx]?.remove();
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
  div.innerHTML =
    `<input class="alt-editor-radio" type="radio" name="alt-correta" value="${idx}" /><input type="text" class="alt-editor-inp" data-idx="${idx}" value="" placeholder="Alternativa ${letras[idx]}" style="width:100%;background:var(--bg-3);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 14px;color:var(--text);font-family:inherit;font-size:14.5px;outline:none;" /><button class="btn-danger btn-sm btn-icon" onclick="window.removerAlternativa(${idx})">✕</button>`;
  document.getElementById('alts-editor').appendChild(div);
}

document.getElementById('file-questao-img').addEventListener('change', (e) => {
  Array.from(e.target.files).forEach((file) => {
    const previewUrl = URL.createObjectURL(file);
    editorQuestaoImgs.push({ file, previewUrl });
    const wrap = document.createElement('div');
    wrap.className = 'pending-img-wrap';
    wrap.innerHTML = `<img src="${previewUrl}" alt="" /><button class="pending-img-remove">✕</button>`;
    wrap.querySelector('button').addEventListener('click', () => {
      const i = editorQuestaoImgs.findIndex((p) => p.previewUrl === previewUrl);
      if (i >= 0) editorQuestaoImgs.splice(i, 1);
      wrap.remove();
    });
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
  const payload = { enunciado, alternativas, correta, ordem, imagens, simulado_id: editorSimuladoId };
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
  renderizarEditorForm({ enunciado: '', alternativas: ['', ''], correta: 0, ordem: 1, imagens: [] });
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
      validas.push({ ...q, simulado_id: editorSimuladoId, imagens: q.imagens || [] });
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

document.getElementById('btn-voltar-editor').addEventListener('click', () => {
  document.getElementById('tela-editor-simulado').classList.add('hidden');
  document.getElementById('main-app').classList.remove('hidden');
  editorSimuladoId = null;
  editorQuestaoId = null;
  carregarSimulados();
  window._navigateTo('simulados');
});
