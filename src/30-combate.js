/* CHICOTES DO DESTINO — 30-combate.js
 * As 7 mecânicas do chicote (Parte 2 da especificação), inimigos, chefes, NPCs e conquistas.
 * 1 alcance 2–3× · 2 dano até a ponta · 3 vários em linha · 4 giro 360°
 * 5 gancho · 6 par no T5+ · 7 corda viva (12–24 segmentos)
 */
(function () {
  'use strict';
  var D = GAME_DATA, TILE = 16;

  function statsZeradas() {
    return { chicotesDiferentes: 0, maiorTier: 0, maiorTierPar: 0, minutosJogados: 0, chefesDerrotados: 0,
      inimigosMortos: 0, estalos: 0, golpesPonta: 0, multi3: 0, girosAcerto: 0, danoTotal: 0, golpesPar: 0,
      blocosMinerados: 0, blocosColocados: 0, profundidade: 0, mineriosColetados: 0, itensCriados: 0,
      armadurasDiferentes: 0, acessoriosDiferentes: 0, picaretasDiferentes: 0, conjuntoPecas: 0, barrasFundidas: 0,
      biomasVisitados: 0, mapaRevelado: 0, usosGancho: 0, blocosAndados: 0, vaosDeGancho: 0,
      moedasGanhas: 0, conversasNPC: 0, compras: 0, pocoesBebidas: 0 };
  }

  function novoJogador(world) {
    return {
      x: world.spawn.x, y: world.spawn.y, w: 14, h: 30, vx: 0, vy: 0, noChao: false, bateuParede: false,
      direcao: 1, vida: 100, vidaMax: 100, invencivelAte: 0, moedas: 40,
      inventario: {}, barra: ['chicote_1', 'picareta_1', 'selo_1', 'pocao_1', 'bloco_31', 'bloco_34', null, null, null, null],
      selecionado: 0, equipamentos: { chicote: 'chicote_1', armadura: null, acessorios: [null, null, null, null] },
      obtidos: {}, buffs: {}, ataqueCd: 0, segundoGolpeEm: 0, segundoAngulo: 0,
      golpes: [], giro: null, gancho: null, quedaInicioY: null, piscaAte: 0,
      chefeSemDano: true, estalosSeguidos: 0, blocosSeguidos: 0, ultimaPosBloco: null
    };
  }

  // ------------------------------------------------------------- inventário
  function qtdItem(id) { return (G.jogador && G.jogador.inventario[id]) || 0; }
  function darItem(id, qtd, silencioso) {
    var j = G.jogador; if (!j || !D.ITEM_BY_ID[id]) return;
    j.inventario[id] = (j.inventario[id] || 0) + (qtd || 1);
    var novo = !j.obtidos[id]; j.obtidos[id] = true;
    var item = D.ITEM_BY_ID[id];
    if (novo) {
      if (item.tipo === 'chicote') { if (!silencioso) UI.toast('Novo chicote: ' + item.nome + ' (Tier ' + item.chicote.tier + ')!', item.cor); if (!j.equipamentos.chicote) j.equipamentos.chicote = id; }
      else if (item.tipo === 'armadura' && !silencioso) UI.toast('Nova armadura: ' + item.nome, item.cor);
      else if (item.tipo === 'acessorio' && !silencioso) UI.toast('Novo acessório: ' + item.nome, item.cor);
      else if (item.tipo === 'picareta' && !silencioso) UI.toast('Nova picareta: ' + item.nome + ' (poder ' + item.poder + ')', item.cor);
    }
    recalcularContadores(); G.uiSuja = true;
  }
  function removerItem(id, qtd) {
    var j = G.jogador; if (qtdItem(id) < (qtd || 1)) return false;
    j.inventario[id] -= (qtd || 1); if (j.inventario[id] <= 0) delete j.inventario[id];
    G.uiSuja = true; return true;
  }
  function recalcularContadores() {
    var j = G.jogador, s = G.stats; if (!j || !s) return;
    var chics = 0, maior = 0, arm = 0, acess = 0, pic = 0, tiers = {};
    Object.keys(j.obtidos).forEach(function (id) {
      var it = D.ITEM_BY_ID[id]; if (!it) return;
      if (it.tipo === 'chicote') { chics++; maior = Math.max(maior, it.chicote.tier); tiers[it.chicote.tier] = true; }
      if (it.tipo === 'armadura') arm++;
      if (it.tipo === 'acessorio') acess++;
      if (it.tipo === 'picareta') pic++;
    });
    s.chicotesDiferentes = chics; s.maiorTier = maior; s.armadurasDiferentes = arm; s.acessoriosDiferentes = acess; s.picaretasDiferentes = pic;
    var cw = chicoteEquipado();
    if (cw) s.maiorTierPar = Math.max(s.maiorTierPar || 0, cw.tier >= 5 ? cw.tier : 0);
    if (Object.keys(tiers).length >= 10) G.segredos.todosOsTiers = true;
    // conjunto: armadura + acessórios da mesma cor de família contam como peças
    var eq = j.equipamentos, pecas = 0;
    if (eq.armadura) { pecas = 1; var fam = D.ITEM_BY_ID[eq.armadura].familia; eq.acessorios.forEach(function (a) { if (a) pecas++; }); s.conjuntoPecas = pecas; }
    s.chefesDerrotados = Object.keys(G.chefesDerrotados || {}).length;
    var novaVidaMax = 100 + s.chefesDerrotados * 4; // vitalidade do destino
    if (novaVidaMax > j.vidaMax) { j.vida += novaVidaMax - j.vidaMax; }
    j.vidaMax = novaVidaMax;
  }
  function chicoteEquipado() {
    var j = G.jogador; if (!j) return null;
    var sel = j.barra[j.selecionado];
    if (sel && D.ITEM_BY_ID[sel] && D.ITEM_BY_ID[sel].tipo === 'chicote') return D.ITEM_BY_ID[sel].chicote;
    var eq = j.equipamentos.chicote;
    return eq && D.ITEM_BY_ID[eq] ? D.ITEM_BY_ID[eq].chicote : null;
  }
  function picaretaEquipada() {
    var j = G.jogador; if (!j) return null;
    var sel = j.barra[j.selecionado];
    if (sel && D.ITEM_BY_ID[sel] && D.ITEM_BY_ID[sel].tipo === 'picareta') return D.ITEM_BY_ID[sel];
    for (var i = 5; i >= 1; i--) if (qtdItem('picareta_' + i) > 0) return D.ITEM_BY_ID['picareta_' + i];
    return null;
  }
  function atributos() {
    var j = G.jogador, a = { danoMult: 1, defesa: 0, velocidadeMult: 1, alcanceMult: 1, empurraoMult: 1, estaloMult: 1, mineracaoMult: 1, ganchoMult: 1, moedasMult: 1, vidaExtra: 0, luz: 0 };
    if (!j) return a;
    var eq = j.equipamentos;
    if (eq.armadura && D.ITEM_BY_ID[eq.armadura]) {
      var ar = D.ITEM_BY_ID[eq.armadura]; a.defesa += ar.defesa || 0;
      var p = ar.passiva || '';
      if (p.indexOf('dano de chicote') > 0) a.danoMult += 0.05;
      if (p.indexOf('velocidade') > 0) a.velocidadeMult += 0.08;
      if (p.indexOf('gancho') > 0) a.ganchoMult += 0.10;
      if (p.indexOf('estalo') > 0) a.estaloMult += 0.06;
      if (p.indexOf('escuro') > 0) a.luz += 60;
    }
    var pecasConjunto = (eq.armadura ? 1 : 0) + eq.acessorios.filter(Boolean).length;
    if (pecasConjunto >= 2) a.defesa += 2;                                    // conjunto de 2 peças: bônus pequeno
    if (pecasConjunto >= 4) { a.defesa += 5; a.danoMult += 0.05; }              // conjunto de 4 peças: completo
    eq.acessorios.forEach(function (id) {
      if (!id || !D.ITEM_BY_ID[id]) return; var b = D.ITEM_BY_ID[id].bonus || '';
      if (b.indexOf('dano do estalo') > 0) a.estaloMult += 0.05;
      else if (b.indexOf('dano') > 0) a.danoMult += 0.06;
      if (b.indexOf('alcance') > 0) a.alcanceMult += 0.10;
      if (b.indexOf('empurrão') > 0) a.empurraoMult += 0.15;
      if (b.indexOf('vida máxima') > 0) a.vidaExtra += 20;
      if (b.indexOf('moedas') > 0) a.moedasMult += 0.2;
      if (b.indexOf('gancho') > 0) a.ganchoMult += 0.15;
    });
    Object.keys(j.buffs).forEach(function (nome) {
      if (j.buffs[nome] <= 0) return;
      if (nome === 'velocidade') a.velocidadeMult += 0.25;
      if (nome === 'dano') a.danoMult += 0.15;
      if (nome === 'defesa') a.defesa += 8;
      if (nome === 'mineracao') a.mineracaoMult += 0.5;
      if (nome === 'luz') a.luz += 120;
      if (nome === 'gancho') a.ganchoMult += 0.4;
    });
    return a;
  }

  // ------------------------------------------------------------- efeitos visuais
  function faisca(x, y, cor, qtd, velocidade) {
    if (!G.perfil.config.faisca && !G.perfil.config.faisca) { /* configurável */ }
    if (G.perfil.config.faisca === false) return;
    velocidade = velocidade || 90;
    for (var i = 0; i < qtd; i++) {
      var a = Math.random() * Math.PI * 2, v = velocidade * (0.3 + Math.random());
      G.particulas.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, vida: 0.25 + Math.random() * 0.3, cor: cor, tam: 1 + Math.random() * 2 });
    }
    if (G.particulas.length > 700) G.particulas.splice(0, G.particulas.length - 700);
  }
  function textoDano(x, y, texto, cor, grande) {
    G.textos.push({ x: x, y: y, texto: String(texto), cor: cor || '#fff', vida: 0.85, grande: !!grande, vy: -42 });
    if (G.textos.length > 90) G.textos.splice(0, G.textos.length - 90);
  }
  function tremer(qtd) {
    var f = (G.perfil.config.tremor != null ? G.perfil.config.tremor : 1);
    G.camera.tremor = Math.min(9, (G.camera.tremor || 0) + qtd * f);
  }
  function largarDrop(x, y, itemId, qtd, moedas) {
    G.drops.push({ x: x, y: y, w: 12, h: 12, vx: (Math.random() - 0.5) * 90, vy: -140 - Math.random() * 60, itemId: itemId, qtd: qtd || 1, moedas: moedas || 0, idade: 0, imante: false, noChao: false });
    if (G.drops.length > 220) G.drops.splice(0, G.drops.length - 220);
  }

  // ------------------------------------------------------------- dano
  function centro(e) { return { x: e.x + e.w / 2, y: e.y + e.h / 2 }; }
  function alvos() { var l = G.inimigos.slice(); if (G.chefe) l.push(G.chefe); return l; }

  function aplicarDanoInimigo(en, dano, op) {
    op = op || {}; if (en.morto) return 0;
    var defesa = en.defesa || 0;
    dano = Math.max(1, Math.round(dano - defesa * 0.35));
    en.vida -= dano; en.flash = 0.09;
    G.stats.danoTotal += dano;
    var c = centro(en);
    var cor = op.estalo ? (op.corTier || '#ffd166') : (op.t >= 0.85 ? '#ffe9a3' : '#ffffff');
    textoDano(c.x, en.y - 6, dano + (op.estalo ? '!' : ''), cor, op.estalo);
    faisca(c.x, c.y, op.estalo ? (op.corTier || '#ffd166') : '#fff2b0', op.estalo ? 12 : 4, op.estalo ? 170 : 80);
    if (op.empurrao && !en.chefeRef) { en.vx += Math.cos(op.direcao || 0) * op.empurrao * 34; en.vy -= Math.abs(op.empurrao) * 12; }
    if (op.efeito) aplicarEfeito(en, op.efeito);
    if (op.estalo) { G.stats.estalos++; G.jogador.estalosSeguidos++; if (G.jogador.estalosSeguidos >= 10) G.segredos.estalosSeguidos10 = true; }
    else if (op.t != null) { G.jogador.estalosSeguidos = 0; }
    if (op.t != null && op.t >= 0.85) G.stats.golpesPonta++;
    if (op.doPar) G.stats.golpesPar++;
    AudioJogo.golpe();
    if (en.vida <= 0) matarInimigo(en, op);
    return dano;
  }
  function aplicarEfeito(en, efeito) {
    en.efeitos = en.efeitos || {};
    if (efeito === 'fogo' || efeito === 'meteoro') en.efeitos.queimando = 3;
    if (efeito === 'gelo' || efeito === 'tempo' || efeito === 'parada_tempo') en.efeitos.lento = efeito === 'parada_tempo' ? 1.2 : 2.5;
    if (efeito === 'sangramento' || efeito === 'marca') en.efeitos.sangrando = 4;
    if (efeito === 'corrente_eletrica' || efeito === 'feixe' || efeito === 'julgamento') {
      // encadeia um raio curto no inimigo mais próximo
      var proximo = null, melhor = 90, c = centro(en);
      alvos().forEach(function (o) { if (o !== en && !o.morto) { var d = U.dist(c.x, c.y, centro(o).x, centro(o).y); if (d < melhor) { melhor = d; proximo = o; } } });
      if (proximo) aplicarDanoInimigo(proximo, 12 + G.stats.maiorTier * 4, { efeito: null });
    }
  }
  function matarInimigo(en, op) {
    if (en.morto) return; en.morto = true;
    var c = centro(en); faisca(c.x, c.y, en.cor || '#f66', 16, 140);
    if (en.chefeRef) { derrotarChefe(en); return; }
    G.stats.inimigosMortos++;
    if (op && op.doPar) G.segredos.morteDoPar = true;
    var a = atributos();
    var moedas = Math.round(en.moedas * a.moedasMult * (0.7 + Math.random() * 0.7));
    if (moedas > 0) largarDrop(c.x, c.y, null, 0, moedas);
    (en.dropItens || []).forEach(function (dd) { if (Math.random() < dd.chance) largarDrop(c.x, c.y, dd.item, 1); });
    if (Math.random() < 0.05) largarDrop(c.x, c.y, 'pocao_1', 1);
  }
  function danoJogador(qtd, fonte) {
    var j = G.jogador; if (!j || G.tempo < j.invencivelAte || G.estado !== 'jogando') return;
    var a = atributos();
    var final = Math.max(1, Math.round(qtd - a.defesa * 0.55));
    j.vida -= final; j.invencivelAte = G.tempo + 0.45; j.piscaAte = G.tempo + 0.15; j.chefeSemDano = false;
    textoDano(j.x + j.w / 2, j.y - 8, '-' + final, '#ff6b6b');
    AudioJogo.machucar(); tremer(fonte === 'chefe' ? 4 : 2); G.uiSuja = true;
    if (j.vida <= 0) {
      j.vida = 0; G.morte = { causa: fonte || 'inimigo', ate: G.tempo + 1.6 };
      UI.toast('Você caiu... a corda descansa na vila.', '#ff6b6b');
    }
  }

  // ------------------------------------------------------------- chicote (7 mecânicas)
  function mao() { var j = G.jogador; return { x: j.x + j.w / 2 + j.direcao * 7, y: j.y + 12 }; }
  function alcancePx(w) { return w.alcanceBlocos * TILE * atributos().alcanceMult; } // 3,3 (T1) a 4,2 (T10) blocos exatos

  function iniciarGolpe(angulo, segundo) {
    var j = G.jogador, w = chicoteEquipado(); if (!w || j.giro) return false;
    if (!segundo) {
      if (j.ataqueCd > 0) return false;
      j.ataqueCd = w.velocidade;
      if (w.par) { j.segundoGolpeEm = 0.13; j.segundoAngulo = angulo; } // mecânica 6: par no T5+
    }
    j.golpes.push({ t: 0, dur: 0.21, angulo: angulo, segundo: !!segundo, w: w, acertados: {}, qtd: 0, pontos: [], somTocou: false });
    AudioJogo.estalo(false);
    return true;
  }
  function iniciarGiro() { // mecânica 4: segurar 0,45s e soltar
    var j = G.jogador, w = chicoteEquipado(); if (!w || j.giro) return;
    j.giro = { t: 0, dur: 1.2, w: w, tick: 0, distintos: {}, distintosQtd: 0 };
    j.ataqueCd = Math.max(j.ataqueCd, 1.35);
    AudioJogo.giro(); tremer(1.5);
  }
  function pontosDoGolpe(g) {
    var j = G.jogador, w = g.w, m = mao();
    var p = Math.min(1, g.t / g.dur);
    var extensao = 0.30 + 0.70 * Math.sin(Math.PI * Math.min(1, p * 1.08));
    var ang = g.angulo + (-1.15 + 2.1 * p) * (Math.cos(g.angulo) >= 0 ? 1 : -1) * 0.55;
    var comp = alcancePx(w) * extensao;
    var ponta = { x: m.x + Math.cos(ang) * comp, y: m.y + Math.sin(ang) * comp };
    var perp = ang + Math.PI / 2;
    var controle = { x: m.x + Math.cos(ang) * comp * 0.42 + Math.cos(perp) * comp * 0.40 * (1 - p), y: m.y + Math.sin(ang) * comp * 0.42 + Math.sin(perp) * comp * 0.40 * (1 - p) + comp * 0.08 };
    var pts = [], n = w.segmentos; // mecânica 7: corda viva com 12–24 segmentos
    for (var i = 0; i <= n; i++) {
      var t = i / n, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t;
      var px = a * m.x + b * controle.x + c * ponta.x;
      var py = a * m.y + b * controle.y + c * ponta.y + Math.sin(t * 9 - p * 14) * 5.2 * t; // onda da corda
      if (i > 0 && Mundo.solidoPx(G.world, px, py)) { var ant = pts[i - 1]; px = ant.x + (px - ant.x) * 0.12; py = ant.y + (py - ant.y) * 0.12; }
      pts.push({ x: px, y: py, t: t });
    }
    return pts;
  }
  function distanciaSegmento(px, py, a, b) {
    var dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 0.0001;
    var t = U.clamp(((px - a.x) * dx + (py - a.y) * dy) / l2, 0, 1);
    var qx = a.x + t * dx, qy = a.y + t * dy;
    return { d: U.dist(px, py, qx, qy), t: a.t + (b.t - a.t) * t };
  }
  function atualizarGolpes(dt) {
    var j = G.jogador;
    if (j.segundoGolpeEm > 0) { j.segundoGolpeEm -= dt; if (j.segundoGolpeEm <= 0) iniciarGolpe(j.segundoAngulo + 0.25 * j.direcao, true); }
    for (var gi = j.golpes.length - 1; gi >= 0; gi--) {
      var g = j.golpes[gi]; g.t += dt;
      g.pontos = pontosDoGolpe(g);
      var w = g.w, a = atributos();
      alvos().forEach(function (en) {
        if (en.morto || g.acertados[en.uid] || g.qtd >= w.alvos) return; // mecânica 3: vários em linha
        var c = centro(en), raio = Math.max(en.w, en.h) / 2 + 5, hit = null;
        for (var s = 0; s < g.pontos.length - 1; s++) {
          var r = distanciaSegmento(c.x, c.y, g.pontos[s], g.pontos[s + 1]);
          if (r.d < raio) { hit = r; break; }
        }
        if (!hit) return;
        g.acertados[en.uid] = true;
        var ordem = g.qtd; g.qtd++;
        var t = hit.t;
        var dano = D.FORMULA.dano(w.danoBase, t);                        // mecânica 2: 0,6× → 1,6×
        var estalo = t > 0.90;
        if (estalo) dano *= D.FORMULA.estaloMultiplicador * a.estaloMult; // estalo: 2,56× no total
        dano *= Math.pow(D.FORMULA.quedaPorAlvoExtra, ordem);            // −15% por alvo extra
        dano *= a.danoMult * (g.segundo ? 0.70 : 1);                     // par: 2º com 70%
        aplicarDanoInimigo(en, dano, { t: t, estalo: estalo, corTier: w.corTier, direcao: g.angulo, empurrao: w.empurrao * a.empurraoMult, efeito: w.efeito, doPar: g.segundo });
        if (estalo) { AudioJogo.estalo(true); tremer(2.2); faisca(g.pontos[g.pontos.length - 1].x, g.pontos[g.pontos.length - 1].y, w.corTier, 10, 160); }
      });
      if (g.t > 0.09 && g.qtd >= 3) G.stats.multi3 += 0; // contagem feita ao fim do golpe
      if (g.t >= g.dur) { if (g.qtd >= 3) G.stats.multi3++; if (g.qtd === 0) G.jogador.estalosSeguidos = 0; j.golpes.splice(gi, 1); }
    }
  }
  function atualizarGiro(dt) {
    var j = G.jogador; if (!j.giro) return;
    var gr = j.giro; gr.t += dt; gr.tick -= dt;
    var c = centro(j), raio = alcancePx(gr.w);
    if (gr.tick <= 0) {
      gr.tick = 0.16; var feitos = 0;
      alvos().forEach(function (en) {
        if (en.morto || feitos >= gr.w.alvos + 2) return;
        var ec = centro(en), d = U.dist(c.x, c.y, ec.x, ec.y);
        if (d < raio + Math.max(en.w, en.h) / 2) {
          feitos++; if (!gr.distintos[en.uid]) { gr.distintos[en.uid] = true; gr.distintosQtd++; }
          aplicarDanoInimigo(en, D.FORMULA.dano(gr.w.danoBase, 0.85) * atributos().danoMult, { t: 0.85, direcao: Math.atan2(ec.y - c.y, ec.x - c.x), empurrao: gr.w.empurrao * 1.8, efeito: gr.w.efeito });
          G.stats.girosAcerto++;
        }
      });
      if (feitos) AudioJogo.estalo(false);
    }
    if (Math.random() < 0.7) faisca(c.x + Math.cos(gr.t * 16) * raio, c.y + Math.sin(gr.t * 16) * raio * 0.7, gr.w.corTier, 2, 40);
    if (gr.t >= gr.dur) { if (gr.distintosQtd >= 8) G.segredos.giro8 = true; j.giro = null; }
  }
  // mecânica 5: gancho
  var ORDEM_GANCHO = ['madeira e folhas', 'terra e areia', 'pedra comum', 'tijolo e osso', 'metal forjado', 'pedra rúnica', 'pedra estelar', 'relíquias do vazio', 'luz solidificada', 'qualquer bloco'];
  function podeAgarrar(w, def) {
    if (!def.solido) return false;
    if (w.tier >= 10) return true;
    var idxDef = ORDEM_GANCHO.indexOf(def.gancho || 'pedra comum');
    return idxDef >= 0 && idxDef <= w.tier - 1; // um tipo novo de bloco por tier
  }
  function dispararGancho(angulo) {
    var j = G.jogador, w = chicoteEquipado(); if (!w) { UI.toast('Equipe um chicote para usar o gancho.'); return; }
    if (j.gancho) { soltarGancho(); return; }
    var m = mao();
    j.gancho = { estado: 'voando', x: m.x, y: m.y, vx: Math.cos(angulo) * 1050, vy: Math.sin(angulo) * 1050, alcanceMax: alcancePx(w) * 3.1 * atributos().ganchoMult, dist: 0, w: w, x0: m.x, y0: m.y, quedaY: j.y };
    G.stats.usosGancho++; AudioJogo.ganchoSom();
  }
  function soltarGancho() { G.jogador.gancho = null; }
  function atualizarGancho(dt) {
    var j = G.jogador, g = j.gancho; if (!g) return;
    if (g.estado === 'voando') {
      var passos = Math.max(1, Math.ceil((1050 * dt) / 7)), passoDt = dt / passos, pi;
      for (pi = 0; pi < passos; pi++) {
        g.x += g.vx * passoDt; g.y += g.vy * passoDt; g.dist += 1050 * passoDt;
        G.drops.forEach(function (d) { if (U.dist(d.x, d.y, g.x, g.y) < 30) d.imante = true; }); // recolhe drops
        var tile = Mundo.tileEmPx(g.x, g.y), def = Mundo.defTile(G.world, tile.x, tile.y);
        if (def.solido) {
          if (podeAgarrar(g.w, def)) {
            g.estado = 'preso'; g.tx = tile.x; g.ty = tile.y;
            faisca(g.x, g.y, g.w.corTier, 6, 90); AudioJogo.ganchoSom();
            if (j.vy > 520) G.segredos.ganchoSalvador = true;
          } else { UI.toast('A ponta escorregou: o Tier ' + g.w.tier + ' não agarra ' + def.nome + ' (agarra ' + g.w.ganchoEm + ').'); soltarGancho(); }
          break;
        }
        if (g.dist > g.alcanceMax) { soltarGancho(); break; }
      }
    } else {
      var c = centro(j), dx = g.x - c.x, dy = g.y - c.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
      var forca = 1500;
      j.vx += (dx / d) * forca * dt; j.vy += (dy / d) * forca * dt - 620 * dt; // compensa boa parte da gravidade
      j.vx *= (1 - 1.9 * dt); j.vy *= (1 - 1.2 * dt);
      G.drops.forEach(function (dr) { if (U.dist(dr.x, dr.y, c.x, c.y) < 70) dr.imante = true; });
      if (d < 26) { if (Math.abs(g.x - g.x0) > 140) { G.stats.vaosDeGancho++; } soltarGancho(); }
    }
  }

  // ------------------------------------------------------------- inimigos
  var TIPOS_INIMIGO = [
    { nome: 'Slime Verde', tipo: 'saltitante', vida: 26, dano: 7, vel: 55, moedas: 6, cor: '#57c84b', w: 24, h: 18, biomas: ['Floresta', 'Selva'], noite: false, drops: [{ item: 'material_3', chance: 0.8 }] },
    { nome: 'Morcego da Caverna', tipo: 'voador', vida: 20, dano: 8, vel: 95, moedas: 7, cor: '#6d5aa6', w: 22, h: 14, subterraneo: true, drops: [{ item: 'material_5', chance: 0.5 }] },
    { nome: 'Esqueleto', tipo: 'andante', vida: 45, dano: 12, vel: 48, moedas: 12, cor: '#e8e3d3', w: 16, h: 30, subterraneo: true, drops: [{ item: 'material_4', chance: 0.6 }, { item: 'material_25', chance: 0.2 }] },
    { nome: 'Cobra de Areia', tipo: 'andante', vida: 34, dano: 10, vel: 70, moedas: 9, cor: '#d9b64a', w: 26, h: 12, biomas: ['Deserto'], drops: [{ item: 'material_7', chance: 0.5 }] },
    { nome: 'Lobo de Neve', tipo: 'andante', vida: 52, dano: 13, vel: 96, moedas: 11, cor: '#dfe9f5', w: 28, h: 18, biomas: ['Neve'], drops: [{ item: 'material_9', chance: 0.5 }, { item: 'material_1', chance: 0.4 }] },
    { nome: 'Aranha de Teia', tipo: 'saltitante', vida: 40, dano: 11, vel: 80, moedas: 10, cor: '#3a3550', w: 26, h: 16, biomas: ['Selva'], noite: true, drops: [{ item: 'material_8', chance: 0.6 }, { item: 'material_10', chance: 0.35 }] },
    { nome: 'Olho Voador', tipo: 'voador', vida: 38, dano: 11, vel: 85, moedas: 13, cor: '#e6e6f0', w: 22, h: 22, noite: true, drops: [{ item: 'material_6', chance: 0.5 }] },
    { nome: 'Slime do Abismo', tipo: 'saltitante', vida: 90, dano: 18, vel: 65, moedas: 20, cor: '#4b3a8f', w: 28, h: 22, biomas: ['Terra do Abismo'], drops: [{ item: 'material_30', chance: 0.5 }, { item: 'material_3', chance: 0.8 }] },
    { nome: 'Guardião Estelar', tipo: 'voador', vida: 130, dano: 22, vel: 75, moedas: 28, cor: '#ffe9a3', w: 26, h: 26, biomas: ['Campos Estelares'], drops: [{ item: 'material_20', chance: 0.5 }, { item: 'material_31', chance: 0.3 }] }
  ];
  var uidSeq = 1;
  function criarInimigo(def, x, y, escala) {
    return { uid: uidSeq++, nome: def.nome, tipoMov: def.tipo, x: x, y: y, w: def.w, h: def.h, vx: 0, vy: 0, noChao: false,
      vida: def.vida * escala, vidaMax: def.vida * escala, dano: def.dano * Math.sqrt(escala), vel: def.vel, moedas: def.moedas * escala,
      cor: def.cor, dropItens: def.drops, flash: 0, efeitos: {}, saltoCd: 0, morto: false, defesa: def.dano * 0.08 };
  }
  function gerarInimigos(dt) {
    G.spawnTimer -= dt;
    var limite = G.chefe ? 10 : 8;
    if (G.spawnTimer > 0 || G.inimigos.length >= limite) return;
    G.spawnTimer = 1.6 + Math.random() * 2.2;
    var j = G.jogador, lado = Math.random() < 0.5 ? -1 : 1;
    var x = j.x + lado * (G.viewW / 2 + 60 + Math.random() * 80), y = j.y - 40;
    var tx = U.clamp(Math.floor(x / TILE), 2, Mundo.W - 3);
    var prof = Math.floor(j.y / TILE) - (G.world.surface[U.clamp(Math.floor(j.x / TILE), 0, Mundo.W - 1)] || 110);
    var bioma = Mundo.biomaDe(tx).nome, noite = G.noite, sub = prof > 8;
    var candidatos = TIPOS_INIMIGO.filter(function (d) {
      if (sub) return d.subterraneo || d.tipo === 'voador';
      if (d.subterraneo) return false;
      if (d.biomas && d.biomas.indexOf(bioma) < 0) return false;
      if (d.noite && !noite && !d.biomas) return false;
      return true;
    });
    if (!candidatos.length) candidatos = [TIPOS_INIMIGO[0]];
    var def = candidatos[Math.floor(Math.random() * candidatos.length)];
    var escala = 1 + Math.max(0, prof) * 0.02 + Object.keys(G.chefesDerrotados).length * 0.045;
    if (!sub) { var sy = G.world.surface[tx] || 110; y = (sy - 3) * TILE; }
    var tySp = Math.floor(y / TILE), offs = [0, -1, 1, -2, 2, -4, 4, -6, 6, -9, 9, -12, 12];
    for (var oi = 0; oi < offs.length; oi++) { var cy = tySp + offs[oi]; if (cy > 1 && cy < Mundo.H - 3 && !Mundo.solidoEm(G.world, tx, cy) && !Mundo.solidoEm(G.world, tx, cy + 1)) { y = cy * TILE; break; } }
    G.inimigos.push(criarInimigo(def, tx * TILE, y, escala));
  }
  function atualizarInimigos(dt) {
    var j = G.jogador, jc = centro(j);
    for (var i = G.inimigos.length - 1; i >= 0; i--) {
      var en = G.inimigos[i];
      if (en.morto) { G.inimigos.splice(i, 1); continue; }
      var ec = centro(en), distJ = U.dist(ec.x, ec.y, jc.x, jc.y);
      if (distJ > 1500) { G.inimigos.splice(i, 1); continue; }
      var lento = en.efeitos.lento > 0 ? 0.45 : 1;
      if (en.flash > 0) en.flash -= dt;
      // efeitos contínuos
      if (en.efeitos.queimando > 0) { en.efeitos.queimando -= dt; en.vida -= 9 * dt * (1 + G.stats.maiorTier); if (Math.random() < 0.2) faisca(ec.x, ec.y, '#ff9a3d', 1, 30); }
      if (en.efeitos.sangrando > 0) { en.efeitos.sangrando -= dt; en.vida -= 5 * dt * (1 + G.stats.maiorTier * 0.5); }
      if (en.efeitos.lento > 0) en.efeitos.lento -= dt;
      if (en.vida <= 0 && !en.morto) { matarInimigo(en, {}); continue; }
      var dirJ = jc.x > ec.x ? 1 : -1;
      if (en.tipoMov === 'voador') {
        var ang = Math.atan2(jc.y - ec.y, jc.x - ec.x);
        en.vx = U.lerp(en.vx, Math.cos(ang) * en.vel * lento, 0.05);
        en.vy = U.lerp(en.vy, Math.sin(ang) * en.vel * lento, 0.05);
        en.x += en.vx * dt; en.y += en.vy * dt;
        if (Mundo.solidoPx(G.world, ec.x, ec.y)) { en.y -= 40 * dt; }
      } else {
        en.vy += 980 * dt; if (en.vy > 640) en.vy = 640;
        if (en.tipoMov === 'saltitante') {
          en.saltoCd -= dt;
          if (en.noChao) { en.vx *= 0.8; if (en.saltoCd <= 0) { en.vy = -330 - Math.random() * 80; en.vx = dirJ * en.vel * lento; en.saltoCd = 0.5 + Math.random() * 0.5; } }
        } else {
          en.vx = U.lerp(en.vx, dirJ * en.vel * lento, 0.08);
          if (en.bateuParede && en.noChao) en.vy = -380;
        }
        en.bateuParede = false;
        Mundo.mover(G.world, en, dt);
      }
      if (distJ < (en.w + j.w) / 2 + 4 && Math.abs(ec.y - jc.y) < 30) danoJogador(en.dano, en.nome);
    }
  }

  // ------------------------------------------------------------- chefes
  function invocarChefe(indice) {
    if (G.chefe) { UI.toast('Já há um chefe em combate! Derrote-o ou fuja para longe.'); return false; }
    var def = D.BOSSES[indice - 1]; if (!def) return false;
    var j = G.jogador;
    var tam = 44 * def.tamanho;
    var x = U.clamp(j.x + j.direcao * 260, 30, Mundo.W * TILE - tam - 30);
    var y = Math.max(30, j.y - 160);
    G.chefe = { uid: uidSeq++, chefeRef: def, nome: def.nome, x: x, y: y, w: tam, h: tam * 0.92, vx: 0, vy: 0, noChao: false,
      vida: def.hp, vidaMax: def.hp, dano: def.danoContato, cor: def.cor, forma: def.forma, fase: 1, fasesTotais: def.fases,
      ataqueCd: 1.2, teleCd: 5, tempoVida: 0, flash: 0, efeitos: {}, morto: false, defesa: def.indice * 0.14, dropItens: [] };
    j.chefeSemDano = true;
    AudioJogo.rugido(); tremer(5);
    UI.toast(def.nome + ' despertou! (' + def.ato + ') — ' + def.mecanica, def.cor);
    G.uiSuja = true;
    return true;
  }
  function dispararProj(x, y, ang, vel, dano, cor, amigo, tam) {
    G.projeteis.push({ x: x, y: y, vx: Math.cos(ang) * vel, vy: Math.sin(ang) * vel, dano: dano, cor: cor, amigo: !!amigo, r: tam || 4, vida: 3.2 });
    if (G.projeteis.length > 260) G.projeteis.splice(0, G.projeteis.length - 260);
  }
  function atualizarChefe(dt) {
    var b = G.chefe; if (!b) return;
    var j = G.jogador, jc = centro(j), bc = centro(b), def = b.chefeRef;
    b.tempoVida += dt; if (b.flash > 0) b.flash -= dt;
    if (U.dist(bc.x, bc.y, jc.x, jc.y) > 1800) { UI.toast(def.nome + ' se desfez na distância...'); G.chefe = null; G.uiSuja = true; return; }
    var novaFase = 1 + Math.floor((1 - b.vida / b.vidaMax) * def.fases);
    novaFase = Math.min(def.fases, novaFase);
    if (novaFase > b.fase) { b.fase = novaFase; UI.toast(def.nome + ' — fase ' + b.fase + '!', def.cor); AudioJogo.rugido(); tremer(4); faisca(bc.x, bc.y, def.cor, 30, 220); }
    var velBase = 70 + def.indice * 0.9 + b.fase * 16, t = b.tempoVida;
    // movimento inédito por chefe (tipo vem da tabela)
    if (def.movimento === 'voador' || def.movimento === 'flutuante' || def.movimento === 'orbitante') {
      var alvoX = jc.x + (def.movimento === 'orbitante' ? Math.cos(t * 0.9) * 210 : Math.sin(t * 0.7) * 90);
      var alvoY = jc.y - 130 + Math.sin(t * 1.7) * 45;
      b.vx = U.lerp(b.vx, U.clamp((alvoX - bc.x) * 2.2, -velBase * 2, velBase * 2), 0.05);
      b.vy = U.lerp(b.vy, U.clamp((alvoY - bc.y) * 2.2, -velBase * 2, velBase * 2), 0.05);
      b.x += b.vx * dt; b.y += b.vy * dt;
    } else {
      b.vy += 980 * dt; if (b.vy > 700) b.vy = 700;
      var dirJ = jc.x > bc.x ? 1 : -1;
      if (def.movimento === 'saltitante') {
        if (b.noChao) { b.vx *= 0.7; if (Math.random() < 0.04 + b.fase * 0.01) { b.vy = -460; b.vx = dirJ * velBase * 1.5; } }
      } else if (def.movimento === 'investida') {
        b.teleCd -= dt;
        if (b.teleCd <= 0) { b.teleCd = 3.4; b.vx = dirJ * velBase * 3.4; b.vy = -140; }
        b.vx = U.lerp(b.vx, dirJ * velBase, 0.03);
      } else if (def.movimento === 'escavador') {
        b.teleCd -= dt;
        if (b.teleCd <= 0) { b.teleCd = 4.2; b.x = U.clamp(jc.x + (Math.random() < 0.5 ? -170 : 170), 20, Mundo.W * TILE - b.w - 20); b.y = jc.y - b.h - 10; faisca(b.x + b.w / 2, b.y + b.h / 2, def.cor, 18, 150); }
        b.vx = U.lerp(b.vx, dirJ * velBase, 0.06);
      } else b.vx = U.lerp(b.vx, dirJ * velBase, 0.06);
      Mundo.mover(G.world, b, dt);
    }
    // ataque inédito por chefe
    b.ataqueCd -= dt;
    if (b.ataqueCd <= 0) {
      b.ataqueCd = Math.max(0.75, 2.1 - def.indice * 0.012 - b.fase * 0.22);
      var angJ = Math.atan2(jc.y - bc.y, jc.x - bc.x), danoP = 6 + def.indice * 0.75, n, i;
      switch (def.ataque) {
        case 'rajada radial': n = 6 + b.fase * 2; for (i = 0; i < n; i++) dispararProj(bc.x, bc.y, (i / n) * Math.PI * 2 + t, 150, danoP, def.cor); break;
        case 'espiral de projéteis': for (i = 0; i < 3 + b.fase; i++) dispararProj(bc.x, bc.y, t * 2.4 + i * 1.05, 170, danoP, def.cor); break;
        case 'laser telegrafado': G.lasers.push({ x: bc.x, y: bc.y, ang: angJ, tempo: 0, aviso: 0.55, duracao: 0.5, dano: danoP * 1.8, cor: def.cor, acertou: false }); break;
        case 'chuva de meteoros': for (i = 0; i < 3 + b.fase; i++) dispararProj(jc.x + (Math.random() - 0.5) * 260, jc.y - 260, Math.PI / 2 + (Math.random() - 0.5) * 0.3, 240, danoP, '#ff9a3d', false, 6); break;
        case 'invoca lacaios': if (G.inimigos.length < 10) { var dd = TIPOS_INIMIGO[def.indice % TIPOS_INIMIGO.length]; G.inimigos.push(criarInimigo(dd, bc.x - 20, bc.y, 1 + def.indice * 0.05)); G.inimigos.push(criarInimigo(dd, bc.x + 20, bc.y, 1 + def.indice * 0.05)); } break;
        case 'onda de choque': if (b.noChao && Math.abs(bc.y - jc.y) < 60 && Math.abs(bc.x - jc.x) < 240) danoJogador(danoP * 1.5, 'chefe'); tremer(4); faisca(bc.x, b.y + b.h, def.cor, 16, 160); break;
        case 'tiros rastreadores': G.rastreadores.push({ x: bc.x, y: bc.y, vx: Math.cos(angJ) * 120, vy: Math.sin(angJ) * 120, dano: danoP, cor: def.cor, vida: 4 }); break;
        case 'feixe em leque': for (i = -2; i <= 2; i++) dispararProj(bc.x, bc.y, angJ + i * 0.18, 210, danoP, def.cor); break;
        default: for (i = 0; i < 2 + b.fase; i++) dispararProj(bc.x, bc.y, angJ + (Math.random() - 0.5) * 0.24, 190, danoP, def.cor); break;
      }
    }
    if (U.dist(bc.x, bc.y, jc.x, jc.y) < (b.w + j.w) / 2 + 2) danoJogador(b.dano, 'chefe');
  }
  function derrotarChefe(en) {
    var def = en.chefeRef, c = centro(en), primeiro = !G.chefesDerrotados[def.indice];
    G.chefesDerrotados[def.indice] = true;
    G.chefe = null; G.lasers.length = 0; G.rastreadores.length = 0;
    if (G.jogador.chefeSemDano) G.segredos.chefeSemDano = true;
    faisca(c.x, c.y, def.cor, 44, 260); tremer(6); AudioJogo.conquista();
    var moedas = Math.round(40 + def.indice * 22);
    largarDrop(c.x, c.y, null, 0, moedas);
    // minério/barra de pós-jogo (família sobe com o índice do chefe)
    var fam = def.indice >= 75 ? 9 : def.indice >= 55 ? 8 : def.indice >= 43 ? 7 : Math.min(6, Math.floor((def.indice - 1) / 7));
    largarDrop(c.x, c.y, 'minerio_' + (fam * 5 + (def.indice % 5) + 1), 3);
    if (def.indice >= 55) largarDrop(c.x, c.y, 'barra_' + (Math.min(9, 7 + (def.indice % 3)) * 5 + (def.indice % 5) + 1), 2);
    if (Math.random() < 0.5) largarDrop(c.x, c.y, 'material_' + (20 + (def.indice % 14)), 2);
    var dropsTxt = [];
    if (def.acessorioExclusivo && primeiro) { largarDrop(c.x, c.y, def.acessorioExclusivo, 1); dropsTxt.push(D.ITEM_BY_ID[def.acessorioExclusivo].nome); }
    if (def.chicoteGuardado) {
      var w = D.WHIPS[def.chicoteGuardado - 1];
      var total = Object.keys(G.chefesDerrotados).length;
      if (w.numero === 200 && total >= 94) { largarDrop(c.x, c.y - 20, w.itemId, 1); dropsTxt.push('APOTEOSE — o chicote nº 200!'); }
      else if (w.numero < 200) { largarDrop(c.x, c.y - 20, w.itemId, 1); dropsTxt.push(w.nome + ' (Tier ' + w.tier + ')'); }
    }
    UI.toast(def.nome + ' derrotado! Chefes: ' + Object.keys(G.chefesDerrotados).length + '/94.' + (dropsTxt.length ? ' Caiu: ' + dropsTxt.join(', ') : ''), '#ffd166');
    recalcularContadores();
    if (Object.keys(G.chefesDerrotados).length === 93) { G.segredos.chefes93 = true; UI.toast('93 de 94... só falta um. A Apoteose espera no fim de tudo.', '#ffffff'); }
    if (Object.keys(G.chefesDerrotados).length >= 94) UI.toast('94 de 94 chefes! A Apoteose já pode existir.', '#ffffff');
    G.uiSuja = true;
  }

  // ------------------------------------------------------------- projéteis, lasers, drops, partículas
  function atualizarProjeteis(dt) {
    var j = G.jogador, jc = centro(j);
    var i;
    for (i = G.projeteis.length - 1; i >= 0; i--) {
      var p = G.projeteis[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vida -= dt;
      var fora = p.vida <= 0 || Mundo.solidoPx(G.world, p.x, p.y);
      if (!fora && !p.amigo && U.dist(p.x, p.y, jc.x, jc.y) < p.r + 12) { danoJogador(p.dano, 'projétil'); fora = true; }
      if (!fora && p.amigo) {
        var hitE = null;
        alvos().forEach(function (en) { if (!en.morto && p.x > en.x - 3 && p.x < en.x + en.w + 3 && p.y > en.y - 3 && p.y < en.y + en.h + 3) hitE = en; });
        if (hitE) { aplicarDanoInimigo(hitE, p.dano, {}); fora = true; }
      }
      if (fora) G.projeteis.splice(i, 1);
    }
    for (i = G.rastreadores.length - 1; i >= 0; i--) {
      var r = G.rastreadores[i], ang = Math.atan2(jc.y - r.y, jc.x - r.x);
      r.vx = U.lerp(r.vx, Math.cos(ang) * 170, 0.04); r.vy = U.lerp(r.vy, Math.sin(ang) * 170, 0.04);
      r.x += r.vx * dt; r.y += r.vy * dt; r.vida -= dt;
      if (U.dist(r.x, r.y, jc.x, jc.y) < 16) { danoJogador(r.dano, 'projétil'); r.vida = 0; }
      if (r.vida <= 0 || Mundo.solidoPx(G.world, r.x, r.y)) G.rastreadores.splice(i, 1);
    }
    for (i = G.lasers.length - 1; i >= 0; i--) {
      var L = G.lasers[i]; L.tempo += dt;
      if (L.tempo > L.aviso && !L.acertou) {
        // distância do jogador ao feixe
        var dxl = jc.x - L.x, dyl = jc.y - L.y;
        var proj = dxl * Math.cos(L.ang) + dyl * Math.sin(L.ang);
        var px = L.x + Math.cos(L.ang) * proj, py = L.y + Math.sin(L.ang) * proj;
        if (proj > 0 && proj < 520 && U.dist(jc.x, jc.y, px, py) < 15) { danoJogador(L.dano, 'chefe'); L.acertou = true; }
      }
      if (L.tempo > L.aviso + L.duracao) G.lasers.splice(i, 1);
    }
  }
  function atualizarDrops(dt) {
    var j = G.jogador, jc = centro(j);
    for (var i = G.drops.length - 1; i >= 0; i--) {
      var d = G.drops[i]; d.idade += dt;
      if (d.imante || U.dist(d.x, d.y, jc.x, jc.y) < 46) {
        var a = Math.atan2(jc.y - d.y, jc.x - d.x);
        d.vx = Math.cos(a) * 260; d.vy = Math.sin(a) * 260;
        d.x += d.vx * dt; d.y += d.vy * dt;
      } else {
        d.vy += 700 * dt; if (d.vy > 420) d.vy = 420;
        var ed = { x: d.x, y: d.y, w: d.w, h: d.h, vx: d.vx, vy: d.vy, noChao: false };
        Mundo.mover(G.world, ed, dt);
        d.x = ed.x; d.y = ed.y; d.vx = ed.vx; d.vy = ed.vy; d.noChao = ed.noChao;
        if (d.noChao) d.vx *= 0.8;
      }
      if (d.idade > 0.25 && U.dist(d.x, d.y, jc.x, jc.y) < 24) {
        if (d.moedas) { j.moedas += d.moedas; G.stats.moedasGanhas += d.moedas; textoDano(jc.x, j.y - 10, '+' + d.moedas + ' moedas', '#ffd700'); AudioJogo.moeda(); }
        if (d.itemId) { darItem(d.itemId, d.qtd); textoDano(jc.x, j.y - 12, D.ITEM_BY_ID[d.itemId].nome + (d.qtd > 1 ? ' ×' + d.qtd : ''), '#bff0c0'); AudioJogo.pegar(); }
        G.drops.splice(i, 1); G.uiSuja = true;
      }
      if (d.idade > 180) G.drops.splice(i, 1);
    }
  }
  function atualizarEfeitos(dt) {
    var i;
    for (i = G.particulas.length - 1; i >= 0; i--) { var p = G.particulas[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 140 * dt; p.vida -= dt; if (p.vida <= 0) G.particulas.splice(i, 1); }
    for (i = G.textos.length - 1; i >= 0; i--) { var t = G.textos[i]; t.y += t.vy * dt; t.vy *= (1 - 2.4 * dt); t.vida -= dt; if (t.vida <= 0) G.textos.splice(i, 1); }
  }

  // ------------------------------------------------------------- NPCs
  var NPC_DEFS = [
    { nome: 'Guia Tomás', papel: 'guia', cor: '#4a90d9', falas: ['Bem-vindo a Chicotes do Destino! Clique para estalar o chicote: a ponta causa muito mais dano que o cabo.', 'Segure o golpe por 0,45s e solte para girar em 360°. Botão direito (ou F) lança o gancho na madeira.', 'Mina minérios com a picareta (tecla 2), funde as barras na criação (tecla C) e forje chicotes novos!', 'Tem 200 chicotes em 10 tiers. Do Tier 5 em diante eles vêm em par!', 'Use um Selo da barra de itens para invocar um chefe. São 94. Com 94/94, a Apoteose aparece.'] },
    { nome: 'Comerciante Rita', papel: 'loja', cor: '#d97742', falas: ['Moedas no bolso? Aperta E perto de mim que eu abro a lojinha.', 'Poções e blocos salvam vidas. E o chicote salva o resto.'] },
    { nome: 'Ferreira Bruna', papel: 'ferreira', cor: '#9c6644', falas: ['Forjo qualquer coisa... no papel. Aperta C e use as 433 receitas você mesmo, mais rápido.', 'Minérios de Lumenita em diante só caem de chefe, escutou? Tier 7 e 8 se forjam com eles.', 'O gancho do Tier 1 só agarra madeira e folha. Cada tier libera um material novo para agarrar.'] }
  ];
  function criarNPCs(world) {
    return NPC_DEFS.map(function (d, i) {
      var casa = world.casasNPC[i % world.casasNPC.length];
      return { nome: d.nome, papel: d.papel, cor: d.cor, falas: d.falas, falaIdx: 0, x: casa.x, y: casa.y, w: 14, h: 30, vx: 0, vy: 0, noChao: false, casaX: casa.x, andarDir: 1, pensarCd: 2 };
    });
  }
  function atualizarNPCs(dt) {
    G.npcs.forEach(function (n) {
      n.vy += 980 * dt; if (n.vy > 640) n.vy = 640;
      n.pensarCd -= dt;
      if (n.pensarCd <= 0) { n.pensarCd = 2 + Math.random() * 3; n.andarDir = Math.random() < 0.4 ? 0 : (Math.random() < 0.5 ? -1 : 1); }
      if (Math.abs(n.x - n.casaX) > 90) n.andarDir = n.casaX > n.x ? 1 : -1;
      n.vx = n.andarDir * 26;
      Mundo.mover(G.world, n, dt);
    });
  }
  function npcPerto() {
    var j = G.jogador, melhor = null, bd = 52;
    G.npcs.forEach(function (n) { var d = U.dist(n.x, n.y, j.x, j.y); if (d < bd) { bd = d; melhor = n; } });
    return melhor;
  }

  // ------------------------------------------------------------- conquistas (429)
  function desbloquearSilencioso(id) { /* usado ao carregar perfil */ }
  function avaliarConquistas() {
    if (!G.jogador || G.estado !== 'jogando') return;
    var perfil = G.perfil, ganhas = {};
    perfil.conquistas.forEach(function (id) { ganhas[id] = true; });
    var novas = [];
    D.ACHIEVEMENTS.forEach(function (ac) {
      if (ganhas[ac.id]) return;
      var ok = false, st = ac.estat;
      if (st.indexOf('chicote:') === 0) ok = !!G.jogador.obtidos[st.slice(8)];
      else if (st.indexOf('chefe:') === 0) ok = !!G.chefesDerrotados[st.slice(6)];
      else if (st.indexOf('secreto:') === 0) ok = !!G.segredos[st.slice(8)];
      else if (st === 'mundosCriados' || st === 'salvamentos' || st === 'exportacoes' || st === 'importacoes') ok = (perfil.statsMundos[st] || 0) >= ac.alvo;
      else ok = (G.stats[st] || 0) >= ac.alvo;
      if (ok) { perfil.conquistas.push(ac.id); ganhas[ac.id] = true; novas.push(ac); }
    });
    if (novas.length) {
      Save.salvarPerfil(perfil); G.uiSuja = true;
      novas.slice(0, 3).forEach(function (ac, i) { setTimeout(function () { UI.toast('Conquista (' + ac.raridade + '): ' + ac.nome, '#ffd166'); AudioJogo.conquista(); }, i * 350); });
      if (novas.length > 3) UI.toast('...e mais ' + (novas.length - 3) + ' conquistas!', '#ffd166');
    }
  }

  window.Combate = {
    statsZeradas: statsZeradas, novoJogador: novoJogador,
    qtdItem: qtdItem, darItem: darItem, removerItem: removerItem, recalcularContadores: recalcularContadores,
    chicoteEquipado: chicoteEquipado, picaretaEquipada: picaretaEquipada, atributos: atributos,
    faisca: faisca, textoDano: textoDano, tremer: tremer, largarDrop: largarDrop,
    centro: centro, alvos: alvos, aplicarDanoInimigo: aplicarDanoInimigo, danoJogador: danoJogador,
    iniciarGolpe: iniciarGolpe, iniciarGiro: iniciarGiro, dispararGancho: dispararGancho, soltarGancho: soltarGancho,
    atualizarGolpes: atualizarGolpes, atualizarGiro: atualizarGiro, atualizarGancho: atualizarGancho,
    pontosDoGolpe: function (g) { return g.pontos && g.pontos.length ? g.pontos : pontosDoGolpe(g); },
    alcancePx: alcancePx, mao: mao,
    gerarInimigos: gerarInimigos, atualizarInimigos: atualizarInimigos,
    invocarChefe: invocarChefe, atualizarChefe: atualizarChefe, dispararProj: dispararProj,
    atualizarProjeteis: atualizarProjeteis, atualizarDrops: atualizarDrops, atualizarEfeitos: atualizarEfeitos,
    criarNPCs: criarNPCs, atualizarNPCs: atualizarNPCs, npcPerto: npcPerto,
    avaliarConquistas: avaliarConquistas, TIPOS_INIMIGO: TIPOS_INIMIGO
  };
})();
