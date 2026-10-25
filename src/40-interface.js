/* CHICOTES DO DESTINO — 40-interface.js: HUD, menus e painéis (azul tipo Terraria mobile, PT-BR). */
(function () {
  'use strict';
  var D = GAME_DATA;
  function el(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  var UI = { painel: null, itemSelecionado: null, filtroInv: 'todos', abaConq: 'Todas', lojaNpc: null };

  UI.toast = function (msg, cor) {
    var caixa = el('toasts'); if (!caixa) return;
    var t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
    if (cor) t.style.borderColor = cor;
    caixa.appendChild(t);
    while (caixa.children.length > 5) caixa.removeChild(caixa.firstChild);
    setTimeout(function () { t.classList.add('sumir'); setTimeout(function () { t.remove(); }, 400); }, 4200);
  };

  UI.mostrarTela = function (nome) {
    ['tela-menu', 'tela-mundos', 'tela-jogo'].forEach(function (id) { el(id).classList.toggle('ativa', id === nome); });
    UI.fecharPaineis();
    if (nome === 'tela-menu') UI.atualizarMenu();
    if (nome === 'tela-mundos') UI.renderMundos();
  };
  UI.atualizarMenu = function () {
    var p = Save.perfil();
    el('menu-conquistas-resumo').textContent = p.conquistas.length + ' / 429 (' + Math.floor(p.conquistas.length / 429 * 100) + '%)';
    el('btn-continuar').style.display = p.ultimoMundo ? '' : 'none';
  };

  // ---------------------------------------------------------------- mundos
  UI.renderMundos = function () {
    var lista = el('lista-mundos');
    lista.innerHTML = '<p class="dica">Carregando mundos salvos…</p>';
    Save.listarMundos().then(function (mundos) {
      mundos.sort(function (a, b) { return (b.modificado || 0) - (a.modificado || 0); });
      if (!mundos.length) { lista.innerHTML = '<p class="dica">Nenhum mundo salvo ainda. Crie o primeiro aqui do lado — é rapidinho. 👉</p>'; return; }
      lista.innerHTML = '';
      mundos.forEach(function (m) {
        var card = document.createElement('div'); card.className = 'mundo-card';
        var data = new Date(m.modificado || m.criadoEm || Date.now());
        card.innerHTML =
          (m.miniatura ? '<img class="mundo-mini" alt="miniatura" src="' + m.miniatura + '">' : '<div class="mundo-mini mundo-mini-vazio">1400×480</div>') +
          '<div class="mundo-info"><strong>' + esc(m.nome) + '</strong>' +
          '<span>Semente: ' + esc(m.seed) + ' · ' + data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + '</span>' +
          '<span>Chefes: ' + (m.chefes || 0) + '/94 · Chicotes: ' + (m.chicotes || 0) + '/200</span></div>' +
          '<div class="mundo-acoes"><button class="btn btn-primario" data-acao="abrir">Jogar</button>' +
          '<button class="btn" data-acao="exportar">Exportar</button>' +
          '<button class="btn btn-perigo" data-acao="apagar">Apagar</button></div>';
        card.querySelector('[data-acao="abrir"]').onclick = function () { AudioJogo.init(); Jogo.carregarMundoSalvo(m.id); };
        card.querySelector('[data-acao="exportar"]').onclick = function () { Jogo.exportarMundo(m.id); };
        card.querySelector('[data-acao="apagar"]').onclick = function () {
          if (confirm('Apagar o mundo "' + m.nome + '" para sempre?')) Save.apagarMundo(m.id).then(function () { UI.toast('Mundo apagado.'); UI.renderMundos(); });
        };
        lista.appendChild(card);
      });
    });
  };

  // ---------------------------------------------------------------- painéis
  var PAINEIS = ['pausa', 'arsenal', 'conquistas', 'criacao', 'inventario', 'chefes', 'mapa', 'som', 'controles', 'loja', 'sobre'];
  UI.abrirPainel = function (nome) {
    if (UI.painel === nome) { UI.fecharPaineis(); return; }
    UI.painel = nome;
    PAINEIS.forEach(function (p) { el('painel-' + p).classList.toggle('ativo', p === nome); });
    el('fundo-paineis').classList.add('ativo');
    AudioJogo.clicar();
    if (nome === 'arsenal') UI.renderArsenal();
    if (nome === 'conquistas') UI.renderConquistas();
    if (nome === 'criacao') UI.renderCriacao();
    if (nome === 'inventario') UI.renderInventario();
    if (nome === 'chefes') UI.renderChefes();
    if (nome === 'mapa') UI.renderMapa();
    if (nome === 'som') UI.renderSom();
    if (nome === 'loja') UI.renderLoja();
    if (window.G) G.pausado = (nome === 'pausa') || G.estado !== 'jogando' ? G.pausado : false;
    if (window.G && nome === 'pausa') G.pausado = true;
  };
  UI.fecharPaineis = function () {
    UI.painel = null;
    PAINEIS.forEach(function (p) { var n = el('painel-' + p); if (n) n.classList.remove('ativo'); });
    var f = el('fundo-paineis'); if (f) f.classList.remove('ativo');
    if (window.G && G.estado === 'jogando') G.pausado = false;
  };

  // ---------------------------------------------------------------- HUD
  UI.atualizarHUD = function () {
    if (!G.jogador) return;
    var j = G.jogador, a = Combate.atributos();
    var vidaMax = j.vidaMax + a.vidaExtra; if (j.vida > vidaMax) j.vida = vidaMax;
    // corações de pixel (20 de vida cada)
    var coracoes = Math.ceil(vidaMax / 20), cheio = Math.floor(j.vida / 20), meio = (j.vida % 20) >= 10;
    var h = '';
    for (var i = 0; i < coracoes; i++) h += '<span class="coracao' + (i < cheio ? ' cheio' : (i === cheio && meio ? ' meio' : '')) + '">❤</span>';
    el('hud-vida').innerHTML = h + '<span class="hud-vida-num">' + Math.ceil(j.vida) + '/' + vidaMax + '</span>';
    el('hud-moedas').textContent = '🪙 ' + U.fmtNum(j.moedas);
    el('hud-chefes').textContent = '👑 ' + Object.keys(G.chefesDerrotados).length + '/94';
    var w = Combate.chicoteEquipado();
    el('hud-chicote').innerHTML = w ? 'Chicote: <b style="color:' + w.corTier + '">' + esc(w.nome) + '</b> <small>T' + w.tier + ' · dano ' + w.danoBase + '→estalo ' + w.danoEstalo + ' · ' + w.alvos + ' alvos</small>' : 'Sem chicote equipado';
    // barra de itens
    var barra = el('hud-barra'); barra.innerHTML = '';
    j.barra.forEach(function (id, idx) {
      var slot = document.createElement('button');
      slot.className = 'slot' + (idx === j.selecionado ? ' selecionado' : '');
      slot.title = (idx + 1) + (id && D.ITEM_BY_ID[id] ? ' — ' + D.ITEM_BY_ID[id].nome : '');
      if (id && D.ITEM_BY_ID[id]) {
        var item = D.ITEM_BY_ID[id];
        if (item.tipo === 'chicote') slot.style.borderColor = item.chicote.corTier;
        var qtd = Combate.qtdItem(id);
        slot.innerHTML = '<img alt="" src="' + iconeDataURL(item) + '">' + (item.empilhavel && qtd !== 1 ? '<span class="slot-qtd">' + qtd + '</span>' : '') + '<span class="slot-num">' + ((idx + 1) % 10) + '</span>';
      } else slot.innerHTML = '<span class="slot-num">' + ((idx + 1) % 10) + '</span>';
      slot.onclick = function () { j.selecionado = idx; G.uiSuja = true; AudioJogo.clicar(); };
      barra.appendChild(slot);
    });
    // item selecionado + modo
    var selId = j.barra[j.selecionado], selItem = selId ? D.ITEM_BY_ID[selId] : null;
    var modo = !selItem ? 'mãos vazias' : selItem.tipo === 'chicote' ? 'golpear (clique) · segurar 0,45s = giro · botão direito/F = gancho'
      : selItem.tipo === 'picareta' ? 'minerar: segure o clique num bloco'
      : selItem.tipo === 'bloco' ? 'construir: clique num espaço vazio'
      : selItem.tipo === 'pocao' ? 'beber com clique' : selItem.tipo === 'invocador' ? 'clique para invocar o chefe!' : selItem.nome;
    el('hud-selecionado').innerHTML = (selItem ? '<b style="color:' + selItem.cor + '">' + esc(selItem.nome) + '</b>' : '—') + ' <small>' + esc(modo) + '</small>';
    // relógio/bioma/profundidade
    var tx = U.clamp(Math.floor(j.x / 16), 0, Mundo.W - 1);
    var prof = Math.max(0, Math.floor(j.y / 16) - (G.world.surface[tx] || 110));
    el('hud-ambiente').textContent = (G.noite ? '🌙 Noite' : '☀️ Dia') + ' · ' + Mundo.biomaDe(tx).nome + (prof > 4 ? ' · profundidade ' + prof : '') + ' · Defesa ' + a.defesa;
    // buffs
    var buffs = Object.keys(j.buffs).filter(function (k) { return j.buffs[k] > 0; }).map(function (k) { return k + ' ' + Math.ceil(j.buffs[k]) + 's'; }).join(' · ');
    el('hud-buffs').textContent = buffs ? '✨ ' + buffs : '';
    // chefe
    var areaChefe = el('hud-chefe');
    if (G.chefe) {
      areaChefe.style.display = '';
      el('hud-chefe-nome').textContent = G.chefe.nome + ' — fase ' + G.chefe.fase + '/' + G.chefe.fasesTotais;
      el('hud-chefe-vida').style.width = Math.max(0, G.chefe.vida / G.chefe.vidaMax * 100) + '%';
      el('hud-chefe-num').textContent = Math.max(0, Math.ceil(G.chefe.vida)) + ' / ' + G.chefe.vidaMax;
    } else areaChefe.style.display = 'none';
    // contador de conquistas no botão da pausa/menu lateral
    el('hud-conquistas').textContent = '🏆 ' + G.perfil.conquistas.length + '/429';
    G.uiSuja = false;
  };

  UI.atualizarBalao = function () {
    var balao = el('balao-npc');
    var dica = el('dica-interacao');
    if (!G.jogador || G.estado !== 'jogando') { balao.classList.remove('ativo'); dica.classList.remove('ativo'); return; }
    var npc = Combate.npcPerto();
    if (npc && !UI.painel) {
      dica.textContent = 'E — falar com ' + npc.nome; dica.classList.add('ativo');
    } else dica.classList.remove('ativo');
    if (G.balao && G.tempo < G.balao.ate) {
      balao.innerHTML = '<strong>' + esc(G.balao.nome) + '</strong><br>' + esc(G.balao.texto);
      var tela = Jogo.mundoParaTela(G.balao.x, G.balao.y - 50);
      balao.style.left = tela.x + 'px'; balao.style.top = tela.y + 'px';
      balao.classList.add('ativo');
    } else balao.classList.remove('ativo');
    // indicador de carga do giro
    var carga = el('indicador-carga');
    if (G.carregando) {
      var p = Math.min(1, G.carregando.t / 0.45);
      carga.classList.add('ativo'); carga.style.width = (p * 100) + '%';
      carga.style.background = p >= 1 ? '#ffd166' : '#7fc8f8';
      el('indicador-carga-texto').textContent = p >= 1 ? 'Solte para o GIRO de 360°!' : 'Carregando giro…';
    } else carga.classList.remove('ativo');
  };

  // ---------------------------------------------------------------- Arsenal (200)
  UI.renderArsenal = function () {
    var tier = el('arsenal-tier').value, busca = el('arsenal-busca').value.trim().toLowerCase(), soMeus = el('arsenal-so-meus').checked;
    var obtidos = G.jogador ? G.jogador.obtidos : {};
    var total = D.WHIPS.filter(function (w) { return obtidos[w.itemId]; }).length;
    el('arsenal-resumo').textContent = total + ' de 200 chicotes obtidos · Apoteose: ' + (obtidos.chicote_200 ? 'empunhada!' : Object.keys(G.chefesDerrotados || {}).length + '/94 chefes');
    var lista = el('arsenal-lista'); lista.innerHTML = '';
    D.WHIPS.forEach(function (w) {
      if (tier !== '0' && w.tier !== parseInt(tier, 10)) return;
      var item = D.ITEM_BY_ID[w.itemId];
      if (busca && item.nome.toLowerCase().indexOf(busca) < 0) return;
      var meu = !!obtidos[w.itemId];
      if (soMeus && !meu) return;
      var q = document.createElement('button');
      q.className = 'item-card' + (meu ? ' tenho' : '');
      q.style.borderColor = w.corTier;
      q.innerHTML = '<img alt="" src="' + iconeDataURL(item) + '"><span class="item-nome" style="color:' + w.corTier + '">#' + w.numero + ' ' + esc(item.nome) + '</span>' +
        '<span class="item-sub">T' + w.tier + ' · dano ' + w.danoBase + '→' + w.danoEstalo + ' · ' + w.alcanceBlocos + ' blocos · ' + w.alvos + ' alvos' + (w.par ? ' · PAR' : '') + '</span>' +
        '<span class="item-sub">' + (meu ? '✔ obtido — clique para equipar' : esc(w.origem) + (w.chefeGuarda ? ' · chefe nº ' + w.chefeGuarda : '')) + '</span>';
      q.onclick = function () { UI.detalheItem(w.itemId, 'arsenal-detalhe'); AudioJogo.clicar(); };
      lista.appendChild(q);
    });
    if (!lista.children.length) lista.innerHTML = '<p class="dica">Nenhum chicote combina com o filtro.</p>';
  };

  // ---------------------------------------------------------------- detalhe de item / equipamento
  UI.detalheItem = function (itemId, destinoId) {
    var item = D.ITEM_BY_ID[itemId]; if (!item) return;
    UI.itemSelecionado = itemId;
    var destino = el(destinoId); if (!destino) return;
    var j = G.jogador, tenho = j && Combate.qtdItem(itemId) > 0;
    var receita = D.RECIPES.find(function (r) { return r.resultado === itemId; });
    var html = '<div class="detalhe"><img alt="" src="' + iconeDataURL(item) + '"><div><h3 style="color:' + item.cor + '">' + esc(item.nome) + '</h3><p>' + esc(item.descricao) + '</p>';
    if (item.tipo === 'chicote') {
      var w = item.chicote;
      html += '<p>Alcance ' + w.alcanceBlocos + ' blocos (2–3× o de uma espada) · corda com ' + w.segmentos + ' segmentos · agarra ' + esc(w.ganchoEm) + ' · efeito: ' + esc(w.efeitoNome) + '</p>';
    }
    if (receita) html += '<p><b>Receita</b> (' + esc(receita.estacao) + '): ' + receita.ingredientes.map(function (g) { return g.qtd + '× ' + esc(D.ITEM_BY_ID[g.item].nome); }).join(', ') + '</p>';
    if (item.tipo === 'chicote' && item.chicote.chefeGuarda) html += '<p>Guardado pelo chefe nº ' + item.chicote.chefeGuarda + ': ' + esc(D.BOSSES[item.chicote.chefeGuarda - 1].nome) + '.</p>';
    html += '</div></div><div class="detalhe-acoes">';
    if (tenho) {
      if (item.tipo === 'chicote') html += '<button class="btn btn-primario" id="dt-equipar">Equipar chicote</button>';
      if (item.tipo === 'armadura') html += '<button class="btn btn-primario" id="dt-equipar">' + (j.equipamentos.armadura === itemId ? 'Desequipar armadura' : 'Equipar armadura') + '</button>';
      if (item.tipo === 'acessorio') html += '<button class="btn btn-primario" id="dt-equipar">Equipar acessório (4 espaços)</button>';
      if (item.tipo === 'picareta') html += '<button class="btn btn-primario" id="dt-equipar">Colocar no espaço 2</button>';
      if (item.tipo === 'pocao') html += '<button class="btn btn-primario" id="dt-usar">Beber agora</button>';
      if (item.tipo === 'invocador' && G.estado === 'jogando') html += '<button class="btn btn-perigo" id="dt-usar">Invocar chefe!</button>';
      html += '<button class="btn" id="dt-barra">Colocar no espaço selecionado da barra (' + (j.selecionado + 1) + ')</button>';
    } else html += '<span class="dica">Você ainda não tem este item.</span>';
    html += '</div>';
    destino.innerHTML = html;
    var bEq = el('dt-equipar');
    if (bEq) bEq.onclick = function () { Jogo.equipar(itemId); UI.detalheItem(itemId, destinoId); if (destinoId === 'inv-detalhe') UI.renderInventario(true); };
    var bUsar = el('dt-usar');
    if (bUsar) bUsar.onclick = function () { if (item.tipo === 'pocao') Jogo.usarPocao(itemId); else if (item.tipo === 'invocador') { UI.fecharPaineis(); Jogo.usarSelo(itemId); } UI.detalheItem(itemId, destinoId); };
    var bBarra = el('dt-barra');
    if (bBarra) bBarra.onclick = function () { j.barra[j.selecionado] = itemId; if (item.tipo === 'chicote') j.equipamentos.chicote = itemId; G.uiSuja = true; UI.toast(item.nome + ' está no espaço ' + (j.selecionado + 1) + ' da barra.'); };
  };

  // ---------------------------------------------------------------- Inventário + equipamentos
  UI.renderInventario = function (manter) {
    var j = G.jogador;
    var eq = el('inv-equipamentos');
    if (!j) { el('inv-lista').innerHTML = '<p class="dica">Abra um mundo para ver o inventário.</p>'; return; }
    function slotEq(rotulo, id) { return '<div class="eq-slot"><span>' + rotulo + '</span>' + (id && D.ITEM_BY_ID[id] ? '<img alt="" src="' + iconeDataURL(D.ITEM_BY_ID[id]) + '"><b style="color:' + D.ITEM_BY_ID[id].cor + '">' + esc(D.ITEM_BY_ID[id].nome) + '</b>' : '<em>vazio</em>') + '</div>'; }
    var pic = Combate.picaretaEquipada();
    eq.innerHTML = slotEq('Chicote', j.equipamentos.chicote) + slotEq('Armadura (1 espaço)', j.equipamentos.armadura) +
      slotEq('Picareta', pic && pic.id) + '<div class="eq-slot"><span>Acessórios (4 espaços)</span>' +
      j.equipamentos.acessorios.map(function (a) { return a ? '<b style="color:' + D.ITEM_BY_ID[a].cor + '">' + esc(D.ITEM_BY_ID[a].nome) + '</b>' : '<em>vazio</em>'; }).join('<br>') + '</div>';
    var a = Combate.atributos();
    el('inv-atributos').textContent = 'Defesa ' + a.defesa + ' · dano ×' + a.danoMult.toFixed(2) + ' · alcance ×' + a.alcanceMult.toFixed(2) + ' · moedas 🪙 ' + U.fmtNum(j.moedas) + ' · itens distintos: ' + Object.keys(j.obtidos).length + '/628';
    var filtro = el('inv-filtro').value, busca = el('inv-busca').value.trim().toLowerCase();
    var lista = el('inv-lista'); lista.innerHTML = '';
    Object.keys(j.inventario).sort(function (x, y) { return D.ITEM_BY_ID[x].nome.localeCompare(D.ITEM_BY_ID[y].nome); }).forEach(function (id) {
      var item = D.ITEM_BY_ID[id]; if (!item) return;
      if (filtro !== 'todos' && item.tipo !== filtro) return;
      if (busca && item.nome.toLowerCase().indexOf(busca) < 0) return;
      var q = document.createElement('button'); q.className = 'item-card tenho';
      q.style.borderColor = item.tipo === 'chicote' ? item.chicote.corTier : item.cor;
      q.innerHTML = '<img alt="" src="' + iconeDataURL(item) + '"><span class="item-nome" style="color:' + item.cor + '">' + esc(item.nome) + '</span><span class="item-sub">' + esc(item.tipo) + ' · ×' + j.inventario[id] + '</span>';
      q.onclick = function () { UI.detalheItem(id, 'inv-detalhe'); AudioJogo.clicar(); };
      lista.appendChild(q);
    });
    if (!lista.children.length) lista.innerHTML = '<p class="dica">Nada por aqui com esse filtro.</p>';
    if (!manter && UI.itemSelecionado) UI.detalheItem(UI.itemSelecionado, 'inv-detalhe');
  };

  // ---------------------------------------------------------------- Criação (433 receitas)
  var ESTACAO_ITEM = { 'Bancada de Trabalho': 'especial_1', 'Forja de Pedra': 'especial_2', 'Bigorna': 'especial_3', 'Forja Celeste': 'especial_4', 'Mesa de Poções': 'especial_5' };
  UI.podeCriar = function (rec) {
    var j = G.jogador; if (!j) return false;
    var est = ESTACAO_ITEM[rec.estacao];
    if (est && Combate.qtdItem(est) <= 0) return false;
    return rec.ingredientes.every(function (g) { return Combate.qtdItem(g.item) >= g.qtd; });
  };
  UI.renderCriacao = function () {
    var cat = el('criacao-categoria').value, busca = el('criacao-busca').value.trim().toLowerCase(), soPosso = el('criacao-so-posso').checked;
    var lista = el('criacao-lista'); lista.innerHTML = '';
    var cont = 0;
    D.RECIPES.forEach(function (rec) {
      if (cat !== 'todas' && rec.categoria !== cat) return;
      var item = D.ITEM_BY_ID[rec.resultado];
      if (busca && item.nome.toLowerCase().indexOf(busca) < 0) return;
      var posso = UI.podeCriar(rec);
      if (soPosso && !posso) return;
      cont++;
      if (cont > 140) return; // desempenho: refine a busca
      var card = document.createElement('div'); card.className = 'receita-card';
      var ings = rec.ingredientes.map(function (g) {
        var tenho = G.jogador ? Combate.qtdItem(g.item) : 0;
        return '<span class="' + (tenho >= g.qtd ? 'ing-ok' : 'ing-falta') + '">' + esc(D.ITEM_BY_ID[g.item].nome) + ' ' + tenho + '/' + g.qtd + '</span>';
      }).join(' · ');
      card.innerHTML = '<img alt="" src="' + iconeDataURL(item) + '"><div class="receita-info"><b style="color:' + item.cor + '">' + esc(item.nome) + '</b> ×' + rec.qtd +
        '<small>' + esc(rec.categoria) + ' · ' + esc(rec.estacao) + '</small><small>' + ings + '</small></div>' +
        '<button class="btn ' + (posso ? 'btn-primario' : '') + '" ' + (posso ? '' : 'disabled') + '>Criar</button>';
      card.querySelector('button').onclick = function () { Jogo.criarReceita(rec); UI.renderCriacao(); };
      lista.appendChild(card);
    });
    el('criacao-resumo').textContent = '433 receitas no catálogo' + (cont > 140 ? ' — mostrando as 140 primeiras; refine a busca 🔍' : ' — mostrando ' + lista.children.length);
  };

  // ---------------------------------------------------------------- Chefes (94)
  UI.renderChefes = function () {
    // Selo final: entregue ao chegar a 93/94 (o 94º não tem receita)
    if (G.jogador && Object.keys(G.chefesDerrotados).length >= 93 && !G.chefesDerrotados[94] && Combate.qtdItem('selo_94') <= 0 && !G.jogador.obtidos.selo_94) {
      Combate.darItem('selo_94', 1); UI.toast('O Altar entregou o Selo de Apoteose.', '#ffffff');
    }
    el('chefes-resumo').textContent = Object.keys(G.chefesDerrotados || {}).length + ' de 94 chefes derrotados · Apoteose ' + (G.jogador && G.jogador.obtidos.chicote_200 ? 'obtida!' : 'só existe com 94/94');
    var lista = el('chefes-lista'); lista.innerHTML = '';
    var atoAtual = null;
    D.BOSSES.forEach(function (b) {
      if (b.ato !== atoAtual) { atoAtual = b.ato; var h = document.createElement('h3'); h.className = 'ato-titulo'; h.textContent = atoAtual; lista.appendChild(h); }
      var vencido = !!(G.chefesDerrotados && G.chefesDerrotados[b.indice]);
      var selos = G.jogador ? Combate.qtdItem('selo_' + b.indice) : 0;
      var card = document.createElement('div'); card.className = 'chefe-card' + (vencido ? ' vencido' : '');
      card.style.borderColor = b.cor;
      var guarda = b.chicoteGuardado ? ' · guarda ' + esc(D.WHIPS[b.chicoteGuardado - 1].nome) + ' (T' + D.WHIPS[b.chicoteGuardado - 1].tier + ')' : '';
      var acess = b.acessorioExclusivo ? ' · acessório: ' + esc(D.ITEM_BY_ID[b.acessorioExclusivo].nome) : '';
      card.innerHTML = '<div class="chefe-info"><b style="color:' + b.cor + '">#' + b.indice + ' ' + esc(b.nome) + '</b> ' + (vencido ? '✔ derrotado' : '') +
        '<small>Vida ' + U.fmtNum(b.hp) + ' · ' + b.fases + ' fase' + (b.fases > 1 ? 's' : '') + ' · ' + esc(b.mecanica) + guarda + acess + '</small></div>' +
        '<button class="btn ' + (selos > 0 ? 'btn-perigo' : '') + '" ' + (selos > 0 && G.estado === 'jogando' ? '' : 'disabled') + '>' + (selos > 0 ? 'Invocar (' + selos + ' selo' + (selos > 1 ? 's' : '') + ')' : 'sem selo') + '</button>';
      card.querySelector('button').onclick = function () { UI.fecharPaineis(); Jogo.usarSelo('selo_' + b.indice); };
      lista.appendChild(card);
    });
  };

  // ---------------------------------------------------------------- Conquistas (429)
  UI.renderConquistas = function () {
    var perfil = G.perfil || Save.perfil();
    var total = perfil.conquistas.length;
    el('conq-resumo').textContent = total + ' / 429 (' + Math.floor(total / 429 * 100) + '%)';
    el('conq-barra').style.width = (total / 429 * 100) + '%';
    var abasEl = el('conq-abas'); abasEl.innerHTML = '';
    var cats = ['Todas'].concat(['Chicotes', 'Chefes', 'Progressão', 'Combate', 'Mineração e construção', 'Equipamento', 'Exploração', 'Economia e NPCs', 'Mundos', 'Segredos']);
    cats.forEach(function (c) {
      var b = document.createElement('button'); b.className = 'btn btn-aba' + (UI.abaConq === c ? ' ativa' : ''); b.textContent = c;
      b.onclick = function () { UI.abaConq = c; UI.renderConquistas(); };
      abasEl.appendChild(b);
    });
    var ganhas = {}; perfil.conquistas.forEach(function (id) { ganhas[id] = true; });
    var lista = D.ACHIEVEMENTS.filter(function (a) { return UI.abaConq === 'Todas' || a.categoria === UI.abaConq; });
    // ordem da especificação: desbloqueadas, depois ocultas (???), depois em progresso
    function rank(a) { if (ganhas[a.id]) return 0; if (a.secreta) return 1; return 2; }
    lista.sort(function (a, b) { return rank(a) - rank(b); });
    var elLista = el('conq-lista'); elLista.innerHTML = '';
    var CORES_RAR = { 'Comum': '#cfd8e3', 'Raro': '#59b7ff', 'Épico': '#c07bff', 'Lendário': '#ffd166' };
    lista.slice(0, 220).forEach(function (a) {
      var div = document.createElement('div');
      var feita = !!ganhas[a.id];
      if (a.secreta && !feita) {
        div.className = 'conquista secreta';
        div.innerHTML = '<span class="conq-nome">???</span><span class="conq-desc">???</span><span class="conq-rar">Segredo</span>';
      } else {
        div.className = 'conquista' + (feita ? ' feita' : '');
        div.innerHTML = '<span class="conq-nome" style="color:' + CORES_RAR[a.raridade] + '">' + (feita ? '✔ ' : '') + esc(a.nome) + '</span><span class="conq-desc">' + esc(a.descricao) + '</span><span class="conq-rar">' + a.raridade + '</span>';
      }
      elLista.appendChild(div);
    });
    if (lista.length > 220) elLista.innerHTML += '<p class="dica">Mostrando 220 — escolha uma categoria para ver o resto.</p>';
  };

  // ---------------------------------------------------------------- Mapa
  UI.renderMapa = function () {
    var cv = el('mapa-canvas'), ctx = cv.getContext('2d');
    ctx.fillStyle = '#0b1e33'; ctx.fillRect(0, 0, cv.width, cv.height);
    if (!G.world) return;
    var sx = cv.width / Mundo.W, sy = cv.height / Mundo.H, x, y;
    for (y = 0; y < Mundo.H; y += 2) for (x = 0; x < Mundo.W; x += 2) {
      if (!G.explorado[y * Mundo.W + x]) continue;
      var d = Mundo.defTile(G.world, x, y);
      ctx.fillStyle = d.id === 0 ? (y < (G.world.surface[x] || 110) ? '#79b5e0' : '#132b45') : d.cor;
      ctx.fillRect(x * sx, y * sy, Math.ceil(2 * sx), Math.ceil(2 * sy));
    }
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(G.jogador.x / 16 * sx, G.jogador.y / 16 * sy, 3, 0, 7); ctx.fill();
    var pct = 0; for (var i = 0; i < G.explorado.length; i++) if (G.explorado[i]) pct++;
    el('mapa-info').textContent = 'Mapa revelado: ' + Math.round(pct / G.explorado.length * 100) + '% · mundo 1400×480 · ponto branco = você';
  };

  // ---------------------------------------------------------------- Som / acessibilidade
  UI.renderSom = function () {
    var cfg = Save.perfil().config;
    el('som-volume').value = Math.round(cfg.volume * 100);
    el('som-ativo').checked = cfg.som; el('som-musica').checked = cfg.musica;
    el('cfg-tremor').value = String(cfg.tremor); el('cfg-faisca').checked = cfg.faisca !== false;
    el('cfg-fonte').checked = !!cfg.fonteGrande; el('cfg-toque').checked = cfg.toque !== false;
  };
  UI.aplicarConfig = function () {
    var p = Save.perfil();
    p.config.volume = parseInt(el('som-volume').value, 10) / 100;
    p.config.som = el('som-ativo').checked; p.config.musica = el('som-musica').checked;
    p.config.tremor = parseFloat(el('cfg-tremor').value); p.config.faisca = el('cfg-faisca').checked;
    p.config.fonteGrande = el('cfg-fonte').checked; p.config.toque = el('cfg-toque').checked;
    Save.salvarPerfil(p); if (window.G) G.perfil = p;
    document.body.classList.toggle('fonte-grande', p.config.fonteGrande);
    if (AudioJogo.master) AudioJogo.master.gain.value = p.config.volume;
    AudioJogo.musica(p.config.musica && p.config.som);
    Jogo.atualizarToque();
  };

  // ---------------------------------------------------------------- Loja da vila
  var ITENS_LOJA = [
    ['pocao_1', 10], ['pocao_2', 25], ['pocao_5', 40], ['pocao_6', 40], ['pocao_18', 30],
    ['bloco_31', 2], ['bloco_34', 3], ['bloco_9', 2], ['material_1', 5], ['material_2', 5], ['material_14', 4],
    ['especial_4', 400], ['especial_15', 120], ['picareta_2', 250]
  ];
  UI.renderLoja = function () {
    var j = G.jogador; if (!j) return;
    el('loja-moedas').textContent = '🪙 ' + U.fmtNum(j.moedas);
    var lista = el('loja-lista'); lista.innerHTML = '';
    ITENS_LOJA.forEach(function (par) {
      var item = D.ITEM_BY_ID[par[0]], preco = par[1];
      var div = document.createElement('div'); div.className = 'receita-card';
      div.innerHTML = '<img alt="" src="' + iconeDataURL(item) + '"><div class="receita-info"><b style="color:' + item.cor + '">' + esc(item.nome) + '</b><small>' + esc(item.descricao) + '</small></div><button class="btn btn-primario" ' + (j.moedas >= preco ? '' : 'disabled') + '>🪙 ' + preco + '</button>';
      div.querySelector('button').onclick = function () {
        if (j.moedas < preco) return;
        j.moedas -= preco; G.stats.compras++; Combate.darItem(par[0], 1); AudioJogo.moeda(); G.uiSuja = true; UI.renderLoja();
      };
      lista.appendChild(div);
    });
    // selo do próximo chefe e do subsequente, para não travar a progressão
    var pend = D.BOSSES.filter(function (b) { return !G.chefesDerrotados[b.indice] && b.indice < 94; }).slice(0, 2);
    pend.forEach(function (b) {
      var item = D.ITEM_BY_ID['selo_' + b.indice], preco = 30 + b.indice * 4;
      var div = document.createElement('div'); div.className = 'receita-card';
      div.innerHTML = '<img alt="" src="' + iconeDataURL(item) + '"><div class="receita-info"><b style="color:' + item.cor + '">' + esc(item.nome) + '</b><small>Invoca ' + esc(b.nome) + ' (' + esc(b.ato) + '). Também dá para criar (C → Invocação).</small></div><button class="btn btn-primario" ' + (j.moedas >= preco ? '' : 'disabled') + '>🪙 ' + preco + '</button>';
      div.querySelector('button').onclick = function () { if (j.moedas < preco) return; j.moedas -= preco; G.stats.compras++; Combate.darItem('selo_' + b.indice, 1); AudioJogo.moeda(); UI.renderLoja(); };
      lista.appendChild(div);
    });
  };

  // ---------------------------------------------------------------- ligações
  UI.init = function () {
    el('btn-continuar').onclick = function () { AudioJogo.init(); Jogo.carregarMundoSalvo(Save.perfil().ultimoMundo); };
    el('btn-jogar').onclick = function () { AudioJogo.init(); UI.mostrarTela('tela-mundos'); };
    el('btn-mundos').onclick = function () { UI.mostrarTela('tela-mundos'); };
    el('btn-menu-arsenal').onclick = function () { UI.abrirPainel('arsenal'); };
    el('btn-menu-conquistas').onclick = function () { UI.abrirPainel('conquistas'); };
    el('btn-menu-som').onclick = function () { UI.abrirPainel('som'); };
    el('btn-menu-sobre').onclick = function () { UI.abrirPainel('sobre'); };
    el('btn-menu-sair').onclick = function () { UI.toast('Até logo! O destino aguarda... Feche a aba para sair de vez.'); };
    el('btn-voltar-menu').onclick = function () { UI.mostrarTela('tela-menu'); };
    el('btn-criar-mundo').onclick = function () {
      AudioJogo.init();
      var nome = el('novo-nome').value.trim() || 'Meu Mundo';
      var seed = el('novo-seed').value.trim() || String(Math.floor(Math.random() * 999999));
      Jogo.criarNovoMundo(nome, seed);
    };
    el('btn-seed-aleatoria').onclick = function () { el('novo-seed').value = String(Math.floor(Math.random() * 999999)); };
    el('importar-arquivo').addEventListener('change', function (ev) {
      var arq = ev.target.files[0]; if (!arq) return;
      arq.text().then(function (txt) { Jogo.importarMundo(txt); }).catch(function () { UI.toast('Não consegui ler esse arquivo.'); });
      ev.target.value = '';
    });
    el('fundo-paineis').addEventListener('mousedown', function (ev) { if (ev.target === el('fundo-paineis')) UI.fecharPaineis(); });
    document.querySelectorAll('[data-fechar]').forEach(function (b) { b.addEventListener('click', UI.fecharPaineis); });
    document.querySelectorAll('[data-abrir]').forEach(function (b) { b.addEventListener('click', function () { UI.abrirPainel(b.getAttribute('data-abrir')); }); });
    ['arsenal-tier', 'arsenal-so-meus'].forEach(function (id) { el(id).addEventListener('change', UI.renderArsenal); });
    el('arsenal-busca').addEventListener('input', UI.renderArsenal);
    el('inv-filtro').addEventListener('change', function () { UI.renderInventario(); });
    el('inv-busca').addEventListener('input', function () { UI.renderInventario(); });
    el('criacao-categoria').addEventListener('change', UI.renderCriacao);
    el('criacao-so-posso').addEventListener('change', UI.renderCriacao);
    el('criacao-busca').addEventListener('input', UI.renderCriacao);
    ['som-volume', 'som-ativo', 'som-musica', 'cfg-tremor', 'cfg-faisca', 'cfg-fonte', 'cfg-toque'].forEach(function (id) { el(id).addEventListener('change', UI.aplicarConfig); });
    el('btn-vender-materiais').onclick = function () { Jogo.venderMateriais(); UI.renderLoja(); };
    el('btn-pausa-continuar').onclick = UI.fecharPaineis;
    el('btn-pausa-salvar').onclick = function () { Jogo.salvarAgora(); };
    el('btn-pausa-exportar').onclick = function () { Jogo.exportarMundo(); };
    el('btn-pausa-menu').onclick = function () { Jogo.voltarAoMenu(); };
    el('btn-hud-pausa').onclick = function () { UI.abrirPainel('pausa'); };
  };

  window.UI = UI;
})();
