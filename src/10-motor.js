/* CHICOTES DO DESTINO — 10-motor.js: utilidades, RNG com semente, save (IndexedDB) e áudio (WebAudio). */
(function () {
  'use strict';
  var U = {};
  U.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  U.lerp = function (a, b, t) { return a + (b - a) * t; };
  U.dist = function (x1, y1, x2, y2) { var dx = x2 - x1, dy = y2 - y1; return Math.sqrt(dx * dx + dy * dy); };
  U.anguloPara = function (x1, y1, x2, y2) { return Math.atan2(y2 - y1, x2 - x1); };
  U.hashStr = function (s) { var h = 2166136261 >>> 0; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  U.criarRNG = function (seed) {
    var x = (typeof seed === 'string' ? U.hashStr(seed) : seed >>> 0) || 123456789;
    function next() { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }
    return {
      next: next,
      faixa: function (a, b) { return a + next() * (b - a); },
      int: function (a, b) { return Math.floor(a + next() * (b - a + 1)); },
      chance: function (p) { return next() < p; },
      escolher: function (arr) { return arr[Math.floor(next() * arr.length)]; }
    };
  };
  // ruído de valor 1D suave (relevo)
  U.ruido1D = function (rng, n, amp) {
    var pontos = [], i; for (i = 0; i <= n; i++) pontos.push(rng.next());
    return function (t) {
      var x = t * n, i = Math.min(n - 1, Math.floor(x)), f = x - i;
      var u = f * f * (3 - 2 * f);
      return (U.lerp(pontos[i], pontos[i + 1], u) - 0.5) * 2 * amp;
    };
  };
  U.u8ParaBase64 = function (u8) {
    var partes = [], i, tam = 32768;
    for (i = 0; i < u8.length; i += tam) partes.push(String.fromCharCode.apply(null, u8.subarray(i, i + tam)));
    return btoa(partes.join(''));
  };
  U.base64ParaU8 = function (b64) {
    var bin = atob(b64), u8 = new Uint8Array(bin.length), i;
    for (i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8;
  };
  U.rleCodificar = function (u8) {
    var saida = [], i = 0;
    while (i < u8.length) {
      var v = u8[i], n = 1;
      while (i + n < u8.length && u8[i + n] === v && n < 255) n++;
      saida.push(n, v); i += n;
    }
    return new Uint8Array(saida);
  };
  U.rleDecodificar = function (u8, tamanho) {
    var saida = new Uint8Array(tamanho), pos = 0, i;
    for (i = 0; i + 1 < u8.length && pos < tamanho; i += 2) {
      var n = u8[i], v = u8[i + 1];
      while (n-- > 0 && pos < tamanho) saida[pos++] = v;
    }
    return saida;
  };
  U.u8ParaBase64RLE = function (u8) { return U.u8ParaBase64(U.rleCodificar(u8)); };
  U.baixarArquivo = function (nome, conteudo, mime) {
    var blob = new Blob([conteudo], { type: mime || 'application/json' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 400);
  };
  U.fmtNum = function (n) { return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
  window.U = U;

  // ---------------------------------------------------------------- save: IndexedDB (mundos) + LocalStorage (perfil/conquistas)
  var Save = {
    db: null,
    abrir: function () {
      return new Promise(function (resolve) {
        if (Save.db) return resolve(Save.db);
        if (!window.indexedDB) return resolve(null);
        var req = indexedDB.open('chicotes-do-destino', 1);
        req.onupgradeneeded = function () { req.result.createObjectStore('mundos', { keyPath: 'id' }); };
        req.onsuccess = function () { Save.db = req.result; resolve(Save.db); };
        req.onerror = function () { resolve(null); };
      });
    },
    _fallback: function () { try { return JSON.parse(localStorage.getItem('cdd_mundos_fallback') || '[]'); } catch (e) { return []; } },
    _fallbackSalvar: function (lista) { try { localStorage.setItem('cdd_mundos_fallback', JSON.stringify(lista)); } catch (e) {} },
    listarMundos: function () {
      return Save.abrir().then(function (db) {
        if (!db) return Save._fallback();
        return new Promise(function (res) {
          var saida = [], tx = db.transaction('mundos', 'readonly').objectStore('mundos');
          tx.openCursor().onsuccess = function (e) { var c = e.target.result; if (c) { saida.push(c.value); c.continue(); } else res(saida); };
        });
      });
    },
    salvarMundo: function (m) {
      return Save.abrir().then(function (db) {
        if (!db) { var l = Save._fallback().filter(function (x) { return x.id !== m.id; }); l.push(m); Save._fallbackSalvar(l); return; }
        return new Promise(function (res) { var rq = db.transaction('mundos', 'readwrite').objectStore('mundos').put(m); rq.onsuccess = function () { res(); }; rq.onerror = function () { res(); }; });
      });
    },
    apagarMundo: function (id) {
      return Save.abrir().then(function (db) {
        if (!db) { Save._fallbackSalvar(Save._fallback().filter(function (x) { return x.id !== id; })); return; }
        return new Promise(function (res) { var rq = db.transaction('mundos', 'readwrite').objectStore('mundos').delete(id); rq.onsuccess = function () { res(); }; rq.onerror = function () { res(); }; });
      });
    },
    carregarMundo: function (id) {
      return Save.abrir().then(function (db) {
        if (!db) return Save._fallback().find(function (x) { return x.id === id; }) || null;
        return new Promise(function (res) { var rq = db.transaction('mundos', 'readonly').objectStore('mundos').get(id); rq.onsuccess = function () { res(rq.result || null); }; rq.onerror = function () { res(null); }; });
      });
    },
    perfil: function () {
      var p; try { p = JSON.parse(localStorage.getItem('cdd_perfil') || 'null'); } catch (e) { p = null; }
      if (!p) p = { conquistas: [], config: { volume: 0.7, musica: true, som: true, tremor: 1, faisca: true, fonteGrande: false, toque: true }, statsMundos: { mundosCriados: 0, salvamentos: 0, exportacoes: 0, importacoes: 0 }, ultimoMundo: null };
      return p;
    },
    salvarPerfil: function (p) { try { localStorage.setItem('cdd_perfil', JSON.stringify(p)); } catch (e) {} }
  };
  window.Save = Save;

  // ---------------------------------------------------------------- áudio: efeitos WebAudio + música gerada em loop
  var AudioJogo = {
    ctx: null, master: null, musicaTimer: null, passoMusica: 0,
    init: function () {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain(); this.master.gain.value = Save.perfil().config.volume;
        this.master.connect(this.ctx.destination);
      } catch (e) { this.ctx = null; }
    },
    _ok: function () { var c = Save.perfil().config; return this.ctx && c.som; },
    _osc: function (freq, dur, tipo, vol, deslize) {
      if (!this._ok()) return; var t = this.ctx.currentTime;
      var o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = tipo || 'square'; o.frequency.setValueAtTime(freq, t);
      if (deslize) o.frequency.exponentialRampToValueAtTime(Math.max(20, deslize), t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
    },
    _ruido: function (dur, vol, freqFiltro, q) {
      if (!this._ok()) return; var t = this.ctx.currentTime;
      var len = Math.max(1, (this.ctx.sampleRate * dur) | 0);
      var buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      var fonte = this.ctx.createBufferSource(); fonte.buffer = buf;
      var f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freqFiltro || 2400; f.Q.value = q || 0.8;
      var g = this.ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      fonte.connect(f); f.connect(g); g.connect(this.master); fonte.start(t);
    },
    estalo: function (forte) { this._ruido(forte ? 0.16 : 0.09, forte ? 0.85 : 0.45, forte ? 3200 : 2200, 0.6); if (forte) this._osc(1800, 0.08, 'square', 0.18, 400); },
    golpe: function () { this._ruido(0.07, 0.2, 1200, 1); },
    machucar: function () { this._osc(160, 0.15, 'sawtooth', 0.3, 60); },
    pular: function () { this._osc(300, 0.09, 'square', 0.12, 520); },
    minerar: function () { this._ruido(0.05, 0.25, 900, 2); },
    pegar: function () { this._osc(660, 0.06, 'square', 0.15, 990); },
    moeda: function () { this._osc(990, 0.05, 'square', 0.12); var s = this; setTimeout(function () { s._osc(1320, 0.09, 'square', 0.12); }, 50); },
    criar: function () { var s = this; [523, 659, 784].forEach(function (f, i) { setTimeout(function () { s._osc(f, 0.1, 'triangle', 0.18); }, i * 70); }); },
    conquista: function () { var s = this; [587, 740, 880, 1174].forEach(function (f, i) { setTimeout(function () { s._osc(f, 0.14, 'triangle', 0.2); }, i * 90); }); },
    rugido: function () { this._osc(90, 0.7, 'sawtooth', 0.5, 40); this._ruido(0.6, 0.4, 300, 0.7); },
    ganchoSom: function () { this._ruido(0.08, 0.3, 1600, 1.5); this._osc(500, 0.08, 'triangle', 0.15, 900); },
    giro: function () { this._ruido(0.3, 0.35, 700, 1); },
    clicar: function () { this._osc(440, 0.05, 'square', 0.1, 620); },
    musica: function (ligar) {
      var cfg = Save.perfil().config;
      if (!ligar || !cfg.musica || !cfg.som) { if (this.musicaTimer) { clearInterval(this.musicaTimer); this.musicaTimer = null; } return; }
      if (!this.ctx || this.musicaTimer) return;
      var s = this, escala = [261.6, 293.7, 329.6, 392, 440, 523.3, 587.3, 659.3];
      var melodia = [0, 2, 4, 2, 5, 4, 2, 1, 0, 2, 4, 7, 5, 4, 2, -1, 0, 2, 4, 2, 5, 4, 2, 1, 2, 1, 0, -1, 0, -1, -1, -1];
      var baixo = [130.8, 0, 196, 0, 174.6, 0, 196, 0];
      this.musicaTimer = setInterval(function () {
        if (!s._ok() || !Save.perfil().config.musica) return;
        var i = s.passoMusica % 32, nota = melodia[i];
        if (nota >= 0) s._osc(escala[nota % 8] * (nota >= 8 ? 2 : 1), 0.22, 'triangle', 0.05);
        if (i % 4 === 0 && baixo[(i / 4) % 8]) s._osc(baixo[(i / 4) % 8], 0.4, 'sine', 0.055);
        s.passoMusica++;
      }, 230);
    }
  };
  window.AudioJogo = AudioJogo;

  // ---------------------------------------------------------------- ícones desenhados por código (semente por item)
  var cacheIcones = {};
  window.desenharIcone = function (ctx, item, x, y, tam) {
    if (!item) return;
    var cor = item.cor || '#ccc', s = tam;
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = Math.max(1, s / 18);
    function ret(rx, ry, rw, rh, c) { ctx.fillStyle = c; ctx.fillRect(rx, ry, rw, rh); }
    function linha(x1, y1, x2, y2, c, w) { ctx.strokeStyle = c; ctx.lineWidth = w || Math.max(1.5, s / 11); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
    var tipo = item.tipo;
    if (tipo === 'chicote') {
      var w = item.chicote, rnd = U.criarRNG(w ? w.numero * 97 : 7);
      linha(s * 0.15, s * 0.85, s * 0.4, s * 0.6, '#6e4a26', s / 7); // cabo
      ctx.strokeStyle = cor; ctx.lineWidth = Math.max(2, s / 10); ctx.beginPath();
      ctx.moveTo(s * 0.4, s * 0.6);
      ctx.bezierCurveTo(s * (0.7 + rnd.faixa(-.08, .08)), s * 0.55, s * 0.35, s * 0.28, s * 0.75, s * (0.2 + rnd.faixa(0, .12)));
      ctx.stroke();
      ctx.fillStyle = '#fff7c9'; ctx.beginPath(); ctx.arc(s * 0.75, s * 0.22, s / 14, 0, 7); ctx.fill(); // estalo
      if (w && w.par) { ctx.strokeStyle = cor; ctx.globalAlpha = 0.75; ctx.beginPath(); ctx.moveTo(s * 0.3, s * 0.7); ctx.bezierCurveTo(s * 0.55, s * 0.75, s * 0.4, s * 0.45, s * 0.62, s * 0.35); ctx.stroke(); ctx.globalAlpha = 1; }
    } else if (tipo === 'picareta') {
      linha(s * 0.25, s * 0.85, s * 0.65, s * 0.45, '#6e4a26', s / 8);
      ctx.strokeStyle = cor; ctx.lineWidth = s / 6; ctx.beginPath(); ctx.moveTo(s * 0.15, s * 0.2); ctx.quadraticCurveTo(s * 0.6, s * 0.05, s * 0.88, s * 0.4); ctx.stroke();
    } else if (tipo === 'minerio') {
      ret(s * .12, s * .2, s * .76, s * .62, '#6f6f78'); ret(s * .25, s * .35, s * .18, s * .16, cor); ret(s * .55, s * .5, s * .2, s * .18, cor); ret(s * .4, s * .27, s * .12, s * .1, cor);
    } else if (tipo === 'barra') {
      ret(s * .15, s * .5, s * .7, s * .22, cor); ret(s * .24, s * .3, s * .5, s * .18, cor); ret(s * .22, s * .54, s * .56, s * .06, 'rgba(255,255,255,.55)');
    } else if (tipo === 'armadura') {
      ret(s * .25, s * .2, s * .5, s * .55, cor); ret(s * .15, s * .25, s * .15, s * .35, cor); ret(s * .7, s * .25, s * .15, s * .35, cor); ret(s * .4, s * .3, s * .2, s * .14, 'rgba(0,0,0,.35)');
    } else if (tipo === 'acessorio') {
      ctx.strokeStyle = cor; ctx.lineWidth = s / 9; ctx.beginPath(); ctx.arc(s / 2, s * .6, s * .26, 0, 7); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(s / 2, s * .12); ctx.lineTo(s * .62, s * .3); ctx.lineTo(s * .38, s * .3); ctx.closePath(); ctx.fill();
    } else if (tipo === 'bloco') {
      ret(s * .14, s * .14, s * .72, s * .72, cor); ret(s * .14, s * .14, s * .72, s * .12, 'rgba(255,255,255,.35)'); ret(s * .14, s * .74, s * .72, s * .12, 'rgba(0,0,0,.3)');
    } else if (tipo === 'pocao') {
      ret(s * .42, s * .1, s * .16, s * .2, '#c9a86a'); ctx.fillStyle = cor; ctx.beginPath(); ctx.arc(s / 2, s * .62, s * .27, 0, 7); ctx.fill(); ret(s * .38, s * .48, s * .1, s * .18, 'rgba(255,255,255,.6)');
    } else if (tipo === 'invocador') {
      ret(s * .22, s * .15, s * .56, s * .7, '#efe3c0'); ret(s * .3, s * .28, s * .4, s * .42, cor); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(s * .44, s * .45, s / 16, 0, 7); ctx.arc(s * .56, s * .45, s / 16, 0, 7); ctx.fill();
    } else if (tipo === 'especial') {
      ret(s * .18, s * .3, s * .64, s * .45, cor); ret(s * .18, s * .22, s * .64, s * .12, 'rgba(255,255,255,.4)'); ret(s * .44, s * .45, s * .12, s * .2, '#333');
    } else { // material
      ctx.fillStyle = cor; ctx.beginPath(); ctx.arc(s / 2, s / 2, s * .3, 0, 7); ctx.fill(); ret(s * .38, s * .34, s * .12, s * .1, 'rgba(255,255,255,.6)');
    }
    ctx.restore();
  };
  window.iconeDataURL = function (item) {
    if (!item) return '';
    if (cacheIcones[item.id]) return cacheIcones[item.id];
    var c = document.createElement('canvas'); c.width = 48; c.height = 48;
    window.desenharIcone(c.getContext('2d'), item, 0, 0, 48);
    return (cacheIcones[item.id] = c.toDataURL());
  };
})();
