# Chicotes do Destino — especificação × implementação

Resumo do documento [`chicotes_do_destino_prompt.pdf`](chicotes_do_destino_prompt.pdf)
(13 páginas) e de como cada parte foi implementada neste repositório.

## Critérios de aceite (Parte 11)

| # | Critério | Como verificar aqui | Status |
|---|---|---|---|
| 1 | 200 chicotes em 10 tiers, 20 por tier, nenhum nome repetido | `node tools/verificar.js` · painel Arsenal · `docs/chicotes.csv` | ✅ |
| 2 | As 7 mecânicas em todos (alcance, ponta, multi-alvo, giro, gancho, par T5+, corda) | jogando (testes da Parte 2) — `src/30-combate.js` | ✅ |
| 3 | 94 chefes, mecânica inédita em cada | `docs/chefes.csv` (coluna *mecanica* é única por chefe) · painel Chefes | ✅ |
| 4 | 40 chicotes T9–T10 saindo de 40 chefes | Ato V (20→T9) e Ato VI (19→T10 + final→Apoteose) — ver `chefeGuarda` em `src/00-dados.js` | ✅ |
| 5 | Apoteose só após 94/94 | com 93/94 o item `chicote_200` não existe (sem receita, sem drop); o drop sai do chefe nº 94 | ✅ |
| 6 | 429 conquistas, 12 mascaradas | painel Conquistas: segredos como `???` (nome, descrição, raridade e contador escondidos) | ✅ |
| 7 | 628 itens e 433 receitas | `docs/dados-jogo.json` · paineis Inventário/Criação | ✅ |
| 8 | Save, exportar/importar mundos | IndexedDB + miniaturas em "Meus Mundos"; exportar gera `.json` com o mundo inteiro | ✅ |
| 9 | Teclado, controle e toque | painel Controles; gamepad com mira analógica e toque com mira por arrasto | ✅ |
| 10 | Um único `index.html`, 60 fps | abrir como arquivo (offline); canvas 960×540 com zoom inteiro e só tiles visíveis | ✅ |

## Fórmula de dano (Parte 6) — implementada ao pé da letra

```
dano(t)  = Base_tier × (0,60 + 1,00 × t)   // t = 0 no cabo, 1 na ponta
estalo   = se t > 0,90 → dano × 1,60        // últimos 10% da corda (2,56× no total)
alvos    = 3 + floor(tier / 2)               // T1 = 3 … T10 = 8
queda    = −15% por alvo extra
alcance  = 3,2 + 0,1 × tier (blocos)         // T1 = 3,3 … T10 = 4,2
```

Bases por tier: 12, 20, 32, 48, 70, 100, 145, 200, 270, 360.
A curva é determinística: a posição da colisão na corda decide o
multiplicador — o número na tela muda de cor (branco → ponta dourada →
estalo na cor do tier, com tremor curto de câmera e som agudo).

## Notas de adaptação (fiéis à frase-guia)

- **Música**: a especificação original previa MP3 solto em `docs/`. Para
  manter o "um único arquivo, offline", a trilha é **sintetizada em tempo
  real via WebAudio** (melodia + baixo em loop), junto dos efeitos. O
  `serve.js` mantém MIME de MP3/PDF e suporte a Range (206) exatamente
  como pedido, caso você adicione arquivos de áudio próprios em `docs/`.
- **Módulos**: a especificação fala em 51 módulos no jogo de origem; aqui
  o mesmo princípio foi seguido com módulos numerados por sistema
  (`00-dados`, `10-motor`, `20-mundo`, `30-combate`, `40-interface`,
  `50-jogo`), concatenados pelo `node build.js` no `index.html` único.
- **Conjunto de armadura**: a especificação cita 1 slot de armadura e
  bônus de 2/4 peças — aqui as peças contam armadura + acessórios
  equipados (2 peças: +2 defesa; 4 peças: +5 defesa e +5% de dano).
- **Estações de criação**: Bancada, Forja, Bigorna e Mesa de Poções já
  vêm com a vila (itens em `Especial` no inventário); a **Forja Celeste**
  vende na loja da Rita. Cada receita mostra e exige sua estação.
- **Tutorial**: nenhum texto de tutorial na tela do mundo — dicas vivem
  nos balões dos NPCs (Guia Tomás, Rita e Ferreira Bruna) e na interface,
  como pede a Parte 10.

## Onde fica cada sistema

| Parte da especificação | Código |
|---|---|
| 2 · As 7 mecânicas | `src/30-combate.js` (golpe/giro/gancho/corda viva) |
| 3 · Stack (arquivo único, save, áudio, servidor) | `build.js`, `serve.js`, `src/10-motor.js` |
| 4–7 · Conteúdo, tiers, curva, nomes | `src/00-dados.js` (+ `GAME_DATA.validar()`) |
| 4 · Mundo 1400×480 com semente | `src/20-mundo.js` |
| 8 · Chefes 4 + 90 em 6 atos | `src/00-dados.js`, comportamento em `src/30-combate.js` |
| 9 · Conquistas 429 + 12 segredos | `src/00-dados.js`, avaliação em `src/30-combate.js`, painel em `src/40-interface.js` |
| 10 · Interface, controles, acessibilidade | `src/40-interface.js`, `src/style.css`, entrada em `src/50-jogo.js` |
| 11 · Aceite automatizável | `tools/verificar.js` |
