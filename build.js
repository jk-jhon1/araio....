#!/usr/bin/env node
/* build.js — gera o index.html ÚNICO a partir de src/*.js (prefixo numérico = ordem de concatenação).
 * Sem dependências: rodar `node build.js` é o bastante; abrir index.html como arquivo funciona offline.
 * Também valida as tabelas (200/94/433/628/429) e exporta docs/dados-jogo.json + CSVs.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = __dirname;
const srcDir = path.join(root, 'src');
const docsDir = path.join(root, 'docs');
fs.mkdirSync(docsDir, { recursive: true });

const jsFiles = fs.readdirSync(srcDir).filter(f => f.endsWith('.js')).sort();
if (!jsFiles.length) { console.error('Nenhum src/*.js encontrado.'); process.exit(1); }

// 1) validação de sintaxe de cada módulo
for (const f of jsFiles) {
  const code = fs.readFileSync(path.join(srcDir, f), 'utf8');
  new vm.Script(code, { filename: f });
}

// 2) validação das tabelas (critérios de aceite quantitativos)
const ctx = vm.createContext({ console });
vm.runInContext(fs.readFileSync(path.join(srcDir, '00-dados.js'), 'utf8'), ctx);
const D = ctx.GAME_DATA;
const erros = D.validar();
console.log('Contagens:', D.CONTAGENS);
if (erros.length) {
  console.error('FALHA nas tabelas:\n - ' + erros.join('\n - '));
  process.exit(1);
}
console.log('✔ tabelas validadas (200 chicotes, 94 chefes, 433 receitas, 628 itens, 429 conquistas)');

// 3) exportar tabelas (JSON + CSV) — os dados ficam em tabelas simples, exportáveis
const exportavel = {
  jogo: 'Chicotes do Destino', versao: 1,
  contagens: D.CONTAGENS,
  tiers: D.TIERS, chicotes: D.WHIPS,
  chefes: D.BOSSES, atos: D.ATOS,
  itens: D.ITEMS.map(i => ({ id: i.id, nome: i.nome, tipo: i.tipo, cor: i.cor, descricao: i.descricao })),
  receitas: D.RECIPES, conquistas: D.ACHIEVEMENTS
};
fs.writeFileSync(path.join(docsDir, 'dados-jogo.json'), JSON.stringify(exportavel, null, 1));

function csvCell(v) { v = String(v == null ? '' : v); return /[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
function csv(file, headers, rows) {
  const lines = [headers.join(';')].concat(rows.map(r => r.map(csvCell).join(';')));
  fs.writeFileSync(path.join(docsDir, file), '﻿' + lines.join('\n') + '\n', 'utf8'); // BOM p/ Excel ler acentos
}
csv('chicotes.csv',
  ['numero', 'nome', 'tier', 'nomeTier', 'danoBase', 'danoPonta', 'danoEstalo', 'alcanceBlocos', 'alvos', 'segmentos', 'par', 'efeito', 'origem', 'chefeGuarda'],
  D.WHIPS.map(w => [w.numero, w.nome, w.tier, w.nomeTier, w.danoBase, w.danoPonta, w.danoEstalo, String(w.alcanceBlocos).replace('.', ','), w.alvos, w.segmentos, w.par ? 'sim' : 'não', w.efeitoNome, w.origem, w.chefeGuarda || '']));
csv('chefes.csv',
  ['indice', 'nome', 'ato', 'vida', 'danoContato', 'fases', 'mecanica', 'chicoteGuardado', 'acessorioExclusivo'],
  D.BOSSES.map(b => [b.indice, b.nome, b.ato, b.hp, b.danoContato, b.fases, b.mecanica, b.chicoteGuardado || '', b.acessorioExclusivo || '']));
csv('conquistas.csv',
  ['id', 'categoria', 'nome', 'descricao', 'raridade', 'secreta'],
  D.ACHIEVEMENTS.map(a => [a.id, a.categoria, a.secreta ? '(secreta)' : a.nome, a.secreta ? '(???)' : a.descricao, a.raridade, a.secreta ? 'sim' : 'não']));
console.log('✔ exportado docs/dados-jogo.json + chicotes.csv + chefes.csv + conquistas.csv');

// 4) montar o arquivo único
const template = fs.readFileSync(path.join(srcDir, 'index.template.html'), 'utf8');
const css = fs.readFileSync(path.join(srcDir, 'style.css'), 'utf8');
const scripts = jsFiles.map(f =>
  '\n/* ===== ' + f + ' ===== */\n' + fs.readFileSync(path.join(srcDir, f), 'utf8')
).join('\n');

if (/<\/script>/i.test(scripts)) { console.error('ATENÇÃO: algum src/*.js contém "</script>" — isso quebraria o arquivo único.'); process.exit(1); }
const out = template.replace('/*__CSS__*/', () => css).replace('/*__SCRIPTS__*/', () => scripts);
if (!out.includes('Chicotes do Destino')) { console.error('Template inesperado.'); process.exit(1); }
fs.writeFileSync(path.join(root, 'index.html'), out);
console.log('✔ index.html gerado (' + Math.round(out.length / 1024) + ' KB, ' + jsFiles.length + ' módulos: ' + jsFiles.join(', ') + ')');
console.log('  Abra index.html direto no navegador, ou sirva com: node serve.js');
