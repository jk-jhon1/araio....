#!/usr/bin/env node
/* Verificação dos critérios de aceite que dependem das tabelas.
 * Uso: node tools/verificar.js
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ctx = vm.createContext({ console });
const code = fs.readFileSync(path.join(__dirname, '../src/00-dados.js'), 'utf8');
vm.runInContext(code, ctx);
const D = ctx.GAME_DATA;

let falhas = 0;
function ok(cond, msg) {
  console.log((cond ? '  ✔ ' : '  ✘ ') + msg);
  if (!cond) falhas++;
}
console.log('Contagens:', JSON.stringify(D.CONTAGENS));
const erros = D.validar();
ok(erros.length === 0, 'GAME_DATA.validar() sem erros ' + (erros.length ? '(' + erros.join('; ') + ')' : ''));

ok(D.WHIPS.length === 200, '200 chicotes');
ok(new Set(D.WHIPS.map(w => w.nome)).size === 200, 'nenhum nome de chicote repetido');
ok(D.ITEMS.length === 628, '628 itens');
ok(D.RECIPES.length === 433, '433 receitas');
ok(D.ACHIEVEMENTS.length === 429, '429 conquistas');
ok(D.ACHIEVEMENTS.filter(a => a.secreta).length === 12, '12 conquistas secretas');
ok(new Set(D.ACHIEVEMENTS.map(a => a.categoria)).size === 10, '10 categorias de conquista');
ok(D.BOSSES.length === 94, '94 chefes');
ok(new Set(D.BOSSES.map(b => b.mecanicaId)).size === 94, 'mecânica inédita por chefe');
ok(D.BOSSES.filter(b => b.chicoteGuardado).length === 40, '40 chefes guardam os T9–T10');
ok(D.WHIPS[199].nome === 'Apoteose', 'o 200º chicote é a Apoteose');
ok(D.WHIPS.every(w => w.alcanceBlocos === Math.round((3.2 + 0.1 * w.tier) * 10) / 10), 'alcance 3,2 + 0,1×tier em todos');
ok(D.WHIPS.every(w => w.alvos === 3 + Math.floor(w.tier / 2)), 'alvos = 3 + floor(tier/2) em todos');
ok(D.WHIPS.every(w => (w.tier >= 5) === w.par), 'par somente a partir do Tier 5');
ok(D.FORMULA.dano(100, 1) === 160 && D.FORMULA.dano(100, 0) === 60, 'curva de dano 0,6× → 1,6×');
ok(D.RECIPES.every(r => D.ITEM_BY_ID[r.resultado]), 'toda receita produz um item do catálogo');
ok(D.RECIPES.every(r => r.ingredientes.every(i => D.ITEM_BY_ID[i.item])), 'todo ingrediente existe no catálogo');
ok(!D.RECIPES.some(r => D.ITEM_BY_ID[r.resultado].tipo === 'chicote' && D.ITEM_BY_ID[r.resultado].chicote.tier >= 9), 'T9–T10 não são forjáveis');

const indexPath = path.join(__dirname, '../index.html');
if (fs.existsSync(indexPath)) {
  const html = fs.readFileSync(indexPath, 'utf8');
  ok(!/https?:\/\//.test(html.replace(/https:\/\/github\.com[^\s"']*/g, '')), 'index.html sem dependências externas (offline)');
  ok(html.includes('Chicotes do Destino'), 'index.html construido');
} else {
  console.log('  ⚠ index.html ainda não construído (rode: node build.js)');
}

if (falhas) { console.error('\nFALHOU: ' + falhas + ' verificações.'); process.exit(1); }
console.log('\nTodas as verificações das tabelas passaram.');
