/* CHICOTES DO DESTINO — 20-mundo.js: mundo 1400×480 com semente, biomas, cavernas, minérios e vila. */
(function () {
  'use strict';
  var W = 1400, H = 480, TILE = 16;
  var T = { AR: 0, GRAMA: 1, TERRA: 2, PEDRA: 3, AREIA: 4, NEVE: 5, GELO: 6, TRONCO: 7, FOLHAS: 8, TABUA: 9, TIJOLO: 10, VIDRO: 11, LUMINOSA: 12, OBSIDIANA: 13, AGUA: 14, LAVA: 15, PLATAFORMA: 16, TOCHA: 17, GENERICO: 50 };
  T.MINERIO0 = 30; // 30..39 = famílias 0..9

  var DEFS = {};
  function def(id, nome, cor, solido, dureza, extra) {
    var d = { id: id, nome: nome, cor: cor, solido: solido, dureza: dureza || 1 };
    if (extra) for (var k in extra) d[k] = extra[k];
    DEFS[id] = d; return d;
  }
  def(0, 'Ar', '#000000', false, 0);
  def(1, 'Grama', '#57a639', true, 1, { drop: 'bloco_1', gancho: 'terra e areia', topo: '#7ed957' });
  def(2, 'Terra', '#8a5a33', true, 1, { drop: 'bloco_2', gancho: 'terra e areia' });
  def(3, 'Pedra', '#7d7d85', true, 3, { drop: 'bloco_3', gancho: 'pedra comum' });
  def(4, 'Areia', '#e4d78a', true, 1, { drop: 'bloco_4', gancho: 'terra e areia' });
  def(5, 'Neve', '#f2f6ff', true, 1, { drop: 'bloco_5', gancho: 'terra e areia', topo: '#ffffff' });
  def(6, 'Gelo', '#9fd8f0', true, 2, { drop: 'bloco_6', gancho: 'pedra comum' });
  def(7, 'Tronco', '#6e4a26', true, 2, { drop: 'bloco_7', gancho: 'madeira e folhas' });
  def(8, 'Folhas', '#2f7d2c', false, 1, { drop: 'bloco_8', gancho: 'madeira e folhas' });
  def(9, 'Tábua de Madeira', '#b07b45', true, 2, { drop: 'bloco_9', gancho: 'madeira e folhas' });
  def(10, 'Tijolo Vermelho', '#a8433a', true, 4, { drop: 'bloco_10', gancho: 'tijolo e osso' });
  def(11, 'Vidro', '#cfeef7', true, 1, { drop: 'bloco_12', gancho: 'pedra comum', transparente: true });
  def(12, 'Pedra Luminosa', '#ffe9a3', true, 3, { drop: 'bloco_13', gancho: 'luz solidificada', luz: 90 });
  def(13, 'Obisidiana Negra', '#241f33', true, 99, { drop: 'bloco_14', gancho: 'qualquer bloco', inquebravel: true });
  def(14, 'Água', '#2f6fd0', false, 0, { liquido: true });
  def(15, 'Lava', '#e86a1e', false, 0, { liquido: true, danoLiquido: 30, luz: 70 });
  def(16, 'Plataforma de Madeira', '#c08d52', true, 1, { drop: 'bloco_31', gancho: 'madeira e folhas', plataforma: true });
  def(17, 'Tocha', '#ffcf6e', false, 0, { drop: 'bloco_34', luz: 110 });
  def(50, 'Bloco construído', '#999999', true, 2, { generico: true, gancho: 'tijolo e osso' });

  var BIOMAS = [
    { nome: 'Floresta', ate: 300, superficie: T.GRAMA, corCeu: '#79b5e0' },
    { nome: 'Deserto', ate: 520, superficie: T.AREIA, corCeu: '#a8d3e8' },
    { nome: 'Neve', ate: 740, superficie: T.NEVE, corCeu: '#c5ddf2' },
    { nome: 'Selva', ate: 980, superficie: T.GRAMA, corCeu: '#6fb27e' },
    { nome: 'Terra do Abismo', ate: 1160, superficie: T.PEDRA, corCeu: '#5f5480' },
    { nome: 'Campos Estelares', ate: 1400, superficie: T.LUMINOSA, corCeu: '#8ea2e0' }
  ];
  function biomaDe(x) { for (var i = 0; i < BIOMAS.length; i++) if (x < BIOMAS[i].ate) return BIOMAS[i]; return BIOMAS[BIOMAS.length - 1]; }

  function criarMundo(seed, nome) {
    var rng = U.criarRNG(seed);
    var tiles = new Uint8Array(W * H);
    var vars = new Uint8Array(W * H);
    var fundo = new Uint8Array(W * H); // 1 = parede de fundo (casas)
    var surface = new Int16Array(W);
    function set(x, y, v) { if (x >= 0 && y >= 0 && x < W && y < H) tiles[y * W + x] = v; }
    function get(x, y) { return (x >= 0 && y >= 0 && x < W && y < H) ? tiles[y * W + x] : T.PEDRA; }

    var ruidoA = U.ruido1D(rng, 60, 14), ruidoB = U.ruido1D(rng, 260, 4), ruidoSolo = U.ruido1D(rng, 220, 2.4);
    var x, y;
    for (x = 0; x < W; x++) {
      var b = biomaDe(x);
      var sy = 108 + ruidoA(x / W) + ruidoB(x / W) + (b.nome === 'Deserto' ? 5 : b.nome === 'Neve' ? -2 : 0);
      sy = Math.round(U.clamp(sy, 84, 140));
      surface[x] = sy;
      var profundidadeTerra = Math.max(4, Math.round(8 + ruidoSolo(x / W))); // fronteira solo/pedra suave
      for (y = sy; y < H; y++) {
        var v;
        if (y === sy) v = b.superficie;
        else if (y < sy + profundidadeTerra) v = (b.superficie === T.AREIA ? T.AREIA : b.superficie === T.NEVE ? T.NEVE : T.TERRA);
        else v = (y > 400 && rng.chance(0.12)) ? T.OBSIDIANA : T.PEDRA;
        set(x, y, v);
      }
    }
    // leito de pedra
    for (x = 0; x < W; x++) for (y = H - 3; y < H; y++) set(x, y, T.OBSIDIANA);

    // cavernas: túneis (caminhadas aleatórias) protegendo a camada da superfície
    for (var c = 0; c < 430; c++) {
      var cx = rng.int(4, W - 5), cy = rng.int(150, H - 12);
      var passos = rng.int(18, 95), dir = rng.faixa(0, Math.PI * 2);
      for (var s = 0; s < passos; s++) {
        dir += rng.faixa(-0.55, 0.55);
        cx += Math.round(Math.cos(dir)); cy += Math.round(Math.sin(dir) * 0.7);
        if (cx < 3 || cx > W - 4 || cy > H - 6) break;
        if (cy <= (surface[U.clamp(cx, 0, W - 1)] || 110) + 20) { cy++; continue; } // não rasga o chão da superfície
        var r = rng.chance(0.5) ? 0 : (cy > 300 && rng.chance(0.08) ? 2 : 1);
        for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) + Math.abs(dy) > r + 1) continue;
          if (get(cx + dx, cy + dy) !== T.OBSIDIANA) set(cx + dx, cy + dy, T.AR);
        }
      }
    }
    // algumas entradas de caverna a partir da superfície (longe da vila)
    for (var ec = 0; ec < 26; ec++) {
      var ex = rng.int(10, W - 11);
      if (Math.abs(ex - 120) < 45) continue;
      var ey = surface[ex], fundoPoco = Math.min(H - 10, ey + rng.int(35, 85));
      while (ey < fundoPoco) {
        if (get(ex, ey) !== T.OBSIDIANA) set(ex, ey, T.AR);
        if (rng.chance(0.65) && get(ex + 1, ey) !== T.OBSIDIANA) set(ex + 1, ey, T.AR);
        ey += 1; if (rng.chance(0.22)) ex += rng.int(-1, 1);
      }
    }
    // veios de minério por família/profundidade (famílias 7-9 raras no mapa; grosso cai de chefe)
    for (var f = 0; f < 10; f++) {
      var veios = f < 7 ? (300 - f * 26) : (60 - (f - 7) * 12);
      var yMin = 125 + f * 30, yMax = Math.min(H - 8, yMin + 180);
      for (var vI = 0; vI < veios; vI++) {
        var vx = rng.int(3, W - 4), vy = rng.int(yMin, yMax);
        var tamV = rng.int(2, 5);
        for (var qv = 0; qv < tamV; qv++) {
          var px = vx + rng.int(-1, 1), py = vy + rng.int(-1, 1);
          if (get(px, py) === T.PEDRA) { tiles[py * W + px] = T.MINERIO0 + f; vars[py * W + px] = rng.int(0, 4); }
        }
      }
    }
    // lagos de lava no fundo
    for (var lv = 0; lv < 60; lv++) {
      var lx = rng.int(5, W - 10), ly = rng.int(400, H - 6);
      for (var ldx = 0; ldx < rng.int(3, 7); ldx++) if (get(lx + ldx, ly) === T.AR && get(lx + ldx, ly + 1) !== T.AR) set(lx + ldx, ly, T.LAVA);
    }
    // poças de água na superfície
    for (var ag = 0; ag < 30; ag++) {
      var ax = rng.int(10, W - 14);
      if (biomaDe(ax).nome === 'Neve') continue;
      var niveis = [surface[ax], surface[ax + 1], surface[ax + 2], surface[ax + 3]];
      if (Math.max.apply(null, niveis) - Math.min.apply(null, niveis) > 1) continue; // declive: sem poça flutuante
      var ay = Math.max.apply(null, niveis);
      for (var adx = 0; adx < 4; adx++) if (get(ax + adx, ay - 1) === T.AR && get(ax + adx, ay) !== T.AR) set(ax + adx, ay - 1, T.AGUA);
    }
    // árvores e cactos
    for (x = 6; x < W - 6; x++) {
      var biome = biomaDe(x).nome, topoY = surface[x];
      if ((biome === 'Floresta' || biome === 'Selva') && get(x, topoY) === T.GRAMA && rng.chance(biome === 'Selva' ? 0.10 : 0.065)) {
        var alt = rng.int(4, 7);
        for (y = 1; y <= alt; y++) set(x, topoY - y, T.TRONCO);
        for (dy = -2; dy <= 1; dy++) for (dx = -2; dx <= 2; dx++) if (Math.abs(dx) + Math.abs(dy) < 4 && get(x + dx, topoY - alt + dy - 1) === T.AR) set(x + dx, topoY - alt + dy - 1, T.FOLHAS);
      } else if (biome === 'Deserto' && rng.chance(0.03)) {
        for (y = 1; y <= 3; y++) set(x, topoY - y, T.LUMINOSA === 0 ? T.TRONCO : T.FOLHAS);
      }
    }

    // ------------------------------------------------------ vila inicial (spawn)
    var spawnXTile = 120;
    var platY = surface[spawnXTile];
    for (x = spawnXTile - 34; x < spawnXTile + 36; x++) {
      for (y = 0; y < platY; y++) if (get(x, y) !== T.AR) set(x, y, T.AR);
      for (y = platY; y < platY + 12; y++) set(x, y, y === platY ? T.GRAMA : T.TERRA); // sem bolsões de ar sob a vila
      surface[x] = platY;
    }
    var casasNPC = [];
    function casa(cx0) {
      var largura = 13, altura = 6, base = platY;
      for (var i = 0; i < largura; i++) { set(cx0 + i, base - altura - 1, T.TABUA); set(cx0 + i, base - altura, T.TABUA); }
      // paredes com portas (2 blocos de altura) dos dois lados, abaixo do telhado de madeira
      for (var j = 3; j < altura; j++) { set(cx0, base - j, T.TIJOLO); set(cx0 + largura - 1, base - j, T.TIJOLO); }
      set(cx0 + 6, base - altura + 1, T.VIDRO); set(cx0 + 3, base - 2, T.TOCHA);
      for (var fx = cx0 + 1; fx < cx0 + largura - 1; fx++) for (var fy = base - altura + 1; fy < base; fy++) fundo[fy * W + fx] = 1; // parede interna
      return { x: (cx0 + 6) * TILE, y: (base - 2) * TILE };
    }
    // o spawn (spawnXTile) fica na ruazinha entre a 2ª e a 3ª casa, sem parede na frente
    casasNPC.push(casa(spawnXTile - 34)); casasNPC.push(casa(spawnXTile - 19)); casasNPC.push(casa(spawnXTile + 6));

    return {
      nome: nome || 'Mundo sem nome', seed: String(seed), tiles: tiles, vars: vars, fundo: fundo,
      surface: surface, spawn: { x: spawnXTile * TILE, y: (platY - 3) * TILE },
      casasNPC: casasNPC, platY: platY, criadoEm: Date.now()
    };
  }

  function defTile(world, tx, ty) {
    if (tx < 0 || ty < 0 || tx >= W || ty >= H) return DEFS[T.PEDRA];
    var id = world.tiles[ty * W + tx];
    if (id >= T.MINERIO0 && id < T.MINERIO0 + 10) {
      var f = id - T.MINERIO0;
      return { id: id, nome: 'Minério de ' + GAME_DATA.FAMILIAS_MINERIO[f], cor: '#6f6f78', solido: true, dureza: 3 + f, familiaMinerio: f, gancho: 'pedra comum', drop: 'minerio_' + (f * 5 + (world.vars[ty * W + tx] % 5) + 1) };
    }
    if (id === T.GENERICO) {
      var bItem = GAME_DATA.BLOCK_ITEMS[world.vars[ty * W + tx] % 40];
      return { id: id, nome: bItem.nome, cor: bItem.cor, solido: true, dureza: 2, generico: true, gancho: 'tijolo e osso', drop: bItem.id };
    }
    return DEFS[id] || DEFS[0];
  }
  function solidoEm(world, tx, ty) {
    if (tx < 0 || tx >= W || ty >= H) return true;
    if (ty < 0) return false;
    return defTile(world, tx, ty).solido;
  }
  function solidoPx(world, px, py) { return solidoEm(world, Math.floor(px / TILE), Math.floor(py / TILE)); }

  // movimento com colisão AABB por eixo
  function moverEntidade(world, e, dt) {
    // eixo X
    e.x += e.vx * dt;
    var topo = Math.floor(e.y / TILE), base = Math.floor((e.y + e.h - 1) / TILE), ty, tx;
    if (e.vx > 0) { tx = Math.floor((e.x + e.w) / TILE); for (ty = topo; ty <= base; ty++) if (solidoEm(world, tx, ty)) { e.x = tx * TILE - e.w - 0.01; e.vx = 0; e.bateuParede = true; break; } }
    else if (e.vx < 0) { tx = Math.floor(e.x / TILE); for (ty = topo; ty <= base; ty++) if (solidoEm(world, tx, ty)) { e.x = (tx + 1) * TILE + 0.01; e.vx = 0; e.bateuParede = true; break; } }
    // eixo Y
    e.y += e.vy * dt;
    e.noChao = false;
    var esq = Math.floor(e.x / TILE), dir = Math.floor((e.x + e.w - 1) / TILE);
    if (e.vy > 0) { ty = Math.floor((e.y + e.h) / TILE); for (tx = esq; tx <= dir; tx++) if (solidoEm(world, tx, ty)) { e.y = ty * TILE - e.h; e.vy = 0; e.noChao = true; break; } }
    else if (e.vy < 0) { ty = Math.floor(e.y / TILE); for (tx = esq; tx <= dir; tx++) if (solidoEm(world, tx, ty)) { e.y = (ty + 1) * TILE + 0.01; e.vy = 0; break; } }
    if (e.y > (H - 4) * TILE) { e.y = (H - 4) * TILE; e.vy = 0; e.noChao = true; }
    e.x = U.clamp(e.x, 8, W * TILE - e.w - 8);
  }

  window.Mundo = {
    W: W, H: H, TILE: TILE, T: T, DEFS: DEFS, BIOMAS: BIOMAS,
    biomaDe: biomaDe, criar: criarMundo, defTile: defTile,
    solidoEm: solidoEm, solidoPx: solidoPx, mover: moverEntidade,
    tileEmPx: function (px, py) { return { x: Math.floor(px / TILE), y: Math.floor(py / TILE) }; },
    blocoParaTile: function (blocoIndice) {
      var mapa = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 12, 13];
      if (blocoIndice < mapa.length) return { tile: mapa[blocoIndice], v: blocoIndice };
      if (blocoIndice === 30 || blocoIndice === 31) return { tile: T.PLATAFORMA, v: blocoIndice };
      if (blocoIndice === 33) return { tile: T.TOCHA, v: blocoIndice };
      return { tile: T.GENERICO, v: blocoIndice };
    }
  };
})();
