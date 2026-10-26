# TRANSFORMACAO.md — de "Espadas do Destino" (101spas) para "Chicotes do Destino"

Este repositório é o jogo [**101spas — Espadas do Destino**](https://github.com/jk-jhon1/101spas)
com a troca de arma definida no prompt [`docs/chicotes_do_destino_prompt.pdf`](docs/chicotes_do_destino_prompt.pdf):
**só a arma muda; todo o resto permanece exatamente como está** — mesmo mundo (1400×480), mesmos
94 chefes, 433 receitas, 628 itens, 429 conquistas, mesmos 50 minérios/50 armaduras/50 acessórios/5
picaretas, mesmos sistemas de save (IndexedDB + LocalStorage), NPCs, controles e suíte de testes.

## Procedência (como foi feito)

1. A árvore completa do repositório `101spas` foi copiada para cá (menos o `.git` dele).
   Conferência de fidelidade: `node build.js` no material recém-copiado reproduziu o `index.html`
   do 101spas **byte a byte** (md5 `04c0792482bd4d42f64d548b1224d977`) e toda a suíte Node original passou.
2. Sobre essa base, aplicou-se apenas a transformação espada → chicote descrita abaixo.
   Identificadores internos (`type:'sword'`, `SWORDS`, ids `s001`–`s200`, campo `swordName`) foram
   **mantidos de propósito**: é a mesma arma por baixo (mesmos atributos, FX, receitas e drops),
   então nada do restante do jogo precisa mudar para continuar coerente.

## O que mudou (só a arma)

| Área | Mudança |
|---|---|
| **Nomes** | Os 200 nomes viraram chicotes em português, preservando o tema/material de cada peça original (`src/11_swords.js`, `src/11b_swords_x.js`). Âncoras do prompt: #001 Chicote Trançado, #021 Chicote de Cravos, #041 Chicote de Corrente, #061 Chicote Serrilhado, #081 Par de Gêmeos, #101 Chicote do Eclipse, #121 Chicote Forja Estelar, #141 Chicote do Relicário, #161 Chicote Eco Primordial, #181 Chicote da Origem, #200 Apoteose. Atributos (dano/vel/KB/crit/FX/receita/estação/drop) **idênticos** aos do 101spas. |
| **Alcance** | `whipReachOf()` em `src/09b_swing.js`: (3,2 + 0,1 × tier) tiles (T1 3,3 → T10 4,2), no lugar do comprimento da lâmina. |
| **Curva de dano** | `swingHit` projeta o impacto ao longo da corda (t: 0 = mão, 1 = ponta): dano = Base × (0,60 + 1,00t) × 0,85ⁿ (n = alvo extra). **Estalo** (t > 0,90): crítico determinístico ×1,60 (2,56× na ponta), número na cor do tier, faísca, tremida e som `crack`. Golpes de corda são determinísticos (`noVar`, sem o sorteio ±5%). |
| **Alvos por golpe** | teto de 3 + ⌊tier/2⌋ (T1 3 → T10 8) por varredura. |
| **Giro 360°** | novo `src/09c_whip.js`: segurar o ataque por 0,45 s+ e soltar gira a corda por 1,2 s (2 voltas), acertando ao redor a cada 0,12 s com t=0,9 (×1,5, sem estalo) e empurrão dobrado. O auto-swing ao segurar continua igual ao 101spas. |
| **Gancho** | `F` / botão do meio / Select no gamepad / ⚓ no toque: a corda voa até 2× o alcance; fisgar bloco puxa o jogador (sem dano de queda; `Espaço` solta com impulso); tocar um drop pesca o drop de volta. Tipos de bloco por tier (1..10): madeira/folhas, terra/areia, pedra/minérios, tijolo/osso, metal, pedra rúnica, pedra estelar, relíquias, blocos de luz — tier maior fisga todos os anteriores; bloco acima do tier **escorrega**. |
| **Par (Tier 5+)** | cada ataque lança o segundo chicote em sentido oposto, 0,13 s depois, com 70% do dano (`src/12_player.js`). |
| **Arte** | `getSwordSprite` (`src/06_icons.js`) agora pinta a corda trançada de cada arma (mesmas cor/brilho/`look.len` do original, seed pelo número), com o estilo visual do tier: couro (T1), cravos (T2), elos de corrente (T3), osso serrilhado (T4), par (T5+), runas (T6), faíscas de forja (T7), contas-relíquia (T8), eco de luz (T9) e brilho cósmico (T10). Durante o golpe, a corda é desenhada **no mundo** como curva segmentada que atrasa atrás do braço (`drawWhipRopes`, junto de `drawSwingTrail`). |
| **Textos** | título, menu, catálogo ("Catálogo dos 200 Chicotes"), aba de criação, categoria de conquistas ("Chicotes"), descrições de itens/estações, dicas, ajuda e falas do Guia falam de chicotes. Os **chefes não foram renomeados** (só a arma muda) — inclusive o chefe "Espada do Autor", que agora guarda o Chicote do Autor. |
| **Saves** | chaves próprias para não colidir com o 101spas quando os dois rodam no mesmo site: banco `chicotes200`, `chicotes200_*`, conquistas `whips_destiny_ach_v1`, arquivos de mundo no formato `chicotes-do-destino/mundo` (`*.chicotes`). |
| **Acessibilidade** | novo botão na pausa: **Tremida de câmera** ligada/desligada (salvo no aparelho). |
| **Docs gerados** | `docs/catalogo_200_chicotes.{md,csv}` (era `..._espadas`), `docs/conquistas.md` e `docs/chefes_novos.md` regenerados a partir dos dados. `dev/validate.js`, `dev/transfer.js` e `dev/reach.js` acompanham os novos nomes/formatos. |

## Decisões e desvios conscientes

- **Números das armas são os do 101spas** (o prompt pede "exatamente os mesmos números da tabela");
  onde o PDF-resumo divergia da tabela real do jogo (ex.: dano típico do T10), vale o 101spas.
- **Selo final**: no 101spas, quem só cai depois de todos os chefes é a arma **#190 Axioma**
  (`sealedAll`), guardada pelo chefe Axioma; mantido igual (o PDF descrevia o selo na #200).
- **Conquistas secretas**: mantidas as 12 do 101spas (chefes/gerais), mascaradas com "???" como já
  eram; os eventos de chicote são registrados em estatísticas (`estalo`, `giro`, `giro5`, `pesca`)
  sem alterar a contagem de 429.
- **Balanceamento**: o corpo a corpo fica mais forte perto da ponta por regra do prompt
  (até 2,56× no estalo) — é a habilidade substituindo o crítico por sorte; projéteis e FX das
  armas não mudaram.
- **Material herdado**: `docs/guia_do_jogo.pdf`, `docs/img/` (logo e capturas) e os geradores
  `dev/guia/`, `dev/pdf/` são do jogo-base (mostram espadas) e foram mantidos como referência —
  apenas os caminhos do catálogo foram atualizados. A arte *pixel a pixel* de lâminas
  (`src/06b_swordart.js`) continua no projeto para projéteis/efeitos que a referenciam, mas os
  sprites das armas (ícone e mão) são os chicotes de `src/06_icons.js`.

## Testes

- Suíte Node original, sem regressões: `npm test` (validate, reach, seeds, layouts, transfer,
  test_ach, test_gear) — mais **`node dev/test_whip.js`** (novo; já incluído em `npm test`):
  22 verificações das mecânicas do chicote (alcance, curva, estalo, teto de alvos, falloff,
  giro, gancho por tier, pesca de drops e par do Tier 5+).
- A suíte de navegador (`npm run test:browser`, Playwright) é a do 101spas e exige Chromium;
  as verificações de balanceamento de DPS dela foram escritas para as espadas e podem precisar
  de ajuste de faixas para a curva do chicote.
