/* CHICOTES DO DESTINO — 50-jogo.js: estado, entrada (teclado/mouse/gamepad/toque), loop e desenho. */
(function () {
  'use strict';
  var D = GAME_DATA, TILE = Mundo.TILE;
  var canvas, ctx, canvasLuz, ctxLuz, ultimoTimestamp = 0;

  var G = {
    estado: 'menu', pausado: false, tempo: 0, tempoDia: 0.32, noite: false,
    world: null, worldId: null, worldMeta: null, jogador: null,
    stats: Combate.statsZeradas(), segredos: {}, chefesDerrotados: {}, biomasSet: {},
    perfil: Save.perfil(), inimigos: [], projeteis: [], rastreadores: [], lasers: [], drops: [], particulas: [], textos: [], npcs: [], chefe: null,
    explorado: new Uint8Array(Mundo.W * Mundo.H), exploradosCount: 0,
    camera: { x: 0, y: 0, tremor: 0 }, viewW: 960, viewH: 540,
    teclas: {}, mouse: { x: 480, y: 270, esquerdo: false, direito: false }, miraAng: 0, miraGamepad: false,
    carregando: null, mineracao: null, colocarCd: 0, spawnTimer: 1.5, uiSuja: true,
    balao: null, morte: null, queda: null, noiteSubTimer: 0, autosaveTimer: 30, avaliarTimer: 1, hudTimer: 0,
    toque: { esq: false, dir: false, pulo: false, acao: false }, gamepadBotoes: {}
  };
  window.G = G;

  function el(id) { return document.getElementById(id); }
  function centroJogador() { return Combate.centro(G.jogador); }

  // --------------------------------------------------------------- novo jogo / saves
  function prepararEstado(world) {
    G.world = world; G.jogador = Combate.novoJogador(world);
    G.stats = Combate.statsZeradas(); G.segredos = {}; G.chefesDerrotados = {}; G.biomasSet = {};
    G.inimigos = []; G.projeteis = []; G.rastreadores = []; G.lasers = []; G.drops = []; G.particulas = []; G.textos = [];
    G.chefe = null; G.morte = null; G.carregando = null; G.mineracao = null; G.balao = null;
    G.explorado = new Uint8Array(Mundo.W * Mundo.H); G.exploradosCount = 0;
    G.npcs = Combate.criarNPCs(world);
    G.tempoDia = 0.32; G.spawnTimer = 2;
  }
  function darInicial(id, qtd) {
    var j = G.jogador; j.inventario[id] = (j.inventario[id] || 0) + qtd; j.obtidos[id] = true;
  }
  var Jogo = {};
  Jogo.criarNovoMundo = function (nome, seed) {
    var world = Mundo.criar(seed, nome);
    prepararEstado(world);
    ['chicote_1|1', 'picareta_1|1', 'selo_1|1', 'pocao_1|3', 'pocao_5|1', 'bloco_31|20', 'bloco_34|5', 'bloco_9|20', 'bloco_7|10',
     'material_1|4', 'material_2|4', 'material_40|2', 'especial_1|1', 'especial_2|1', 'especial_3|1', 'especial_5|1'].forEach(function (p) {
      var par = p.split('|'); darInicial(par[0], parseInt(par[1], 10));
    });
    G.worldId = 'mundo_' + Date.now().toString(36);
    G.worldMeta = { nome: nome, seed: String(seed), criadoEm: Date.now() };
    G.perfil = Save.perfil(); G.perfil.statsMundos.mundosCriados++; G.perfil.ultimoMundo = G.worldId; Save.salvarPerfil(G.perfil);
    Combate.recalcularContadores();
    entrarNoJogo();
    UI.toast('Mundo "' + nome + '" criado! A vila fica aqui do lado. Fale com o Guia Tomás (E).', '#7ed957');
    Jogo.salvarAgora(true);
  };
  function entrarNoJogo() {
    G.estado = 'jogando'; G.pausado = false;
    UI.mostrarTela('tela-jogo');
    G.uiSuja = true;
    AudioJogo.init(); AudioJogo.musica(true);
    Jogo.atualizarToque();
  }
  function miniaturaMundo() {
    try {
      var cv = document.createElement('canvas'); cv.width = 220; cv.height = 76;
      var c = cv.getContext('2d'); c.fillStyle = '#79b5e0'; c.fillRect(0, 0, 220, 76);
      for (var x = 0; x < Mundo.W; x += 6) for (var y = 0; y < Mundo.H; y += 6) {
        var d = Mundo.defTile(G.world, x, y); if (d.id === 0) continue;
        c.fillStyle = d.cor; c.fillRect(x / Mundo.W * 220, y / Mundo.H * 76, 2, 2);
      }
      return cv.toDataURL('image/png');
    } catch (e) { return ''; }
  }
  function lerArraySave(m, campo) {
    if (m[campo + 'RLE']) return U.rleDecodificar(U.base64ParaU8(m[campo + 'RLE']), Mundo.W * Mundo.H);
    if (m[campo]) return U.base64ParaU8(m[campo]);
    return new Uint8Array(Mundo.W * Mundo.H);
  }
  function montarSave() {
    var j = JSON.parse(JSON.stringify(G.jogador));
    j.golpes = []; j.giro = null; j.gancho = null;
    return {
      formato: 'chicotes-do-destino-2', id: G.worldId, nome: G.worldMeta.nome, seed: G.worldMeta.seed,
      criadoEm: G.worldMeta.criadoEm, modificado: Date.now(),
      tilesRLE: U.u8ParaBase64RLE(G.world.tiles), varsRLE: U.u8ParaBase64RLE(G.world.vars), fundoRLE: U.u8ParaBase64RLE(G.world.fundo || new Uint8Array(Mundo.W * Mundo.H)), exploradoRLE: U.u8ParaBase64RLE(G.explorado),
      spawn: G.world.spawn, casasNPC: G.world.casasNPC, platY: G.world.platY,
      jogador: j, stats: G.stats, segredos: G.segredos, chefesDerrotados: G.chefesDerrotados, tempoDia: G.tempoDia,
      chefes: Object.keys(G.chefesDerrotados).length,
      chicotes: Object.keys(G.jogador.obtidos).filter(function (id) { return D.ITEM_BY_ID[id] && D.ITEM_BY_ID[id].tipo === 'chicote'; }).length,
      miniatura: miniaturaMundo()
    };
  }
  Jogo.salvarAgora = function (silencioso) {
    if (!G.world || !G.worldId) return Promise.resolve();
    var save = montarSave();
    G.perfil = Save.perfil(); G.perfil.statsMundos.salvamentos++; G.perfil.ultimoMundo = G.worldId; Save.salvarPerfil(G.perfil);
    return Save.salvarMundo(save).then(function () { if (!silencioso) { UI.toast('Mundo salvo! (IndexedDB)'); AudioJogo.criar(); } });
  };
  function aplicarSave(m) {
    var tiles = lerArraySave(m, 'tiles'), vars = lerArraySave(m, 'vars');
    var surface = new Int16Array(Mundo.W), x, y;
    for (x = 0; x < Mundo.W; x++) { surface[x] = 110; for (y = 0; y < Mundo.H; y++) if (tiles[y * Mundo.W + x] !== 0) { surface[x] = y; break; } }
    var world = { nome: m.nome, seed: m.seed, tiles: tiles, vars: vars, fundo: lerArraySave(m, 'fundo'), surface: surface, spawn: m.spawn, casasNPC: m.casasNPC || [], platY: m.platY || 110, criadoEm: m.criadoEm };
    prepararEstado(world);
    var jSalvo = m.jogador || {};
    Object.keys(jSalvo).forEach(function (k) { G.jogador[k] = jSalvo[k]; });
    G.jogador.golpes = []; G.jogador.giro = null; G.jogador.gancho = null;
    G.stats = Object.assign(Combate.statsZeradas(), m.stats || {});
    G.segredos = m.segredos || {}; G.chefesDerrotados = m.chefesDerrotados || {};
    if (m.explorado || m.exploradoRLE) { G.explorado = lerArraySave(m, 'explorado'); G.exploradosCount = 0; for (var i = 0; i < G.explorado.length; i++) if (G.explorado[i]) G.exploradosCount++; }
    if (m.tempoDia != null) G.tempoDia = m.tempoDia;
    G.worldId = m.id; G.worldMeta = { nome: m.nome, seed: m.seed, criadoEm: m.criadoEm };
    G.perfil = Save.perfil(); G.perfil.ultimoMundo = m.id; Save.salvarPerfil(G.perfil);
    Combate.recalcularContadores();
  }
  Jogo.carregarMundoSalvo = function (id) {
    if (!id) { UI.mostrarTela('tela-mundos'); return; }
    Save.carregarMundo(id).then(function (m) {
      if (!m) { UI.toast('Não achei esse mundo salvo.'); UI.mostrarTela('tela-mundos'); return; }
      aplicarSave(m); entrarNoJogo();
      UI.toast('De volta a "' + m.nome + '". Chefes: ' + Object.keys(G.chefesDerrotados).length + '/94.', '#7ed957');
    });
  };
  Jogo.exportarMundo = function (id) {
    function baixar(m) {
      U.baixarArquivo('chicotes-do-destino_' + String(m.nome).replace(/[^\w-]+/g, '_') + '.json', JSON.stringify(m), 'application/json');
      G.perfil = Save.perfil(); G.perfil.statsMundos.exportacoes++; Save.salvarPerfil(G.perfil);
      UI.toast('Mapa exportado! Importe em "Meus Mundos" quando quiser.');
    }
    if (id && id !== G.worldId) Save.carregarMundo(id).then(function (m) { if (m) baixar(m); });
    else if (G.world) Jogo.salvarAgora(true).then(function () { baixar(montarSave()); });
    else UI.toast('Abra um mundo para exportar.');
  };
  Jogo.importarMundo = function (texto) {
    var m;
    try { m = JSON.parse(texto); } catch (e) { UI.toast('Arquivo inválido: não é um mundo de Chicotes do Destino.'); return; }
    if (!m || (!m.tiles && !m.tilesRLE) || !m.nome) { UI.toast('Arquivo inválido: faltam dados do mundo.'); return; }
    var tilesTeste = lerArraySave(m, 'tiles');
    if (tilesTeste.length !== Mundo.W * Mundo.H) { UI.toast('Arquivo inválido: tamanho do mundo diferente de 1400×480.'); return; }
    m.id = 'mundo_' + Date.now().toString(36); m.modificado = Date.now();
    G.perfil = Save.perfil(); G.perfil.statsMundos.importacoes++; Save.salvarPerfil(G.perfil);
    Save.salvarMundo(m).then(function () { UI.toast('Mundo "' + m.nome + '" importado!'); Jogo.carregarMundoSalvo(m.id); });
  };
  Jogo.voltarAoMenu = function () {
    Jogo.salvarAgora(true).then(function () {
      G.estado = 'menu'; G.chefe = null;
      UI.mostrarTela('tela-menu');
    });
  };

  // --------------------------------------------------------------- ações de item
  Jogo.equipar = function (itemId) {
    var item = D.ITEM_BY_ID[itemId], j = G.jogador; if (!item || !j) return;
    if (item.tipo === 'chicote') {
      j.equipamentos.chicote = itemId; j.barra[0] = itemId; j.selecionado = 0;
      if (item.chicote.numero === 200) G.segredos.apoteoseEquipada = true;
      UI.toast('Chicote equipado: ' + item.nome + (item.chicote.par ? ' (par!)' : ''), item.cor);
    } else if (item.tipo === 'armadura') {
      j.equipamentos.armadura = j.equipamentos.armadura === itemId ? null : itemId;
      UI.toast(j.equipamentos.armadura ? 'Armadura equipada: ' + item.nome : 'Armadura removida.');
    } else if (item.tipo === 'acessorio') {
      var eq = j.equipamentos.acessorios, pos = eq.indexOf(itemId);
      if (pos >= 0) { eq[pos] = null; UI.toast('Acessório removido: ' + item.nome); }
      else {
        var livre = eq.indexOf(null);
        if (livre < 0) { livre = 0; UI.toast('Os 4 espaços estavam cheios: substituí o primeiro.'); }
        eq[livre] = itemId; UI.toast('Acessório equipado no espaço ' + (livre + 1) + ': ' + item.nome);
      }
    } else if (item.tipo === 'picareta') {
      j.barra[1] = itemId; j.selecionado = 1; UI.toast('Picareta pronta no espaço 2: ' + item.nome + ' (poder ' + item.poder + ').');
    }
    Combate.recalcularContadores(); G.uiSuja = true; AudioJogo.clicar();
  };
  var BUFF_POCAO = { 5: 'velocidade', 6: 'dano', 7: 'defesa', 8: 'mineracao', 9: 'luz', 10: 'gancho', 11: 'pulo', 12: 'antiqueda', 13: 'brasa', 15: 'defesa', 17: 'dano', 21: 'luz', 25: 'dano', 26: 'defesa', 30: 'mineracao' };
  Jogo.usarPocao = function (itemId) {
    var item = D.ITEM_BY_ID[itemId], j = G.jogador;
    if (!item || item.tipo !== 'pocao' || !Combate.removerItem(itemId, 1)) return;
    G.stats.pocoesBebidas++;
    var numero = parseInt(itemId.split('_')[1], 10);
    if (numero === 18) { j.x = G.world.spawn.x; j.y = G.world.spawn.y; j.vx = j.vy = 0; UI.toast('De volta à vila!'); }
    if (item.cura) {
      var max = j.vidaMax + Combate.atributos().vidaExtra;
      j.vida = Math.min(max, j.vida + item.cura);
      Combate.textoDano(j.x + j.w / 2, j.y - 10, '+' + item.cura + ' ❤', '#7ed957');
    }
    var buff = BUFF_POCAO[numero];
    if (buff && item.duracaoBuff) j.buffs[buff] = item.duracaoBuff;
    AudioJogo.pegar(); G.uiSuja = true;
  };
  Jogo.usarSelo = function (itemId) {
    var item = D.ITEM_BY_ID[itemId];
    if (!item || item.tipo !== 'invocador') return;
    if (G.chefe) { UI.toast('Já há um chefe em combate!'); return; }
    if (Combate.qtdItem(itemId) <= 0) { UI.toast('Você não tem esse selo. Crie (tecla C → Invocação) ou compre com a Rita.'); return; }
    if (Combate.invocarChefe(item.chefeIndice)) Combate.removerItem(itemId, 1);
    G.uiSuja = true;
  };
  Jogo.criarReceita = function (rec) {
    if (!UI.podeCriar(rec)) { UI.toast('Faltam ingredientes ou a estação (' + rec.estacao + ').'); return; }
    rec.ingredientes.forEach(function (g) { Combate.removerItem(g.item, g.qtd); });
    Combate.darItem(rec.resultado, rec.qtd);
    G.stats.itensCriados++;
    if (rec.categoria === 'Fundição') G.stats.barrasFundidas++;
    AudioJogo.criar();
    UI.toast('Criado: ' + D.ITEM_BY_ID[rec.resultado].nome + (rec.qtd > 1 ? ' ×' + rec.qtd : '') + '!', '#7ed957');
  };
  Jogo.venderMateriais = function () {
    var j = G.jogador, ganho = 0, vendidos = 0;
    Object.keys(j.inventario).forEach(function (id) {
      var it = D.ITEM_BY_ID[id];
      if (!it || it.tipo !== 'material') return;
      var excedente = Math.max(0, j.inventario[id] - 5);
      if (excedente > 0) { ganho += excedente * 3; vendidos += excedente; j.inventario[id] -= excedente; }
    });
    if (vendidos > 0) { j.moedas += ganho; G.stats.moedasGanhas += ganho; G.uiSuja = true; UI.toast('Vendi ' + vendidos + ' materiais excedentes por 🪙 ' + ganho + '.'); AudioJogo.moeda(); }
    else UI.toast('Sem materiais excedentes (guardei 5 de cada para as receitas).');
  };
  Jogo.atualizarToque = function () {
    var cfg = Save.perfil().config;
    var mostrar = cfg.toque !== false && (('ontouchstart' in window) || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches));
    el('controles-toque').classList.toggle('ativo', !!mostrar && G.estado === 'jogando');
  };
  Jogo.mundoParaTela = function (wx, wy) {
    var rect = canvas.getBoundingClientRect(), tela = el('tela-jogo').getBoundingClientRect();
    return { x: (rect.left - tela.left) + (wx - G.camera.x) / G.viewW * rect.width, y: (rect.top - tela.top) + (wy - G.camera.y) / G.viewH * rect.height };
  };

  // --------------------------------------------------------------- entrada
  function digitando() { var a = document.activeElement; return a && ['INPUT', 'SELECT', 'TEXTAREA'].indexOf(a.tagName) >= 0; }
  function miraMundo() {
    if (G.miraGamepad) { var c = centroJogador(); return { x: c.x + Math.cos(G.miraAng) * 70, y: c.y + Math.sin(G.miraAng) * 70, angulo: G.miraAng }; }
    var wx = G.camera.x + G.mouse.x, wy = G.camera.y + G.mouse.y, c2 = centroJogador();
    return { x: wx, y: wy, angulo: Math.atan2(wy - (c2.y - 3), wx - c2.x) };
  }
  function tipoSelecionado() {
    var j = G.jogador, id = j.barra[j.selecionado];
    return id && D.ITEM_BY_ID[id] ? D.ITEM_BY_ID[id] : null;
  }
  function acaoPrimariaPressionada() {
    if (G.estado !== 'jogando' || UI.painel || G.morte) return;
    AudioJogo.init();
    var item = tipoSelecionado(), j = G.jogador;
    if (item && item.tipo === 'pocao') { Jogo.usarPocao(item.id); return; }
    if (item && item.tipo === 'invocador') { Jogo.usarSelo(item.id); return; }
    if (item && item.tipo === 'picareta') { G.mouse.esquerdo = true; return; }
    if (item && item.tipo === 'bloco') { G.mouse.esquerdo = true; return; }
    // chicote (selecionado ou equipado): começa a carregar; soltar rápido = golpe, segurar 0,45s = giro
    if (Combate.chicoteEquipado()) G.carregando = { t: 0 };
  }
  function acaoPrimariaSolta() {
    if (G.carregando) {
      var ang = miraMundo().angulo;
      if (G.carregando.t >= 0.45) Combate.iniciarGiro();
      else Combate.iniciarGolpe(ang, false);
      G.carregando = null;
    }
    G.mouse.esquerdo = false; G.mineracao = null;
  }
  function interagir() {
    var npc = Combate.npcPerto(); if (!npc) return;
    G.stats.conversasNPC++;
    var fala = npc.falas[npc.falaIdx % npc.falas.length]; npc.falaIdx++;
    G.balao = { nome: npc.nome, texto: fala, x: npc.x, y: npc.y, ate: G.tempo + 5 };
    AudioJogo.clicar();
    if (npc.papel === 'loja') UI.abrirPainel('loja');
    else if (npc.papel === 'ferreira' && npc.falaIdx > 1) UI.abrirPainel('criacao');
  }
  function ligarEntrada() {
    window.addEventListener('keydown', function (e) {
      if (digitando()) return;
      G.teclas[e.code] = true;
      if (G.estado !== 'jogando') { if (e.code === 'Escape') UI.fecharPaineis(); return; }
      var j = G.jogador;
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') { e.preventDefault(); Jogo.salvarAgora(); return; }
      if (e.code === 'Escape') { if (UI.painel) UI.fecharPaineis(); else UI.abrirPainel('pausa'); }
      else if (e.code === 'KeyP') UI.abrirPainel('pausa');
      else if (e.code === 'KeyI' || e.code === 'Tab') { e.preventDefault(); UI.abrirPainel('inventario'); }
      else if (e.code === 'KeyC') UI.abrirPainel('criacao');
      else if (e.code === 'KeyV') UI.abrirPainel('arsenal');
      else if (e.code === 'KeyB') UI.abrirPainel('chefes');
      else if (e.code === 'KeyM') UI.abrirPainel('mapa');
      else if (e.code === 'KeyH') UI.abrirPainel('controles');
      else if (e.code === 'KeyE') { if (!UI.painel) interagir(); }
      else if (e.code === 'KeyF' || e.code === 'KeyR') { if (!UI.painel) Combate.dispararGancho(miraMundo().angulo); }
      else if (e.code === 'KeyQ') { j.selecionado = j.selecionado === 0 ? 1 : 0; G.uiSuja = true; }
      else if (/^Digit[0-9]$/.test(e.code)) { j.selecionado = (parseInt(e.code.slice(5), 10) + 9) % 10; G.uiSuja = true; }
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.code) >= 0) e.preventDefault();
    });
    window.addEventListener('keyup', function (e) { G.teclas[e.code] = false; if (e.code === 'Space' && G.estado === 'jogando' && !digitando()) e.preventDefault(); });
    document.addEventListener('click', function (e) { if (e.target && e.target.tagName === 'BUTTON') e.target.blur(); });
    canvas.addEventListener('mousedown', function (e) {
      AudioJogo.init();
      if (e.button === 0) acaoPrimariaPressionada();
      if (e.button === 2 && G.estado === 'jogando' && !UI.painel) Combate.dispararGancho(miraMundo().angulo);
    });
    window.addEventListener('mouseup', function (e) { if (e.button === 0) acaoPrimariaSolta(); });
    canvas.addEventListener('mousemove', function (e) {
      var r = canvas.getBoundingClientRect();
      G.mouse.x = (e.clientX - r.left) / r.width * G.viewW;
      G.mouse.y = (e.clientY - r.top) / r.height * G.viewH;
      G.miraGamepad = false;
    });
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    canvas.addEventListener('wheel', function (e) {
      if (G.estado !== 'jogando' || !G.jogador) return;
      e.preventDefault();
      G.jogador.selecionado = (G.jogador.selecionado + (e.deltaY > 0 ? 1 : 9)) % 10; G.uiSuja = true;
    }, { passive: false });
    // toque: mira por arrasto no canvas
    canvas.addEventListener('touchstart', function (e) { tocarCanvas(e); }, { passive: false });
    canvas.addEventListener('touchmove', function (e) { tocarCanvas(e); }, { passive: false });
    function tocarCanvas(e) {
      e.preventDefault(); AudioJogo.init();
      var t = e.touches[0]; if (!t) return;
      var r = canvas.getBoundingClientRect();
      G.mouse.x = (t.clientX - r.left) / r.width * G.viewW;
      G.mouse.y = (t.clientY - r.top) / r.height * G.viewH;
      G.miraGamepad = false; Jogo.atualizarToque();
    }
    document.querySelectorAll('[data-toque]').forEach(function (btn) {
      var acao = btn.getAttribute('data-toque');
      function press(ev) {
        ev.preventDefault(); AudioJogo.init();
        if (acao === 'esq') G.toque.esq = true; else if (acao === 'dir') G.toque.dir = true;
        else if (acao === 'pulo') G.toque.pulo = true;
        else if (acao === 'acao') { G.toque.acao = true; acaoPrimariaPressionada(); }
        else if (acao === 'gancho') Combate.dispararGancho(miraMundo().angulo);
        else if (acao === 'usar') interagir();
        else if (acao === 'inv') UI.abrirPainel('inventario');
        else if (acao === 'pausa') UI.abrirPainel('pausa');
      }
      function release(ev) {
        ev.preventDefault();
        if (acao === 'esq') G.toque.esq = false; else if (acao === 'dir') G.toque.dir = false;
        else if (acao === 'pulo') G.toque.pulo = false;
        else if (acao === 'acao') { G.toque.acao = false; acaoPrimariaSolta(); }
      }
      btn.addEventListener('touchstart', press, { passive: false });
      btn.addEventListener('touchend', release, { passive: false });
      btn.addEventListener('touchcancel', release, { passive: false });
    });
    window.addEventListener('resize', Jogo.atualizarToque);
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
  }
  function lerGamepad(dt) {
    if (!navigator.getGamepads || G.estado !== 'jogando') return;
    var gps = navigator.getGamepads(), gp = null, i;
    for (i = 0; i < gps.length; i++) if (gps[i] && gps[i].connected) { gp = gps[i]; break; }
    if (!gp) return;
    var j = G.jogador;
    var eixoX = gp.axes[0] || 0, miraX = gp.axes[2] || 0, miraY = gp.axes[3] || 0;
    if (Math.abs(eixoX) > 0.25) { G.teclas.GamepadEsq = eixoX < 0; G.teclas.GamepadDir = eixoX > 0; } else { G.teclas.GamepadEsq = false; G.teclas.GamepadDir = false; }
    if (Math.abs(gp.axes[2]) > 0.35 || Math.abs(gp.axes[3]) > 0.35) { G.miraAng = Math.atan2(miraY, miraX); G.miraGamepad = true; }
    function botao(idx) { return gp.buttons[idx] && gp.buttons[idx].pressed; }
    function borda(idx) { var agora = botao(idx), antes = !!G.gamepadBotoes[idx]; G.gamepadBotoes[idx] = agora; return agora && !antes; }
    function bordaSolta(idx) { var agora = botao(idx), antes = !!G.gamepadBotoes['s' + idx]; G.gamepadBotoes['s' + idx] = agora; return !agora && antes; }
    G.teclas.GamepadPulo = botao(0);
    if (borda(2) || borda(7)) acaoPrimariaPressionada();
    if (bordaSolta(2) || bordaSolta(7)) acaoPrimariaSolta();
    if (borda(1)) Combate.dispararGancho(miraMundo().angulo);
    if (borda(3)) interagir();
    if (borda(9)) { if (UI.painel) UI.fecharPaineis(); else UI.abrirPainel('pausa'); }
    if (borda(4)) { j.selecionado = (j.selecionado + 9) % 10; G.uiSuja = true; }
    if (borda(5)) { j.selecionado = (j.selecionado + 1) % 10; G.uiSuja = true; }
  }

  // --------------------------------------------------------------- mineração e construção
  function poderNecessario(def) {
    if (def.familiaMinerio != null) { var f = def.familiaMinerio; return f <= 1 ? 10 : f <= 3 ? 11 : f <= 5 ? 12 : f <= 7 ? 13 : 14; }
    return 10;
  }
  var avisoPicaretaEm = 0;
  function atualizarMineracao(dt) {
    var item = tipoSelecionado();
    if (!item || item.tipo !== 'picareta' || !G.mouse.esquerdo || UI.painel) { G.mineracao = null; return; }
    var mira = miraMundo(), tile = Mundo.tileEmPx(mira.x, mira.y), j = G.jogador;
    var c = centroJogador();
    if (U.dist(c.x, c.y, tile.x * TILE + 8, tile.y * TILE + 8) > 5.2 * TILE) { G.mineracao = null; return; }
    var def = Mundo.defTile(G.world, tile.x, tile.y);
    if (def.id === Mundo.T.AR || def.liquido) { G.mineracao = null; return; }
    if (def.inquebravel) { if (G.tempo > avisoPicaretaEm) { avisoPicaretaEm = G.tempo + 2; UI.toast('Obisidiana negra: o fundo do mundo não quebra.'); } return; }
    if (item.poder < poderNecessario(def)) {
      if (G.tempo > avisoPicaretaEm) { avisoPicaretaEm = G.tempo + 2; UI.toast('Picareta fraca para ' + def.nome + ': precisa de poder ' + poderNecessario(def) + ' (a sua tem ' + item.poder + '). Forje outra na Forja Celeste!'); }
      return;
    }
    if (!G.mineracao || G.mineracao.tx !== tile.x || G.mineracao.ty !== tile.y) G.mineracao = { tx: tile.x, ty: tile.y, progresso: 0, somCd: 0 };
    var necessario = Math.max(0.12, def.dureza * 0.16 - (item.poder - 10) * 0.05) / Combate.atributos().mineracaoMult;
    G.mineracao.progresso += dt / necessario; G.mineracao.somCd -= dt;
    if (G.mineracao.somCd <= 0) { G.mineracao.somCd = 0.16; AudioJogo.minerar(); }
    if (G.mineracao.progresso >= 1) {
      var indice = tile.y * Mundo.W + tile.x;
      G.world.tiles[indice] = tile.y > 395 && Math.random() < 0.05 ? Mundo.T.LAVA : Mundo.T.AR;
      G.stats.blocosMinerados++;
      if (def.familiaMinerio != null) G.stats.mineriosColetados++;
      if (def.drop) {
        if (def.id === Mundo.T.FOLHAS && Math.random() > 0.3) { /* folha nem sempre cai */ }
        else Combate.largarDrop(tile.x * TILE + 2, tile.y * TILE, def.drop, 1, 0);
      }
      Combate.faisca(tile.x * TILE + 8, tile.y * TILE + 8, def.cor, 7, 80);
      G.mineracao = null; G.uiSuja = true;
    }
  }
  function atualizarConstrucao(dt) {
    G.colocarCd -= dt;
    var item = tipoSelecionado(), j = G.jogador;
    if (!item || item.tipo !== 'bloco' || !G.mouse.esquerdo || UI.painel || G.colocarCd > 0) return;
    if (Combate.qtdItem(item.id) <= 0) return;
    var mira = miraMundo(), tile = Mundo.tileEmPx(mira.x, mira.y), c = centroJogador();
    if (U.dist(c.x, c.y, tile.x * TILE + 8, tile.y * TILE + 8) > 6 * TILE) return;
    var atual = G.world.tiles[tile.y * Mundo.W + tile.x];
    if (atual !== Mundo.T.AR && atual !== Mundo.T.AGUA && atual !== Mundo.T.FOLHAS && atual !== Mundo.T.TOCHA) return;
    // precisa de apoio vizinho
    var apoio = Mundo.solidoEm(G.world, tile.x + 1, tile.y) || Mundo.solidoEm(G.world, tile.x - 1, tile.y) || Mundo.solidoEm(G.world, tile.x, tile.y + 1) || Mundo.solidoEm(G.world, tile.x, tile.y - 1) || G.world.tiles[(tile.y - 1) * Mundo.W + tile.x] === Mundo.T.TOCHA;
    if (!apoio) return;
    // não construir dentro do jogador
    var bx = tile.x * TILE, by = tile.y * TILE;
    if (bx < j.x + j.w && bx + TILE > j.x && by < j.y + j.h && by + TILE > j.y) {
      var convTeste = Mundo.blocoParaTile(item.blocoIndice);
      if (convTeste.tile !== Mundo.T.TOCHA) return;
    }
    var conv = Mundo.blocoParaTile(item.blocoIndice);
    G.world.tiles[tile.y * Mundo.W + tile.x] = conv.tile; G.world.vars[tile.y * Mundo.W + tile.x] = conv.v;
    Combate.removerItem(item.id, 1);
    G.stats.blocosColocados++; G.colocarCd = 0.13;
    if (!j.ultimaPosBloco || U.dist(j.x, j.y, j.ultimaPosBloco.x, j.ultimaPosBloco.y) > 16) { j.blocosSeguidos = 0; j.ultimaPosBloco = { x: j.x, y: j.y }; }
    j.blocosSeguidos++; if (j.blocosSeguidos >= 50) G.segredos.casaSimples = true;
  }

  // --------------------------------------------------------------- atualização do jogador
  function emLiquido(e, tipo) {
    var tx = Math.floor((e.x + e.w / 2) / TILE), ty = Math.floor((e.y + e.h * 0.6) / TILE);
    var id = (tx >= 0 && ty >= 0 && tx < Mundo.W && ty < Mundo.H) ? G.world.tiles[ty * Mundo.W + tx] : 0;
    return id === tipo;
  }
  function colideNaPosicao(x, y) {
    var j = G.jogador, tx, ty;
    for (ty = Math.floor(y / TILE); ty <= Math.floor((y + j.h - 1) / TILE); ty++)
      for (tx = Math.floor(x / TILE); tx <= Math.floor((x + j.w - 1) / TILE); tx++)
        if (Mundo.solidoEm(G.world, tx, ty)) return true;
    return false;
  }
  function atualizarJogador(dt) {
    var j = G.jogador, a = Combate.atributos();
    if (G.morte) return;
    var esq = G.teclas.KeyA || G.teclas.ArrowLeft || G.toque.esq || G.teclas.GamepadEsq;
    var dir = G.teclas.KeyD || G.teclas.ArrowRight || G.toque.dir || G.teclas.GamepadDir;
    var pulo = G.teclas.Space || G.teclas.KeyW || G.teclas.ArrowUp || G.toque.pulo || G.teclas.GamepadPulo;
    var velocidade = 172 * a.velocidadeMult;
    var naAgua = emLiquido(j, Mundo.T.AGUA), gravidade = naAgua ? 300 : 1000;
    var alvoVx = (dir ? velocidade : 0) - (esq ? velocidade : 0);
    if (naAgua) alvoVx *= 0.65;
    j.vx = U.lerp(j.vx, alvoVx, j.noChao ? 0.3 : 0.1);
    if (dir && !esq) j.direcao = 1; if (esq && !dir) j.direcao = -1;
    if (!UI.painel) { var mira = miraMundo(); j.direcao = mira.x >= j.x + j.w / 2 ? 1 : -1; G.miraAng = mira.angulo; }
    var estavaNoChao = j.noChao, vyAntes = j.vy;
    if (!j.gancho || j.gancho.estado !== 'preso') { j.vy += gravidade * dt; if (j.vy > (naAgua ? 180 : 740)) j.vy = naAgua ? 180 : 740; }
    if (pulo && j.gancho) Combate.soltarGancho();
    else if (pulo && (j.noChao || naAgua)) { j.vy = naAgua ? -260 : -395 * (j.buffs.pulo > 0 ? 1.25 : 1); AudioJogo.pular(); }
    Mundo.mover(G.world, j, dt);
    // degrau: sobe 1 bloco andando, sem precisar pular em todo o relevo
    if ((esq || dir) && j.bateuParede && j.noChao && !colideNaPosicao(j.x, j.y - TILE)) j.y -= TILE;
    // queda
    if (!j.noChao && !G.queda) G.queda = { y: j.y };
    if (j.noChao && !estavaNoChao && G.queda) {
      var caiuBlocos = (j.y - G.queda.y) / TILE;
      if (caiuBlocos > 80 && j.vida > 0) G.segredos.queda80 = true;
      if (caiuBlocos > 16 && !(j.buffs.antiqueda > 0) && !naAgua) Combate.danoJogador(Math.round((caiuBlocos - 16) * 5), 'queda');
      G.queda = null;
    }
    if (j.noChao) G.queda = null;
    G.stats.blocosAndados += Math.abs(j.vx) * dt / TILE;
    // lava / profundidade / bioma
    if (emLiquido(j, Mundo.T.LAVA) && !(j.buffs.brasa > 0)) Combate.danoJogador(26, 'lava');
    var tx = U.clamp(Math.floor(j.x / TILE), 0, Mundo.W - 1), ty = Math.floor(j.y / TILE);
    var prof = Math.max(0, ty - (G.world.surface[tx] || 110));
    G.stats.profundidade = Math.max(G.stats.profundidade, prof);
    if (ty > Mundo.H - 9) G.segredos.fundoDoMundo = true;
    var biomeNome = Mundo.biomaDe(tx).nome;
    if (!G.biomasSet[biomeNome]) { G.biomasSet[biomeNome] = true; G.stats.biomasVisitados = Object.keys(G.biomasSet).length; }
    if (G.noite && prof > 50) { G.noiteSubTimer += dt; if (G.noiteSubTimer > 60) G.segredos.noiteNoSubsolo = true; } else G.noiteSubTimer = 0;
    // buffs e regeneração leve
    Object.keys(j.buffs).forEach(function (k) { j.buffs[k] -= dt; if (j.buffs[k] <= 0) { delete j.buffs[k]; G.uiSuja = true; } });
    var maxVida = j.vidaMax + a.vidaExtra;
    var arm = j.equipamentos.armadura ? D.ITEM_BY_ID[j.equipamentos.armadura] : null;
    var regen = arm && (arm.passiva || '').indexOf('Regenera') >= 0 ? 2 : 0.35;
    if (!G.chefe) j.vida = Math.min(maxVida, j.vida + regen * dt);
    if (j.ataqueCd > 0) j.ataqueCd -= dt;
    // explorar (revela arredores no mapa)
    revelarMapa();
    // morte
    if (G.morte && G.tempo >= G.morte.ate) { /* trata no loop */ }
  }
  function revelarMapa() {
    var j = G.jogador, cx = Math.floor(j.x / TILE), cy = Math.floor(j.y / TILE), r = 16, x, y, indice;
    for (y = cy - r; y <= cy + r; y++) for (x = cx - r; x <= cx + r; x++) {
      if (x < 0 || y < 0 || x >= Mundo.W || y >= Mundo.H) continue;
      indice = y * Mundo.W + x;
      if (!G.explorado[indice]) { G.explorado[indice] = 1; G.exploradosCount++; }
    }
    G.stats.mapaRevelado = Math.round(G.exploradosCount / G.explorado.length * 100);
  }

  // --------------------------------------------------------------- loop principal
  function loop(ts) {
    requestAnimationFrame(loop);
    if (!ultimoTimestamp) ultimoTimestamp = ts;
    var dtBruto = (ts - ultimoTimestamp) / 1000;
    var dt = isFinite(dtBruto) && dtBruto > 0 ? Math.min(0.033, dtBruto) : 0.016;
    ultimoTimestamp = ts;
    if (G.estado !== 'jogando' || !G.world) return;

    lerGamepad(dt);
    var congelado = G.pausado || !!UI.painel;
    if (!congelado) {
      G.tempo += dt;
      G.stats.minutosJogados += dt / 60;
      G.tempoDia = (G.tempoDia + dt / 300) % 1; // dia completo: 5 min
      G.noite = G.tempoDia < 0.20 || G.tempoDia > 0.82;
      if (G.morte) {
        if (G.tempo >= G.morte.ate) {
          var j0 = G.jogador; j0.x = G.world.spawn.x; j0.y = G.world.spawn.y; j0.vx = j0.vy = 0;
          j0.vida = j0.vidaMax + Combate.atributos().vidaExtra;
          Combate.soltarGancho(); G.chefe = null; G.inimigos = []; G.projeteis = []; G.lasers = []; G.rastreadores = [];
          G.morte = null; UI.toast('Você acordou na vila, inteiro (o destino foi gentil).');
          Jogo.salvarAgora(true); G.uiSuja = true;
        }
      } else {
        if (G.carregando) G.carregando.t += dt;
        atualizarJogador(dt);
        atualizarMineracao(dt);
        atualizarConstrucao(dt);
        Combate.atualizarGolpes(dt);
        Combate.atualizarGiro(dt);
        Combate.atualizarGancho(dt);
        Combate.gerarInimigos(dt);
        Combate.atualizarInimigos(dt);
        Combate.atualizarChefe(dt);
        Combate.atualizarProjeteis(dt);
        Combate.atualizarDrops(dt);
        Combate.atualizarNPCs(dt);
      }
      Combate.atualizarEfeitos(dt);
      G.avaliarTimer -= dt;
      if (G.avaliarTimer <= 0) { G.avaliarTimer = 1; Combate.recalcularContadores(); Combate.avaliarConquistas(); }
      G.autosaveTimer -= dt;
      if (G.autosaveTimer <= 0) { G.autosaveTimer = 30; Jogo.salvarAgora(true); }
    }
    desenhar();
    G.hudTimer -= dt;
    if (G.uiSuja || G.hudTimer <= 0) { G.hudTimer = 0.25; UI.atualizarHUD(); }
    UI.atualizarBalao();
  }

  // --------------------------------------------------------------- desenho
  function corEscurecer(hex, fator) {
    var n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return 'rgb(' + Math.round(r * fator) + ',' + Math.round(g * fator) + ',' + Math.round(b * fator) + ')';
  }
  function hashTile(x, y) { var h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return (h ^ (h >>> 16)) & 3; }
  function solAltura() { return Math.sin((G.tempoDia - 0.2) / 0.62 * Math.PI); } // >0 = dia
  function desenhar() {
    var j = G.jogador, W = G.viewW, H = G.viewH;
    // câmera
    var alvoX = U.clamp(j.x + j.w / 2 - W / 2, 0, Mundo.W * TILE - W);
    var alvoY = U.clamp(j.y + j.h / 2 - H / 2, 0, Mundo.H * TILE - H);
    G.camera.x = U.lerp(G.camera.x, alvoX, 0.14); G.camera.y = U.lerp(G.camera.y, alvoY, 0.14);
    var tr = G.camera.tremor || 0;
    var ox = tr ? (Math.random() - 0.5) * tr * 2 : 0, oy = tr ? (Math.random() - 0.5) * tr * 2 : 0;
    if (tr) G.camera.tremor = Math.max(0, tr - 0.55);
    var camX = Math.round(G.camera.x + ox), camY = Math.round(G.camera.y + oy);
    G.camera.renderX = camX; G.camera.renderY = camY;

    var alt = solAltura(), noiteF = U.clamp(1 - Math.max(0, alt) * 1.6, 0, 1);
    var grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, noiteF > 0.6 ? '#0b1026' : '#79b5e0');
    grad.addColorStop(1, noiteF > 0.6 ? '#1c2342' : '#cfe9f7');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    // estrelas, sol e lua
    if (noiteF > 0.4) {
      ctx.fillStyle = 'rgba(255,255,255,' + (noiteF * 0.9) + ')';
      for (var e = 0; e < 70; e++) { var sx = ((e * 137) % 1400) / 1400 * W, sy = ((e * 89) % 260); ctx.fillRect((sx - camX * 0.05) % W < 0 ? (sx - camX * 0.05) % W + W : (sx - camX * 0.05) % W, sy, 2, 2); }
      ctx.fillStyle = '#e8ecf5'; ctx.beginPath(); ctx.arc(W * (0.15 + 0.7 * ((G.tempoDia + 0.8) % 1)), 70, 17, 0, 7); ctx.fill();
    } else {
      var solX = W * U.clamp((G.tempoDia - 0.2) / 0.62, 0, 1), solY = 130 - Math.max(0, alt) * 90;
      ctx.fillStyle = '#fff3a3'; ctx.beginPath(); ctx.arc(solX, solY, 20, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,243,163,.35)'; ctx.beginPath(); ctx.arc(solX, solY, 30, 0, 7); ctx.fill();
    }
    // montanhas em paralaxe
    desenharMontanhas(camX * 0.25, 150, 90, noiteF > 0.6 ? '#232c4d' : '#8fb8d8');
    desenharMontanhas(camX * 0.5 + 300, 215, 70, noiteF > 0.6 ? '#1a2138' : '#6fa183');

    // tiles visíveis
    var tx0 = Math.max(0, Math.floor(camX / TILE)), tx1 = Math.min(Mundo.W - 1, Math.floor((camX + W) / TILE));
    var ty0 = Math.max(0, Math.floor(camY / TILE)), ty1 = Math.min(Mundo.H - 1, Math.floor((camY + H) / TILE));
    var tochas = [], fundoArr = G.world.fundo;
    for (var ty = ty0; ty <= ty1; ty++) for (var tx = tx0; tx <= tx1; tx++) {
      var indiceT = ty * Mundo.W + tx;
      var id = G.world.tiles[indiceT];
      var px = tx * TILE - camX, py = ty * TILE - camY;
      if (id === 0) {
        if (fundoArr && fundoArr[indiceT] === 1) { // parede interna de madeira
          ctx.fillStyle = '#8a6539'; ctx.fillRect(px, py, TILE, TILE);
          ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(px, py + 7, TILE, 1);
        } else if (ty > (G.world.surface[tx] || 110)) { // fundo da caverna (não o céu!)
          var profT = ty - (G.world.surface[tx] || 110);
          ctx.fillStyle = profT < 14 ? '#463625' : ty > 350 ? '#16121f' : ty > 220 ? '#20242e' : '#2a3138';
          ctx.fillRect(px, py, TILE, TILE);
          if (hashTile(tx, ty) === 0) { ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fillRect(px + 4, py + 6, 3, 2); }
        }
        continue;
      }
      var d = Mundo.defTile(G.world, tx, ty);
      if (d.liquido) {
        ctx.fillStyle = id === Mundo.T.LAVA ? '#e86a1e' : 'rgba(47,111,208,.75)';
        ctx.fillRect(px, py + (Math.sin(G.tempo * 2 + tx) > 0 ? 2 : 3), TILE, TILE);
        continue;
      }
      if (id === Mundo.T.TOCHA) {
        ctx.fillStyle = '#6e4a26'; ctx.fillRect(px + 7, py + 6, 2, 10);
        ctx.fillStyle = Math.sin(G.tempo * 9 + tx) > 0 ? '#ffcf6e' : '#ffb84d'; ctx.fillRect(px + 5, py + 1, 6, 6);
        tochas.push({ x: px + 8, y: py + 4, r: 95 }); continue;
      }
      ctx.fillStyle = d.cor; ctx.fillRect(px, py, TILE, TILE);
      var hv = hashTile(tx, ty);
      if (hv) { ctx.fillStyle = 'rgba(0,0,0,' + (hv * 0.05) + ')'; ctx.fillRect(px, py, TILE, TILE); }
      if (d.familiaMinerio != null) {
        ctx.fillStyle = GAME_DATA.CORES_MINERIO[d.familiaMinerio];
        ctx.fillRect(px + 3, py + 4, 4, 3); ctx.fillRect(px + 9, py + 9, 4, 3); ctx.fillRect(px + 6, py + 12, 3, 2);
      }
      if (!Mundo.solidoEm(G.world, tx, ty - 1)) { ctx.fillStyle = d.topo || 'rgba(255,255,255,.18)'; ctx.fillRect(px, py, TILE, 3); }
      if (id === Mundo.T.TIJOLO || id === Mundo.T.TABUA) { ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(px, py + 7, TILE, 1); ctx.fillRect(px + (ty % 2 ? 7 : 3), py, 1, TILE); }
      if (id === Mundo.T.TRONCO) { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(px + 4, py, 1, TILE); ctx.fillRect(px + 10, py, 1, TILE); }
      if (id === Mundo.T.VIDRO) { ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(px + 2, py + 2, 4, 2); }
      if (d.luz) tochas.push({ x: px + 8, y: py + 8, r: d.luz });
    }
    // alvo da picareta / construção
    var itemSel = tipoSelecionado();
    if (itemSel && (itemSel.tipo === 'picareta' || itemSel.tipo === 'bloco') && !UI.painel) {
      var mira = miraMundo(), mt = Mundo.tileEmPx(mira.x, mira.y);
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2;
      ctx.strokeRect(mt.x * TILE - camX + 1, mt.y * TILE - camY + 1, TILE - 2, TILE - 2);
      if (itemSel.tipo === 'picareta') {
        var defAlvo = Mundo.defTile(G.world, mt.x, mt.y);
        if (defAlvo.id !== 0) {
          ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.font = '11px monospace'; ctx.textAlign = 'center';
          ctx.fillText(defAlvo.nome, mt.x * TILE - camX + 8, mt.y * TILE - camY - 5);
        }
      }
    }
    if (G.mineracao) {
      var mp = G.mineracao, pct = mp.progresso;
      ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.lineWidth = 1.5;
      var bx = mp.tx * TILE - camX, by = mp.ty * TILE - camY;
      ctx.beginPath(); ctx.moveTo(bx + 3, by + 2); ctx.lineTo(bx + 3 + 10 * pct, by + 14 * pct); ctx.moveTo(bx + 13, by + 3); ctx.lineTo(bx + 13 - 9 * pct, by + 3 + 11 * pct); ctx.stroke();
    }

    desenharDrops(camX, camY);
    G.npcs.forEach(function (n) { desenharPersonagem(n, camX, camY, n.cor, false); desenharNome(n.nome, n.x + n.w / 2 - camX, n.y - camY - 6); });
    G.inimigos.forEach(function (en) { desenharInimigo(en, camX, camY); });
    if (G.chefe) desenharChefe(G.chefe, camX, camY);
    desenharJogador(camX, camY);
    desenharChicotes(camX, camY);
    desenharProjeteis(camX, camY);
    desenharEfeitos(camX, camY);

    // escuridão (noite + subsolo) com focos de luz
    var tileJog = Math.floor(j.y / TILE), surf = G.world.surface[U.clamp(Math.floor(j.x / TILE), 0, Mundo.W - 1)] || 110;
    var profF = U.clamp((tileJog - surf - 6) / 90, 0, 1);
    var escuridao = Math.max(noiteF * 0.45, profF * 0.8);
    if (G.jogador.buffs.luz > 0) escuridao *= 0.55;
    if (escuridao > 0.04) {
      ctxLuz.globalCompositeOperation = 'source-over';
      ctxLuz.clearRect(0, 0, W, H);
      ctxLuz.fillStyle = 'rgba(3,6,20,' + escuridao + ')'; ctxLuz.fillRect(0, 0, W, H);
      ctxLuz.globalCompositeOperation = 'destination-out';
      var luzes = [{ x: j.x + j.w / 2 - camX, y: j.y + j.h / 2 - camY, r: 105 + Combate.atributos().luz }];
      tochas.forEach(function (t) { luzes.push(t); });
      luzes.forEach(function (L2) {
        var g2 = ctxLuz.createRadialGradient(L2.x, L2.y, 4, L2.x, L2.y, L2.r);
        g2.addColorStop(0, 'rgba(0,0,0,.95)'); g2.addColorStop(1, 'rgba(0,0,0,0)');
        ctxLuz.fillStyle = g2; ctxLuz.beginPath(); ctxLuz.arc(L2.x, L2.y, L2.r, 0, 7); ctxLuz.fill();
      });
      ctx.drawImage(canvasLuz, 0, 0);
    }
    // flash vermelho de dano de chefe
    if (G.jogador.piscaAte > G.tempo) { ctx.fillStyle = 'rgba(220,40,40,.22)'; ctx.fillRect(0, 0, W, H); }
    if (G.morte) { ctx.fillStyle = 'rgba(10,0,0,.55)'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.font = 'bold 26px monospace'; ctx.textAlign = 'center'; ctx.fillText('A corda se enrolou...', W / 2, H / 2); }
    // mira
    if (!UI.painel && !G.miraGamepad) {
      ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(G.mouse.x, G.mouse.y, 7, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(G.mouse.x - 10, G.mouse.y); ctx.lineTo(G.mouse.x - 3, G.mouse.y); ctx.moveTo(G.mouse.x + 3, G.mouse.y); ctx.lineTo(G.mouse.x + 10, G.mouse.y); ctx.stroke();
    }
  }
  function desenharMontanhas(off, base, amp, cor) {
    ctx.fillStyle = cor; ctx.beginPath(); ctx.moveTo(0, base + amp + 60);
    for (var x = 0; x <= G.viewW; x += 24) {
      var y = base + Math.sin((x + off) * 0.008) * amp * 0.5 + Math.sin((x + off) * 0.021) * amp * 0.3;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(G.viewW, base + amp + 60); ctx.closePath(); ctx.fill();
  }
  function desenharNome(nome, x, y) {
    ctx.font = '10px monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillText(nome, x + 1, y + 1);
    ctx.fillStyle = '#dfeeff'; ctx.fillText(nome, x, y);
  }
  function desenharPersonagem(p, camX, camY, corRoupa, ehJogador) {
    var x = Math.round(p.x - camX), y = Math.round(p.y - camY), dir = p.direcao || 1;
    var andando = Math.abs(p.vx) > 15, perna = andando ? Math.sin(G.tempo * 13) * 3 : 0;
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x + p.w / 2, y + p.h, 10, 3, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#2b3a55'; // pernas
    ctx.fillRect(x + 2 + perna * 0.5, y + 20, 5, 10); ctx.fillRect(x + 8 - perna * 0.5, y + 20, 5, 10);
    ctx.fillStyle = corRoupa; ctx.fillRect(x + 1, y + 9, p.w - 2, 12); // tronco
    ctx.fillStyle = '#e8b88a'; ctx.fillRect(x + 2, y, p.w - 4, 9); // cabeça
    ctx.fillStyle = ehJogador ? '#5a3a1e' : corRoupa; ctx.fillRect(x + 2, y, p.w - 4, 3); // cabelo/chapéu
    ctx.fillStyle = '#14181f'; ctx.fillRect(x + (dir > 0 ? 9 : 3), y + 4, 2, 2); // olho
    if (ehJogador && p.invencivelAte > G.tempo && Math.floor(G.tempo * 14) % 2 === 0) { ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(x, y, p.w, p.h); }
  }
  function desenharJogador(camX, camY) {
    var j = G.jogador;
    var arm = j.equipamentos.armadura ? D.ITEM_BY_ID[j.equipamentos.armadura] : null;
    desenharPersonagem(j, camX, camY, arm ? arm.cor : '#3d6da8', true);
    var m = Combate.mao();
    var mx = m.x - camX, my = m.y - camY;
    var item = tipoSelecionado();
    // braço apontando para a mira
    ctx.strokeStyle = '#e8b88a'; ctx.lineWidth = 3.5; ctx.beginPath();
    ctx.moveTo(j.x + j.w / 2 - camX, j.y + 13 - camY);
    ctx.lineTo(mx, my); ctx.stroke();
    var w = Combate.chicoteEquipado();
    if ((!item || item.tipo === 'chicote') && w && !j.golpes.length && !j.giro && !j.gancho) {
      // chicote enrolado na mão
      ctx.strokeStyle = w.corTier; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(mx + j.direcao * 4, my + 5, 5.5, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.arc(mx + j.direcao * 4, my + 5, 3, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mx + j.direcao * 8, my + 8); ctx.quadraticCurveTo(mx + j.direcao * 14, my + 14 + Math.sin(G.tempo * 3) * 2, mx + j.direcao * 10, my + 20); ctx.stroke();
    }
    if (item && item.tipo === 'picareta') desenharIcone(ctx, item, mx - 8, my - 10, 18);
    if (item && item.tipo === 'bloco') desenharIcone(ctx, item, mx - 7, my - 7, 14);
    // arco de carga do giro
    if (G.carregando) {
      var p = Math.min(1, G.carregando.t / 0.45);
      ctx.strokeStyle = p >= 1 ? '#ffd166' : '#7fc8f8'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(j.x + j.w / 2 - camX, j.y + j.h / 2 - camY, 22 + p * 6, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); ctx.stroke();
    }
  }
  function desenharInimigo(en, camX, camY) {
    var x = Math.round(en.x - camX), y = Math.round(en.y - camY);
    var cor = en.flash > 0 ? '#ffffff' : en.cor;
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x + en.w / 2, y + en.h, en.w / 2, 3, 0, 0, 7); ctx.fill();
    ctx.fillStyle = cor;
    if (en.tipoMov === 'saltitante') {
      var squash = en.noChao ? 0.82 : 1;
      ctx.beginPath(); ctx.ellipse(x + en.w / 2, y + en.h - (en.h * squash) / 2, en.w / 2, (en.h * squash) / 2, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#12240f'; ctx.fillRect(x + en.w * 0.28, y + en.h * 0.35, 3, 3); ctx.fillRect(x + en.w * 0.62, y + en.h * 0.35, 3, 3);
    } else if (en.tipoMov === 'voador') {
      var asa = Math.sin(G.tempo * 16 + en.uid) * 5;
      ctx.fillRect(x - 7, y + 2 + asa * 0.4, 9, 4); ctx.fillRect(x + en.w - 2, y + 2 - asa * 0.4, 9, 4);
      ctx.beginPath(); ctx.arc(x + en.w / 2, y + en.h / 2, en.w / 2, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + en.w / 2, y + en.h / 2, en.w / 4, 0, 7); ctx.fill();
      ctx.fillStyle = '#c22'; ctx.beginPath(); ctx.arc(x + en.w / 2, y + en.h / 2, en.w / 7, 0, 7); ctx.fill();
    } else {
      ctx.fillRect(x, y + en.h * 0.3, en.w, en.h * 0.7);
      ctx.fillRect(x + en.w * 0.2, y, en.w * 0.6, en.h * 0.35);
      ctx.fillStyle = '#14181f'; ctx.fillRect(x + en.w * 0.3, y + 3, 3, 3); ctx.fillRect(x + en.w * 0.6, y + 3, 3, 3);
    }
    if (en.efeitos.queimando > 0) { ctx.fillStyle = 'rgba(255,140,40,.75)'; ctx.fillRect(x + en.w / 2 - 3, y - 5 + Math.sin(G.tempo * 20) * 2, 6, 7); }
    if (en.vida < en.vidaMax) {
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x, y - 7, en.w, 4);
      ctx.fillStyle = '#e5484d'; ctx.fillRect(x, y - 7, en.w * Math.max(0, en.vida / en.vidaMax), 4);
    }
  }
  function desenharChefe(b, camX, camY) {
    var x = Math.round(b.x - camX), y = Math.round(b.y - camY);
    var cor = b.flash > 0 ? '#ffffff' : b.cor;
    var pulso = 1 + Math.sin(G.tempo * 4) * 0.03;
    ctx.save(); ctx.translate(x + b.w / 2, y + b.h / 2); ctx.scale(pulso, pulso);
    ctx.fillStyle = cor;
    if (b.forma === 'olho' || b.forma === 'apoteose' || b.forma === 'cristal') { ctx.beginPath(); ctx.arc(0, 0, b.w / 2, 0, 7); ctx.fill(); }
    else if (b.forma === 'slime') { ctx.beginPath(); ctx.ellipse(0, 4, b.w / 2, b.h / 2, 0, 0, 7); ctx.fill(); }
    else { ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h); ctx.fillRect(-b.w * 0.3, -b.h * 0.72, b.w * 0.6, b.h * 0.24); }
    // detalhes por fase: faixas de cor cada fase
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    for (var f = 0; f < b.fase; f++) ctx.fillRect(-b.w / 2, -b.h / 2 + f * 6, b.w, 2);
    ctx.fillStyle = '#101820';
    ctx.fillRect(-b.w * 0.25, -b.h * 0.18, b.w * 0.14, b.h * 0.16); ctx.fillRect(b.w * 0.11, -b.h * 0.18, b.w * 0.14, b.h * 0.16);
    ctx.fillStyle = '#ff5252'; ctx.fillRect(-b.w * 0.21, -b.h * 0.13, 4, 4); ctx.fillRect(b.w * 0.15, -b.h * 0.13, 4, 4);
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(-b.w * 0.18, b.h * 0.16, b.w * 0.36, 4);
    // coroa/chifres
    ctx.fillStyle = '#ffd700';
    ctx.beginPath(); ctx.moveTo(-b.w * 0.3, -b.h / 2); ctx.lineTo(-b.w * 0.15, -b.h / 2 - 11); ctx.lineTo(0, -b.h / 2); ctx.lineTo(b.w * 0.15, -b.h / 2 - 11); ctx.lineTo(b.w * 0.3, -b.h / 2); ctx.closePath(); ctx.fill();
    ctx.restore();
    // aura girando
    ctx.strokeStyle = b.cor; ctx.globalAlpha = 0.5; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x + b.w / 2, y + b.h / 2, b.w * 0.7 + Math.sin(G.tempo * 3) * 4, G.tempo * 1.4, G.tempo * 1.4 + 4.2); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  function tracarCorda(pontos, cor, camX, camY, alpha) {
    if (!pontos.length) return;
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    for (var i = 0; i < pontos.length - 1; i++) { // contorno escuro por baixo
      ctx.strokeStyle = 'rgba(16,10,6,.8)';
      ctx.lineWidth = Math.max(2.4, 6 - (i / pontos.length) * 3);
      ctx.beginPath(); ctx.moveTo(pontos[i].x - camX, pontos[i].y - camY); ctx.lineTo(pontos[i + 1].x - camX, pontos[i + 1].y - camY); ctx.stroke();
    }
    for (var i = 0; i < pontos.length - 1; i++) {
      var t = i / (pontos.length - 1);
      ctx.strokeStyle = i % 4 === 3 ? '#241a12' : cor;
      ctx.lineWidth = Math.max(1.2, 4.2 - t * 2.7);
      ctx.beginPath(); ctx.moveTo(pontos[i].x - camX, pontos[i].y - camY); ctx.lineTo(pontos[i + 1].x - camX, pontos[i + 1].y - camY); ctx.stroke();
    }
    var ponta = pontos[pontos.length - 1];
    ctx.fillStyle = '#fff7c9'; ctx.beginPath(); ctx.arc(ponta.x - camX, ponta.y - camY, 3.2, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
  }
  function desenharChicotes(camX, camY) {
    var j = G.jogador;
    j.golpes.forEach(function (g) {
      tracarCorda(Combate.pontosDoGolpe(g), g.w.corTier, camX, camY, g.segundo ? 0.78 : 1);
      var m = Combate.mao();
      ctx.strokeStyle = '#6e4a26'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(m.x - camX, m.y - camY); ctx.lineTo(m.x - camX - Math.cos(g.angulo) * 8, m.y - camY - Math.sin(g.angulo) * 8); ctx.stroke();
    });
    if (j.giro) {
      var c = Combate.centro(j), raio = Combate.alcancePx(j.giro.w);
      ctx.strokeStyle = j.giro.w.corTier; ctx.globalAlpha = 0.16; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(c.x - camX, c.y - camY, raio, raio * 0.72, 0, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
      for (var v = 0; v < (j.giro.w.par ? 2 : 1); v++) for (var rastro = 2; rastro >= 0; rastro--) {
        var pts = [], base = j.giro.t * 16 + v * Math.PI - rastro * 0.5;
        for (var i = 0; i <= j.giro.w.segmentos; i++) { var t = i / j.giro.w.segmentos, ang = base - t * 1.35; pts.push({ x: c.x + Math.cos(ang) * raio * (0.2 + 0.8 * t), y: c.y + Math.sin(ang) * raio * 0.72 * (0.2 + 0.8 * t) }); }
        tracarCorda(pts, j.giro.w.corTier, camX, camY, (v ? 0.75 : 0.95) * (rastro === 0 ? 1 : 0.22));
      }
    }
    if (j.gancho) {
      var g2 = j.gancho, m2 = Combate.mao(), pts2 = [], n = 16;
      for (var i2 = 0; i2 <= n; i2++) { var t2 = i2 / n, sag = Math.sin(t2 * Math.PI) * (g2.estado === 'preso' ? 12 : 4); pts2.push({ x: U.lerp(m2.x, g2.x, t2), y: U.lerp(m2.y, g2.y, t2) + sag }); }
      tracarCorda(pts2, g2.w.corTier, camX, camY, 1);
      ctx.fillStyle = '#d9d9e3';
      ctx.beginPath(); ctx.moveTo(g2.x - camX, g2.y - camY); ctx.lineTo(g2.x - camX - 7, g2.y - camY - 4); ctx.lineTo(g2.x - camX - 6, g2.y - camY + 5); ctx.closePath(); ctx.fill();
    }
  }
  function desenharDrops(camX, camY) {
    G.drops.forEach(function (d) {
      var x = d.x - camX, y = d.y - camY + Math.sin(G.tempo * 4 + d.x) * 1.5;
      if (d.moedas && !d.itemId) { ctx.fillStyle = '#ffd700'; ctx.beginPath(); ctx.arc(x + 6, y + 6, 6, 0, 7); ctx.fill(); ctx.fillStyle = '#a67c00'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center'; ctx.fillText(d.moedas, x + 6, y - 3); return; }
      var item = D.ITEM_BY_ID[d.itemId]; if (item) desenharIcone(ctx, item, x - 2, y - 2, 16);
    });
  }
  function desenharProjeteis(camX, camY) {
    G.projeteis.forEach(function (p) { ctx.fillStyle = p.cor; ctx.beginPath(); ctx.arc(p.x - camX, p.y - camY, p.r, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(p.x - camX - 1, p.y - camY - 1, 2, 2); });
    G.rastreadores.forEach(function (r) { ctx.fillStyle = r.cor; ctx.beginPath(); ctx.arc(r.x - camX, r.y - camY, 5.5, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(r.x - camX - 1, r.y - camY - 1, 2, 2); });
    G.lasers.forEach(function (L2) {
      var x2 = L2.x + Math.cos(L2.ang) * 520 - camX, y2 = L2.y + Math.sin(L2.ang) * 520 - camY;
      if (L2.tempo < L2.aviso) { ctx.strokeStyle = 'rgba(255,80,80,.55)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 2; }
      else { ctx.strokeStyle = L2.cor; ctx.setLineDash([]); ctx.lineWidth = 7; }
      ctx.beginPath(); ctx.moveTo(L2.x - camX, L2.y - camY); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]);
    });
  }
  function desenharEfeitos(camX, camY) {
    G.particulas.forEach(function (p) { ctx.globalAlpha = Math.max(0, Math.min(1, p.vida * 2.6)); ctx.fillStyle = p.cor; ctx.fillRect(p.x - camX, p.y - camY, p.tam, p.tam); });
    ctx.globalAlpha = 1;
    G.textos.forEach(function (t) {
      ctx.globalAlpha = Math.max(0, Math.min(1, t.vida * 1.8));
      ctx.font = 'bold ' + (t.grande ? 19 : 12) + 'px monospace'; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,.75)'; ctx.fillText(t.texto, t.x - camX + 1, t.y - camY + 1);
      ctx.fillStyle = t.cor; ctx.fillText(t.texto, t.x - camX, t.y - camY);
    });
    ctx.globalAlpha = 1;
  }

  // --------------------------------------------------------------- início
  function iniciar() {
    canvas = el('canvas'); ctx = canvas.getContext('2d');
    canvas.width = G.viewW; canvas.height = G.viewH;
    canvasLuz = document.createElement('canvas'); canvasLuz.width = G.viewW; canvasLuz.height = G.viewH;
    ctxLuz = canvasLuz.getContext('2d');
    var cfg = Save.perfil().config;
    document.body.classList.toggle('fonte-grande', !!cfg.fonteGrande);
    UI.init();
    ligarEntrada();
    UI.mostrarTela('tela-menu');
    var erros = GAME_DATA.validar();
    if (erros.length) console.error('Validação das tabelas:', erros);
    else console.log('[Chicotes do Destino] Tabelas validadas:', GAME_DATA.CONTAGENS);
    requestAnimationFrame(loop);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();

  window.Jogo = Jogo;
})();
