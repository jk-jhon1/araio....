/* ============================================================
   09c_whip: o chicote vivo (Chicotes do Destino).
   - giro de 360°: segurar o ataque por 0,45 s+ e soltar;
   - gancho: F / botão do meio lança a corda — puxa o jogador
     até o bloco fisgado (1 tipo de bloco por tier) ou pesca
     um drop no caminho;
   - corda segmentada desenhada no mundo para cada golpe.
   A curva de dano (mão -> ponta) e o estalo vivem em 09b_swing.
   ============================================================ */
// ---------- que blocos cada tier consegue fisgar ----------
function whipHookGroup(id) {
  const d = TD[id]; if (!d) return 3;
  const k = (d.k || '') + ' ' + (d.n || '');
  if (/obsidian|brick|bone|tijolo|osso/i.test(k)) return 4;
  if (/trunk|leaf|plank|wood|log|cactus|mushroom|thorn|flower|folha|madeira|tronco/i.test(k)) return 1;
  if (/celest|meteor|stellar|estelar/i.test(k)) return 7;
  if (/void|relic|abyss|hell|demon|rel[ií]q|vazio/i.test(k)) return 8;
  if (/rune|crystal|quartz|gem|amethyst|cristal|r[uú]n/i.test(k)) return 6;
  if (/metal|iron|steel|gold|silver|copper|platin|bronze|ferro|a[çc]o/i.test(k)) return 5;
  if (/cloud|light|sun|ember|lava|magma|brasa|luz/i.test(k)) return 9;
  if (/dirt|sand(?!stone)|grass|snow|ice|mud|ash|glass|terra|areia|neve|vidro/i.test(k)) return 2;
  return 3; // pedra e minérios em geral
}
// ---------- giro de 360° ----------
let _whipSpinId = 1;
function startWhipSpin(P, sw) {
  if (P.cb.spin || P.dead || P.buffs.silence || P.buffs.stun) return;
  P.cb.spin = { t: 0, dur: 1.2, ang: P.face > 0 ? -.7 : PI + .7, sw, tick: 0, tickN: 0, kills: 0, id: _whipSpinId++ };
  sfx('swing2'); achStat('giro');
}
// ---------- gancho ----------
function whipHookThrow(P) {
  const sw = (typeof heldSword === 'function') ? heldSword() : null;
  if (!sw || !P || P.dead) return;
  const cb = P.cb;
  if (cb.hook) { cb.hook = null; return; }              // apertar de novo: solta
  const sh = shoulderOf(P), a = Math.atan2(G.mouse.wy - sh.y, G.mouse.wx - sh.x);
  cb.hook = { state: 'fly', x: sh.x, y: sh.y, vx: Math.cos(a) * 580, vy: Math.sin(a) * 580, sw, t: 0, max: whipReachOf(sw) * 2, drop: null, tx: 0, ty: 0 };
  sfx('swing');
}
// ---------- atualização (chamada de updateSwings) ----------
function updateWhip(P, dt) {
  const cb = P.cb, wd = G.world; if (!wd) return;
  // ---- giro 360° ----
  const sp = cb.spin;
  if (sp) {
    sp.t += dt; sp.ang += dt * TAU * 2 / sp.dur;         // duas voltas completas
    sp.tick -= dt;
    if (sp.tick <= 0) {
      sp.tick = .12; sp.tickN++;
      const o = shoulderOf(P), R = whipReachOf(sp.sw) + 8, list = [];
      for (const e of G.enemies) {
        if (e.dead || e.ghostly || e.harmless || e.invulnerable) continue;
        const d = dist(ecx(e), ecy(e), o.x, o.y);
        if (d < R + Math.max(e.w, e.h) / 2) list.push([d, e]);
      }
      list.sort((a, b) => a[0] - b[0]);
      let acertou = false;
      list.slice(0, whipMaxTargets(sp.sw)).forEach(([d, e], i) => {
        const ex = ecx(e) - o.x, ey = ecy(e) - o.y, l = Math.hypot(ex, ey) || 1;
        const res = hitEnemy(e, {
          src: 'melee', id: 'wspin' + sp.id + '_' + sp.tickN, imm: .05,
          dmg: sp.sw.baseDamage * 1.5 * Math.pow(.85, i), crit: false, noVar: true,
          kb: sp.sw.knockbackForce * 2, dir: { x: ex / l, y: ey / l - .15 },
          sword: sp.sw, fromX: o.x, fromY: o.y, fs: 1,
        });
        if (res) { acertou = true; if (res.killed) sp.kills++; }
      });
      if (acertou) { sfx('crack', .5); cb.hits++; cb.lastHitT = G.t; }
    }
    if (sp.t >= sp.dur) { if (sp.kills >= 5) achStat('giro5'); cb.spin = null; }
  }
  // ---- gancho ----
  const hk = cb.hook; if (!hk) return;
  const sh = shoulderOf(P);
  if (hk.state === 'fly') {
    hk.t += dt;
    const steps = Math.max(1, Math.ceil(Math.hypot(hk.vx, hk.vy) * dt / 6));
    for (let i = 0; i < steps && hk.state === 'fly'; i++) {
      hk.x += hk.vx * dt / steps; hk.y += hk.vy * dt / steps;
      for (const d of G.drops) {   // fisgou um drop no caminho: traz de volta
        if (hk.x > d.x - 5 && hk.x < d.x + d.w + 5 && hk.y > d.y - 5 && hk.y < d.y + d.h + 5) { hk.drop = d; hk.state = 'back'; sfx('crack', .6); achStat('pesca'); break; }
      }
      if (hk.state !== 'fly') break;
      const tx = Math.floor(hk.x / TS), ty = Math.floor(hk.y / TS);
      if (wd.solid(tx, ty)) {
        const id = wd.get(tx, ty);
        if (whipHookGroup(id) <= hk.sw.tierLevel) {
          hk.state = 'on'; hk.tx = tx; hk.ty = ty; hk.x = tx * TS + TS / 2; hk.y = ty * TS + TS / 2;
          sfx('crack'); burst(hk.x, hk.y, 5, { col: ['#fff', TIERS[hk.sw.tierLevel].col], spd: 70, life: .25 });
        } else {
          hk.state = 'back'; addText(hk.x, hk.y - 10, 'Escorregou!', '#fca5a5', 11, .8);
          burst(hk.x, hk.y, 4, { col: '#fca5a5', spd: 60, life: .2 });
        }
      }
    }
    if (hk.state === 'fly' && (dist(hk.x, hk.y, sh.x, sh.y) > hk.max || hk.t > 1.2)) hk.state = 'back';
  } else if (hk.state === 'back') {
    const d = dist(hk.x, hk.y, sh.x, sh.y), passo = 640 * dt;
    if (d < 16 || d <= passo) {
      if (hk.drop) { hk.drop.x = P.x + 1; hk.drop.y = P.y + 4; hk.drop.vx = 0; hk.drop.vy = 0; hk.drop.delay = 0; }
      cb.hook = null; return;
    }
    hk.x += (sh.x - hk.x) / d * passo; hk.y += (sh.y - hk.y) / d * passo;
    if (hk.drop) { hk.drop.x = hk.x - 5; hk.drop.y = hk.y - 5; hk.drop.vx = 0; hk.drop.vy = 0; hk.drop.delay = .35; }
  } else if (hk.state === 'on') {
    if (!wd.solid(hk.tx, hk.ty)) { cb.hook = null; return; }   // o bloco sumiu: solta
    const px = P.x + P.w / 2, py = P.y + 6, dx = hk.x - px, dy = hk.y - py, d = Math.hypot(dx, dy) || 1;
    if (d < 24) { P.vx *= Math.pow(.0005, dt); if (P.vy > 40) P.vy = 40; }   // pendurado
    else {
      P.vx += dx / d * 1550 * dt; P.vy += dy / d * 1550 * dt;
      const vmax = 310, v = Math.hypot(P.vx, P.vy);
      if (v > vmax) { P.vx *= vmax / v; P.vy *= vmax / v; }
    }
    P.fallStart = P.y;                       // fisgado não toma dano de queda
    if (P.vy < -380) cb.hook = null;         // pulou: solta aproveitando o impulso
  }
}
// ---------- desenho das cordas ----------
function whipSegs(sw) { return 10 + sw.tierLevel + (sw.num % 4); }
function ropeStroke(g, pts, sw, alpha) {
  const n = pts.length; if (n < 2) return;
  const col = sw.look.col, dark = shade(col, -.35), glow = sw.look.glow || TIERS[sw.tierLevel].col, tier = sw.tierLevel;
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; g.globalAlpha = alpha;
  if (tier >= 6) { g.shadowColor = glow; g.shadowBlur = tier >= 9 ? 9 : 5; }
  for (let pass = 0; pass < 2; pass++) for (let i = 1; i < n; i++) {
    const t = i / (n - 1);
    g.strokeStyle = pass === 0 ? 'rgba(8,6,14,.9)' : (i % 3 === 0 ? dark : col);
    g.lineWidth = (pass === 0 ? 4.4 : 3) * (1 - t * .7) + .7;
    g.beginPath(); g.moveTo(pts[i - 1][0], pts[i - 1][1]); g.lineTo(pts[i][0], pts[i][1]); g.stroke();
  }
  g.shadowBlur = 0;
  // detalhes por tier: cravos (2), nós (3+), contas brilhantes (8+)
  if (tier >= 2) for (let i = 2; i < n - 1; i += 3) {
    g.fillStyle = tier >= 8 ? glow : '#e9edf4';
    const s = tier >= 4 ? 1.7 : 1.3;
    g.fillRect(pts[i][0] - s / 2, pts[i][1] - s - 1.2, s, s);
    g.fillRect(pts[i][0] - s / 2, pts[i][1] + 1.2, s, s);
  }
  // ponta viva
  g.fillStyle = '#fff'; g.beginPath(); g.arc(pts[n - 1][0], pts[n - 1][1], 1.6, 0, TAU); g.fill();
  g.globalAlpha = alpha * .5; g.fillStyle = glow; g.beginPath(); g.arc(pts[n - 1][0], pts[n - 1][1], 3.2, 0, TAU); g.fill();
  g.restore();
}
function swingRopePts(P, inst) {
  const o = instOrigin(P, inst), n = whipSegs(inst.sw), p = clamp(inst.t / inst.dur, 0, 1);
  const a = inst.a !== undefined ? inst.a : inst.aim, td = instTipDist(inst, p);
  const rot = inst.side * (Math.cos(inst.aim) >= 0 ? 1 : -1);
  const lag = inst.thrust ? .06 : .6 * Math.sin(p * PI);   // a corda atrasa atrás do braço
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), ai = a - rot * Math.pow(t, 1.5) * lag, di = td * t;
    let x = o.x + Math.cos(ai) * di, y = o.y + Math.sin(ai) * di;
    if (inst.thrust) { const w = Math.sin(t * 9 - p * 15) * 2.2 * t; x += Math.cos(ai + PI / 2) * w; y += Math.sin(ai + PI / 2) * w; }
    pts.push([x, y]);
  }
  return pts;
}
function drawWhipRopes(g, P) {
  const cb = P.cb; if (!cb) return;
  for (const inst of cb.inst) {
    if (inst.t < 0 || inst.tipX === undefined) continue;
    const fade = inst.t >= inst.dur ? clamp(inst.fade / .14, 0, 1) : 1;
    ropeStroke(g, swingRopePts(P, inst), inst.sw, fade * inst.alpha);
  }
  const sp = cb.spin;
  if (sp) {
    const o = shoulderOf(P), n = whipSegs(sp.sw), R = whipReachOf(sp.sw), pts = [];
    for (let i = 0; i < n; i++) { const t = i / (n - 1), a = sp.ang - t * 2.1; pts.push([o.x + Math.cos(a) * R * t, o.y + Math.sin(a) * R * t * .82]); }
    ropeStroke(g, pts, sp.sw, .95);
    if (sp.sw.tierLevel >= 5) {   // par: segunda corda em oposição
      const pts2 = [];
      for (let i = 0; i < n; i++) { const t = i / (n - 1), a = sp.ang + PI - t * 2.1; pts2.push([o.x + Math.cos(a) * R * t, o.y + Math.sin(a) * R * t * .82]); }
      ropeStroke(g, pts2, sp.sw, .8);
    }
  }
  const hk = cb.hook;
  if (hk) {
    const sh = shoulderOf(P), n = 14, pts = [], d = dist(sh.x, sh.y, hk.x, hk.y);
    const sag = hk.state === 'on' ? 2 : Math.min(10, d * .07);
    for (let i = 0; i <= n; i++) { const t = i / n; pts.push([lerp(sh.x, hk.x, t), lerp(sh.y, hk.y, t) + Math.sin(t * PI) * sag]); }
    ropeStroke(g, pts, hk.sw, .95);
    // garra na ponta
    g.save(); g.strokeStyle = '#e9edf4'; g.lineWidth = 1.6; g.lineCap = 'round';
    const a = Math.atan2(hk.y - sh.y, hk.x - sh.x);
    for (const da of [-.6, 0, .6]) { g.beginPath(); g.moveTo(hk.x, hk.y); g.lineTo(hk.x + Math.cos(a + da) * 5, hk.y + Math.sin(a + da) * 5); g.stroke(); }
    g.restore();
  }
}
