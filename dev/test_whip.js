// Testes das mecânicas do chicote (Chicotes do Destino):
// alcance por tier, curva de dano mão->ponta, estalo, teto de alvos + falloff,
// giro de 360°, gancho (fisga por tier / escorrega / pesca drop) e o par do Tier 5+.
//   node dev/test_whip.js
const fs = require('fs'), vm = require('vm');
const order = fs.readdirSync(__dirname + '/../src').filter(f => /^\d+.*\.js$/.test(f)).sort();
const use = order.filter(f => !/^(1[4-9]|2\d)_/.test(f) && !/gamepad/.test(f));
let code = use.map(f => fs.readFileSync(__dirname + '/../src/' + f, 'utf8')).join('\n;\n');
code += `\n;
function toast() {}   // UI (15_ui/16_main) fica fora do vm, igual ao validate.js
globalThis.__api = { G, IT, SWORDS, TD, T, TS, whipReachOf, whipMaxTargets, whipHookGroup,
  startSwing, updateSwings, startWhipSpin, whipHookThrow, updateWhip, useHeldItem, shoulderOf };`;
const ctx = { console, Math, Date, Uint8Array, Int16Array, Float32Array, Uint8ClampedArray, Set, Map, Array, Object, String, Number, JSON, performance: { now: () => Date.now() },
  document: { createElement: () => ({ getContext: () => ({}), width: 0, height: 0 }) }, window: {}, ImageData: function () {} };
ctx.globalThis = ctx; vm.createContext(ctx);
try { vm.runInContext(code, ctx); } catch (e) { console.error('LOAD ERROR:', e.stack.split('\n').slice(0, 6).join('\n')); process.exit(1); }
const A = ctx.__api, G = A.G;
let oks = 0, falhas = 0;
const check = (nome, cond, extra) => { if (cond) { oks++; console.log('  ok  ', nome, extra !== undefined ? '-> ' + extra : ''); } else { falhas++; console.log('  FAIL', nome, extra !== undefined ? '-> ' + extra : ''); } };
const perto = (a, b, tol) => Math.abs(a - b) <= (tol === undefined ? 1.5 : tol);

// ---------- cenário ----------
function novoJogador() {
  const P = {
    x: 320, y: 320, w: 12, h: 26, vx: 0, vy: 0, face: 1, dead: false, onGround: true, inWater: false, fallStart: 0,
    buffs: {}, stats: { dmg: 0, cm: 0, crit: 0, pierce: 0, steal: 0 }, inv: new Array(50).fill(null), sel: 0,
    mine: { p: 0 }, cb: { inst: [], cd: 0, side: 1, count: 0, swingT: 0, blockT: 0, hits: 0, lastHitT: 0, sw: null, main: null, spin: null, hook: null, holdT: 0 },
    hp: 100, maxHp: 100, equip: { armor: null, acc: [null, null, null, null] }, atkAim: 0,
  };
  G.P = P; return P;
}
function inimigo(x, y) {
  return { x, y, w: 14, h: 20, vx: 0, vy: 0, hp: 1000000, hpMax: 1000000, def: 0, mass: 1, st: {}, imm: new Map(), dead: false, boss: false, fly: 0, harmless: false, ghostly: false, invulnerable: false, blood: ['#c00'], hurtT: 0, flash: 0, kbT: 0, kbr: 0, noKb: false, isDummy: false };
}
function mundo(tiles) {   // tiles: { "tx,ty": id }
  G.world = { w: 200, h: 100, get: (x, y) => tiles[x + ',' + y] || 0, solid: (x, y) => !!tiles[x + ',' + y] };
}
function cenario() {
  G.enemies = []; G.drops = []; G.projs = []; G.parts = []; G.texts = []; G.t = 0; G.swingId = 1; G.hitStop = 0;
  G.cam = { x: 0, y: 0, shake: 0 }; G.mouse = { wx: 9999, wy: 329, sx: 0, sy: 0, down: [false, false, false], pressed: [false, false, false] };
  mundo({});
  return novoJogador();
}
function arma(P, id) { P.inv[0] = { id, n: 1 }; P.sel = 0; P.cb.sw = A.IT[id].sw; return A.IT[id].sw; }
function golpear(P, sw, frames) { A.startSwing(P, sw, { aim: 0 }); for (let i = 0; i < (frames || 40); i++) { G.t += 1 / 60; A.updateSwings(P, 1 / 60); } }

// ---------- 1. alcance e teto de alvos ----------
console.log('\n== alcance / alvos por tier ==');
check('alcance T1 = 3,3 tiles', perto(A.whipReachOf(A.IT.s001.sw), 3.3 * 16, .01), A.whipReachOf(A.IT.s001.sw));
check('alcance T10 = 4,2 tiles', perto(A.whipReachOf(A.IT.s200.sw), 4.2 * 16, .01), A.whipReachOf(A.IT.s200.sw));
check('alvos T1 = 3', A.whipMaxTargets(A.IT.s001.sw) === 3);
check('alvos T5 = 5', A.whipMaxTargets(A.IT.s081.sw) === 5);
check('alvos T10 = 8', A.whipMaxTargets(A.IT.s200.sw) === 8);

// ---------- 2. curva de dano e estalo ----------
console.log('\n== curva de dano (mão -> ponta) ==');
{
  const P = cenario(), sw = arma(P, 's001');   // dano base 8
  const sh = A.shoulderOf(P);
  const pertoE = inimigo(sh.x + 10 - 7, sh.y - 10); G.enemies.push(pertoE);
  golpear(P, sw);
  const dPerto = 1000000 - pertoE.hp;
  check('perto da mão: ~0,72× do base', perto(dPerto, 8 * .72, 1.6), dPerto);
}
{
  const P = cenario(), sw = arma(P, 's001');
  const sh = A.shoulderOf(P);
  const pontaE = inimigo(sh.x + 50 - 7, sh.y - 10); G.enemies.push(pontaE);
  golpear(P, sw);
  const dPonta = 1000000 - pontaE.hp;
  check('na ponta (estalo): ~2,47× do base', perto(dPonta, 8 * 2.47, 2), dPonta);
  check('estalo é bem maior que perto da mão', dPonta >= 3 * 6);
}

// ---------- 3. teto de alvos + falloff ----------
console.log('\n== múltiplos alvos ==');
{
  const P = cenario(), sw = arma(P, 's016');   // T1, dano 22
  const sh = A.shoulderOf(P), es = [];
  for (let i = 0; i < 5; i++) { const a = -.7 + i * .35, e = inimigo(sh.x + Math.cos(a) * 40 - 7, sh.y + Math.sin(a) * 40 - 10); G.enemies.push(e); es.push(e); }
  golpear(P, sw);
  const atingidos = es.filter(e => e.hp < 1000000);
  check('T1 acerta no máximo 3 dos 5', atingidos.length === 3, atingidos.length);
  const ds = atingidos.map(e => 1000000 - e.hp).sort((a, b) => b - a);
  check('falloff: 2º alvo ~85% do 1º', perto(ds[1] / ds[0], .85, .09), (ds[1] / ds[0]).toFixed(2));
  check('falloff: 3º alvo ~72% do 1º', perto(ds[2] / ds[0], .7225, .09), (ds[2] / ds[0]).toFixed(2));
}

// ---------- 4. giro de 360° ----------
console.log('\n== giro 360° ==');
{
  const P = cenario(), sw = arma(P, 's001');
  const sh = A.shoulderOf(P);
  const atras = inimigo(sh.x - 42 - 7, sh.y - 10); G.enemies.push(atras);
  A.startWhipSpin(P, sw);
  for (let i = 0; i < 80; i++) { G.t += 1 / 60; A.updateSwings(P, 1 / 60); }
  check('giro acerta inimigo ATRÁS do jogador', atras.hp < 1000000, 1000000 - atras.hp);
  check('giro termina sozinho', !P.cb.spin);
}

// ---------- 5. gancho ----------
console.log('\n== gancho ==');
check('grupo: tronco/madeira = 1', A.whipHookGroup(A.T.trunk) === 1, A.whipHookGroup(A.T.trunk));
check('grupo: tijolo = 4', A.whipHookGroup(A.T.brick) === 4, A.whipHookGroup(A.T.brick));
{
  const P = cenario(); arma(P, 's001');
  const sh = A.shoulderOf(P), tx = Math.floor(sh.x / A.TS) + 6, ty = Math.floor(sh.y / A.TS);
  const tiles = {}; tiles[tx + ',' + ty] = A.T.trunk; mundo(tiles);
  A.whipHookThrow(P);
  let grudou = false;
  for (let i = 0; i < 40 && P.cb.hk2 !== 1; i++) { G.t += 1 / 60; A.updateWhip(P, 1 / 60); if (P.cb.hook && P.cb.hook.state === 'on') { grudou = true; break; } }
  check('T1 fisga madeira', grudou);
  const vxAntes = P.vx;
  for (let i = 0; i < 12; i++) { G.t += 1 / 60; A.updateWhip(P, 1 / 60); }
  check('fisgado puxa o jogador em direção ao bloco', P.vx > vxAntes + 30, Math.round(P.vx));
}
{
  const P = cenario(); arma(P, 's001');
  const sh = A.shoulderOf(P), tx = Math.floor(sh.x / A.TS) + 6, ty = Math.floor(sh.y / A.TS);
  const tiles = {}; tiles[tx + ',' + ty] = A.T.brick; mundo(tiles);
  A.whipHookThrow(P);
  let grudou = false;
  for (let i = 0; i < 90; i++) { G.t += 1 / 60; A.updateWhip(P, 1 / 60); if (P.cb.hook && P.cb.hook.state === 'on') grudou = true; }
  check('T1 escorrega no tijolo (grupo 4)', !grudou && !P.cb.hook);
}
{
  const P = cenario(); arma(P, 's001');
  const sh = A.shoulderOf(P);
  const drop = { id: 'wood', n: 1, x: sh.x + 36, y: sh.y - 5, w: 10, h: 10, vx: 0, vy: 0, delay: .35, life: 300, t: 0 };
  G.drops.push(drop);
  A.whipHookThrow(P);
  for (let i = 0; i < 90; i++) { G.t += 1 / 60; A.updateWhip(P, 1 / 60); }
  check('gancho pesca o drop até o jogador', Math.abs(drop.x - P.x) < 24 && Math.abs(drop.y - P.y) < 30, Math.round(drop.x - P.x) + ',' + Math.round(drop.y - P.y));
}

// ---------- 6. par do Tier 5+ ----------
console.log('\n== par (Tier 5+) ==');
{
  const P = cenario(); arma(P, 's081');
  A.useHeldItem(P, 0, true);
  check('T5 ataca com 2 chicotes', P.cb.inst.length === 2, P.cb.inst.length);
  check('2º chicote a 70% de dano', P.cb.inst.some(i => i.dmgMult === .7 && i.sub));
}
{
  const P = cenario(); arma(P, 's061');
  A.useHeldItem(P, 0, true);
  check('T4 ataca com 1 chicote', P.cb.inst.length === 1, P.cb.inst.length);
}

console.log('\nverificações: ' + (oks + falhas) + ' | falhas: ' + falhas);
if (falhas) process.exit(1);
console.log('CHICOTE OK');
