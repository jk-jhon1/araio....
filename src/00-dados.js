/* CHICOTES DO DESTINO — 00-dados.js
 * Todas as tabelas do jogo. Números fechados da especificação:
 * 200 chicotes · 94 chefes · 433 receitas · 628 itens · 429 conquistas
 * 50 minérios · 50 barras · 50 armaduras · 50 acessórios · 5 picaretas
 * Este módulo não usa DOM: pode ser avaliado em Node (tools/verificar.js).
 */
(function (global) {
  'use strict';

  // ------------------------------------------------------------------ tiers
  var TIERS = [
    { n: 1,  nome: 'Básico',             cor: '#d9903f', base: 12,  mult: [1.0, 1.2],  familia: 'Couro trançado; golpe físico direto, sangramento leve e iluminação.' },
    { n: 2,  nome: 'Pré-Chefes',         cor: '#59c135', base: 20,  mult: [1.3, 1.8],  familia: 'Cordas com nós e lâminas na ponta; repulsão, fogo e gelo.' },
    { n: 3,  nome: 'Mid-Game',           cor: '#3fa7d6', base: 32,  mult: [2.0, 2.8],  familia: 'Correntes; múltiplos estalos, feixes elementais e acerto contínuo.' },
    { n: 4,  nome: 'Hardmode Inicial',   cor: '#b05cd6', base: 48,  mult: [3.0, 4.2],  familia: 'Cravos de osso; onda de choque no relevo, estalagmites e aura.' },
    { n: 5,  nome: 'Hardmode Avançado',  cor: '#ef476f', base: 70,  mult: [4.5, 6.5],  familia: 'Primeiro par de chicotes; meteoros, lasers perfurantes e tempo.' },
    { n: 6,  nome: 'End-Game Mítico',    cor: '#ffd166', base: 100, mult: [7.0, 12.0], familia: 'Fios rúnicos; projéteis rastreadores, colapso estelar e portais.' },
    { n: 7,  nome: 'Forja Estelar',      cor: '#ffe95a', base: 145, mult: [14.0, 22.0], familia: 'Ecos do golpe, leques de lâminas, correntes elétricas e escudos vivos.' },
    { n: 8,  nome: 'Relicário do Vazio', cor: '#9b5de5', base: 200, mult: [22.0, 32.0], familia: 'Marcas que detonam, fendas devoradoras e almas perseguidoras.' },
    { n: 9,  nome: 'Eco Primordial',     cor: '#00f5d4', base: 270, mult: [33.0, 46.0], familia: 'Domínios divinos, feixes de julgamento e paradas no tempo.' },
    { n: 10, nome: 'Origem',             cor: '#ffffff', base: 360, mult: [46.0, 72.0], familia: 'Tela cheia, colapsos cósmicos, singularidades e big bang.' }
  ];

  // Fórmula oficial (Parte 6 da especificação)
  var FORMULA = {
    dano: function (base, t) { return base * (0.60 + 1.00 * t); },
    estaloMultiplicador: 1.60,                 // se t > 0,90
    alvos: function (tier) { return 3 + Math.floor(tier / 2); },
    quedaPorAlvoExtra: 0.85,                   // -15% por alvo extra
    alcanceBlocos: function (tier) { return 3.2 + 0.1 * tier; } // T1=3,3 … T10=4,2
  };

  // ------------------------------------------------------------------ itens
  var ITEMS = [];
  var ITEM_BY_ID = {};
  function addItem(id, nome, tipo, cor, descricao, extra) {
    var it = { id: id, nome: nome, tipo: tipo, cor: cor, descricao: descricao || '' };
    if (extra) for (var k in extra) it[k] = extra[k];
    ITEMS.push(it); ITEM_BY_ID[id] = it; return it;
  }

  // ------------------------------------------------------- 200 chicotes
  var FAMILIA_NOUNS = [
    ['de Couro', 'de Palha Grossa', 'de Cipó', 'de Sisal', 'de Linho'],
    ['de Cravos', 'de Nós de Ferro', 'de Espinhos', 'de Vidro Verde', 'de Cobre Torcido'],
    ['de Corrente', 'de Elos Duplos', 'de Malha de Aço', 'de Ganchos', 'de Argolas'],
    ['de Osso', 'de Cravos de Osso', 'de Garra', 'de Marfim', 'de Vértebras'],
    ['Gêmeo de Couro Fino', 'Gêmeo de Aço', 'Gêmeo Carmesim', 'Gêmeo de Prata', 'Gêmeo Sombrio'],
    ['de Fio Rúnico', 'de Fibra Lunar', 'de Linha do Eclipse', 'de Runa Viva', 'de Véu Negro'],
    ['de Estrela Fundida', 'de Brasa Estelar', 'de Fio Solar', 'de Cometa', 'de Aurora'],
    ['de Relíquias', 'de Olhos Fechados', 'de Corrente Vazia', 'de Almas Presas', 'de Ossos Antigos'],
    ['de Luz Antiga', 'de Eco Dourado', 'de Voz Primeira', 'de Aurora Primordial', 'de Tempo Preso'],
    ['da Origem', 'do Primeiro Estalo', 'do Fim do Fio', 'do Big Bang', 'do Nada']
  ];
  var FAMILIA_ADJ = [
    ['Cru', 'do Campo', 'do Viajante', 'Enrolado'],
    ['Afiado', 'Quente', 'Gelado', 'Pesado'],
    ['Longo', 'Sonoro', 'Brilhante', 'Sem Fim'],
    ['Serrilhado', 'Profundo', 'do Abismo', 'Vibrante'],
    ['Veloz', 'Espelhado', 'Dançante', 'Furioso'],
    ['Mítico', 'do Portal', 'Estrelado', 'Profético'],
    ['da Forja Alta', 'Dourado', 'Elétrico', 'Ecoante'],
    ['do Relicário', 'Devorador', 'Silencioso', 'Amaldiçoado'],
    ['Primordial', 'do Julgamento', 'Eterno', 'Divino'],
    ['Cósmico', 'Absoluto', 'da Singularidade', 'Final']
  ];
  var EXEMPLO_TIER = {
    1: 'Chicote Trançado', 2: 'Chicote de Cravos', 3: 'Chicote de Corrente',
    4: 'Chicote Serrilhado', 5: 'Par de Gêmeos', 6: 'Chicote do Eclipse',
    7: 'Chicote Forja Estelar', 8: 'Chicote do Relicário',
    9: 'Chicote Eco Primordial', 10: 'Chicote da Origem'
  };
  var EFEITOS_POR_TIER = [
    [['sangramento', 'Sangramento leve'], ['iluminacao', 'Ilumina ao estalar'], ['fisico', 'Golpe físico direto']],
    [['repulsao', 'Repulsão forte'], ['fogo', 'Queima o alvo'], ['gelo', 'Congela por instantes']],
    [['multi_estalo', 'Estalos múltiplos'], ['feixe', 'Feixe elemental na ponta'], ['continuo', 'Dano contínuo']],
    [['onda', 'Onda de choque no relevo'], ['estalagmite', 'Estalagmites no chão'], ['aura', 'Aura de espinhos']],
    [['meteoro', 'Chuva de meteoros'], ['laser', 'Rastro de laser perfurante'], ['tempo', 'Retarda os inimigos']],
    [['rastreador', 'Projetil rastreador'], ['colapso', 'Colapso estelar'], ['portal', 'Abre portais de faíscas']],
    [['eco', 'Eco do golpe'], ['leque', 'Leque de lâminas'], ['corrente_eletrica', 'Correntes elétricas']],
    [['marca', 'Marca que detona'], ['fenda', 'Fenda devoradora'], ['alma', 'Almas perseguidoras']],
    [['dominio', 'Domínio divino'], ['julgamento', 'Feixe de julgamento'], ['parada_tempo', 'Paradas no tempo']],
    [['tela_cheia', 'Explosão em tela cheia'], ['singularidade', 'Singularidade'], ['big_bang', 'Big bang']]
  ];
  var GANCHO_POR_TIER = ['madeira e folhas', 'terra e areia', 'pedra comum', 'tijolo e osso', 'metal forjado', 'pedra rúnica', 'pedra estelar', 'relíquias do vazio', 'luz solidificada', 'qualquer bloco'];

  var WHIPS = [];
  var nomesUsados = {};
  for (var tier = 1; tier <= 10; tier++) {
    var T = TIERS[tier - 1];
    for (var i = 0; i < 20; i++) {
      var numero = (tier - 1) * 20 + i + 1;
      var nome;
      if (i === 0) nome = EXEMPLO_TIER[tier];
      else if (numero === 200) nome = 'Apoteose';
      else {
        var substantivo = FAMILIA_NOUNS[tier - 1][i % 5];
        var adjetivo = FAMILIA_ADJ[tier - 1][Math.floor(i / 5)];
        nome = (tier >= 5 && i % 5 === 0 && tier === 5) ? ('Chicote ' + substantivo + ' ' + adjetivo)
                                                      : ('Chicote ' + substantivo + ' ' + adjetivo);
      }
      if (nomesUsados[nome]) nome = nome + ' Antigo';
      nomesUsados[nome] = true;
      var efeito = EFEITOS_POR_TIER[tier - 1][i % 3];
      var danoBase = Math.round(T.base * (0.90 + (i / 19) * 0.35));
      var w = {
        numero: numero, tier: tier, nomeTier: T.nome, corTier: T.cor,
        danoBase: danoBase,
        danoPonta: Math.round(danoBase * 1.6),
        danoEstalo: Math.round(danoBase * 2.56),
        alcanceBlocos: Math.round(FORMULA.alcanceBlocos(tier) * 10) / 10,
        alvos: FORMULA.alvos(tier),
        segmentos: Math.min(24, 11 + tier + (i % 4)),
        par: tier >= 5,
        efeito: efeito[0], efeitoNome: efeito[1],
        ganchoEm: GANCHO_POR_TIER[tier - 1],
        velocidade: Math.round((0.62 - tier * 0.018 - (i % 5) * 0.012) * 100) / 100, // s entre golpes
        empurrao: Math.round((3 + tier * 0.7 + (i % 4) * 0.5) * 10) / 10,
        origem: tier <= 6 ? 'Forjável na bancada' : (tier <= 8 ? 'Forjável com minério de chefe' : 'Cai do chefe que o guarda'),
        chefeGuarda: null
      };
      WUPS_PUSH(w);
      function WUPS_PUSH(x) { WHIPS.push(x); }
      addItem('chicote_' + numero, nome, 'chicote', T.cor,
        'Tier ' + tier + ' · ' + T.nome + '. Dano ' + danoBase + ' (ponta ' + w.danoPonta + ', estalo ' + w.danoEstalo + '), alcance ' + w.alcanceBlocos + ' blocos, até ' + w.alvos + ' alvos. ' + efeito[1] + '.' + (w.par ? ' Vem em par (2º com 70% do dano).' : ''),
        { chicote: w, empilhavel: false });
      w.itemId = 'chicote_' + numero; w.nome = nome;
    }
  }

  // ------------------------------------------------------- minérios e barras (50 + 50)
  var FAMILIAS_MINERIO = ['Cobre', 'Ferro', 'Prata', 'Ouro', 'Cobalto', 'Mitril', 'Adamantino', 'Lumenita', 'Vazita', 'Origênita'];
  var QUAL_M = ['', ' Puro', ' Brilhante', ' Antigo', ' Perfeito'];
  var QUAL_F = ['', ' Pura', ' Brilhante', ' Antiga', ' Perfeita'];
  var CORES_MINERIO = ['#c87333', '#a8a8a8', '#d9d9e3', '#ffd700', '#3f6fd8', '#62e6c9', '#e05656', '#ffe9a3', '#8d6bff', '#ffffff'];
  var ORES = [], BARS = [];
  FAMILIAS_MINERIO.forEach(function (fam, f) {
    QUAL_M.forEach(function (q, v) {
      var idx = f * 5 + v + 1;
      var posJogo = f >= 7;
      ORES.push(addItem('minerio_' + idx, 'Minério de ' + fam + q, 'minerio', CORES_MINERIO[f],
        posJogo ? 'Minério de pós-jogo: só cai de chefe.' : 'Encontrado no subsolo (família ' + fam + '). Funda para virar barra.',
        { familia: f, variante: v, dureza: 3 + f, posJogo: posJogo, empilhavel: true }));
      BARS.push(addItem('barra_' + idx, 'Barra de ' + fam + QUAL_F[v], 'barra', CORES_MINERIO[f],
        'Barra de ' + fam + ' pronta para forjar chicotes e armaduras.', { familia: f, variante: v, empilhavel: true }));
    });
  });

  // ------------------------------------------------------- armaduras (50)
  var ARMADURA_SUFIXOS = ['do Viajante', 'do Guarda', 'do Caçador', 'do Campeão', 'do Destino'];
  var PASSIVAS = ['+5% de dano de chicote', '+8% de velocidade', 'Regenera vida devagar', '+10% de alcance do gancho', 'Reduz dano de queda', '+6% de dano no estalo', 'Brilha no escuro', '+1 coração temporário ao girar', 'Inimigos mais lentos por perto', '+12% de dano contra chefes'];
  var ARMORS = [];
  FAMILIAS_MINERIO.forEach(function (fam, f) {
    ARMADURA_SUFIXOS.forEach(function (suf, v) {
      var idx = f * 5 + v + 1;
      ARMORS.push(addItem('armadura_' + idx, 'Armadura de ' + fam + ' ' + suf, 'armadura', CORES_MINERIO[f],
        'Defesa ' + (3 + f * 3 + v * 2) + '. Passiva: ' + PASSIVAS[(f + v) % PASSIVAS.length] + '. Conjunto ' + fam + ': 2 peças bônus pequeno, 4 peças completo.',
        { familia: f, defesa: 3 + f * 3 + v * 2, passiva: PASSIVAS[(f + v) % PASSIVAS.length], empilhavel: false }));
    });
  });

  // ------------------------------------------------------- acessórios (50 = 45 de chefe + 5 forjados)
  var ACESS_TIPOS = ['Amuleto', 'Anel', 'Pulseira', 'Olho', 'Relicário'];
  var ACESS_TEMAS = ['do Estalo', 'da Corda Viva', 'do Gancho Longo', 'do Giro Eterno', 'da Ponta de Ouro', 'do Caçador', 'da Maré', 'do Véu', 'do Trovão', 'do Primeiro Fio'];
  var BONUS_ACESS = ['+6% dano', '+8% velocidade de golpe', '+10% alcance', '+15% empurrão', '+20 vida máxima', '+5% dano do estalo', 'gancho mais rápido', '+1 alvo no giro', 'menos dano de projétil', 'mais moedas de inimigos'];
  var ACCESSORIES = [];
  for (var ac = 0; ac < 50; ac++) {
    var deChefe = ac < 45;
    ACCESSORIES.push(addItem('acessorio_' + (ac + 1),
      ACESS_TIPOS[ac % 5] + ' ' + ACESS_TEMAS[Math.floor(ac / 5)] + (ac >= 40 ? (ac % 2 ? ' Maior' : ' Menor') : ''),
      'acessorio', TIERS[Math.min(9, Math.floor(ac / 5))].cor,
      BONUS_ACESS[ac % 10] + '. ' + (deChefe ? 'Exclusivo de um chefe.' : 'Forjado na bancada.'),
      { deChefe: deChefe, chefeIndice: deChefe ? ac : null, bonus: BONUS_ACESS[ac % 10], empilhavel: false }));
  }

  // ------------------------------------------------------- picaretas (5)
  var PICKAXES = [];
  [['Picareta de Campo', 10], ['Picareta da Mina Fund', 11], ['Picareta de Cobalto', 12], ['Picareta Forja Estelar', 13], ['Picareta da Origem', 14]].forEach(function (p, i) {
    var nome = i === 1 ? 'Picareta da Mina Funda' : p[0];
    PICKAXES.push(addItem('picareta_' + (i + 1), nome, 'picareta', CORES_MINERIO[i * 2],
      'Poder de picareta ' + p[1] + '. Forjada na Forja Celeste, destrava os minérios mais duros.', { poder: p[1], empilhavel: false }));
  });

  // ------------------------------------------------------- blocos (40)
  var BLOCOS_DEF = [
    ['Grama', '#57a639'], ['Terra', '#8a5a33'], ['Pedra', '#7d7d85'], ['Areia', '#e4d78a'], ['Neve', '#f2f6ff'],
    ['Gelo', '#9fd8f0'], ['Tronco', '#6e4a26'], ['Folhas', '#2f7d2c'], ['Tábua de Madeira', '#b07b45'], ['Tijolo Vermelho', '#a8433a'],
    ['Tijolo de Pedra', '#66666e'], ['Vidro', '#cfeef7'], ['Pedra Luminosa', '#ffe9a3'], ['Obisidiana Negra', '#241f33'], ['Concreto Branco', '#e8e5da'],
    ['Telha Azul', '#3b6ea5'], ['Telha Verde', '#3f8f5f'], ['Bloco de Ouro', '#ffd700'], ['Bloco de Cobre', '#c87333'], ['Bloco de Mitril', '#62e6c9'],
    ['Argila Cozida', '#b5654a'], ['Arenito', '#d8c690'], ['Basalto', '#3a3a40'], ['Mármore', '#f2efe8'], ['Granito', '#8c6f6f'],
    ['Bloco de Musgo', '#5f7d3a'], ['Bloco de Coral', '#ff8f7a'], ['Bloco Congelado', '#a9cbe8'], ['Bloco do Abismo', '#2a1f4a'], ['Bloco Estelar', '#ffe95a'],
    ['Plataforma de Madeira', '#c08d52'], ['Escada de Corda', '#c9a86a'], ['Porta de Madeira', '#7c5327'], ['Tocha', '#ffcf6e'], ['Fogueira', '#ff9a3d'],
    ['Baú de Madeira', '#9a6a35'], ['Cama Simples', '#d9d3c3'], ['Mesa Rústica', '#8a6539'], ['Cadeira Rústica', '#8a6539'], ['Placa em Branco', '#c9a86a']
  ];
  var BLOCK_ITEMS = BLOCOS_DEF.map(function (b, i) {
    return addItem('bloco_' + (i + 1), b[0], 'bloco', b[1], 'Bloco de construção: ' + b[0].toLowerCase() + '. Coloque no mundo com o mouse.', { blocoIndice: i, empilhavel: true });
  });

  // ------------------------------------------------------- poções (30)
  var POCOES_DEF = [
    ['Poção de Vida Menor', 'Restaura 50 de vida', 50, 0, 0], ['Poção de Vida', 'Restaura 100 de vida', 100, 0, 0], ['Poção de Vida Maior', 'Restaura 200 de vida', 200, 0, 0],
    ['Elixir do Destino', 'Restaura 400 de vida', 400, 0, 0], ['Poção de Velocidade', '+25% movimento por 2 min', 0, 120, 0.25], ['Poção do Estalo', '+15% dano por 2 min', 0, 120, 0.15],
    ['Poção de Ferro', '+8 de defesa por 2 min', 0, 120, 0], ['Poção do Mineiro', 'Minera 50% mais rápido por 2 min', 0, 120, 0], ['Poção da Luz', 'Emite luz por 3 min', 0, 180, 0],
    ['Poção do Gancho', 'Gancho 40% mais longo por 2 min', 0, 120, 0], ['Poção de Saltos', 'Pulo mais alto por 2 min', 0, 120, 0], ['Poção Antiqueda', 'Sem dano de queda por 2 min', 0, 120, 0],
    ['Poção de Brasa', 'Imune a fogo e lava por 1 min', 0, 60, 0], ['Poção de Gelo', 'Congela quem encosta por 1 min', 0, 60, 0], ['Poção de Couro Duro', '+4 defesa por 3 min', 0, 180, 0],
    ['Poção do Par Veloz', 'Chicotes 20% mais rápido por 2 min', 0, 120, 0], ['Poção de Fôlego', 'Dano +8% e defesa +4 por 2 min', 0, 120, 0], ['Poção da Vila', 'Volta para a vila', 0, 0, 0],
    ['Poção de Caça', 'Mais moedas por 2 min', 0, 120, 0], ['Poção de Caverna', 'Revela minérios por perto por 1 min', 0, 60, 0], ['Poção de Noite Clara', 'Enxerga no escuro por 3 min', 0, 180, 0],
    ['Poção de Vida Dupla', 'Restaura 300 de vida', 300, 0, 0], ['Poção do Gigante', '+30% empurrão por 2 min', 0, 120, 0], ['Poção da Serpente', 'Golpes envenenam por 2 min', 0, 120, 0],
    ['Poção de Estrelas', '+20% dano contra chefes por 2 min', 0, 120, 0.2], ['Poção do Relicário', 'Restaura 150 e dá defesa por 1 min', 150, 60, 0], ['Poção de Eco', 'Estalo ecoa por 2 min', 0, 120, 0],
    ['Poção da Origem', 'Restaura tudo', 9999, 0, 0], ['Poção de Pressa', 'Coldre 30% menor por 2 min', 0, 120, 0], ['Poção do Construtor', 'Coloca blocos mais rápido por 3 min', 0, 180, 0]
  ];
  var POTIONS = POCOES_DEF.map(function (p, i) {
    return addItem('pocao_' + (i + 1), p[0], 'pocao', ['#e5484d', '#f76b15', '#46a758', '#6e56cf', '#3fa7d6'][i % 5], p[1] + '. Use pela barra de itens.',
      { cura: p[2], duracaoBuff: p[3], forca: p[4], empilhavel: true });
  });

  // ------------------------------------------------------- materiais comuns (40)
  var MATERIAIS_DEF = ['Couro Cru', 'Corda de Sisal', 'Gel de Slime', 'Osso Quebrado', 'Asa de Morcego', 'Olho de Vidro', 'Escama de Cobra', 'Teia Grossa', 'Pelo de Lobo', 'Garra de Aranha', 'Erva Curandeira', 'Flor do Campo', 'Cogumelo Brilhante', 'Frasco Vazio', 'Prego de Ferro', 'Fio de Linho', 'Sebo de Vela', 'Cinza Fina', 'Sal Grosso', 'Pó de Estrela', 'Placa de Osso', 'Dente de Pedra', 'Esporo Verde', 'Gota de Lava', 'Floco Eterno', 'Areia Dourada', 'Coral Seco', 'Raiz Torta', 'Folha da Selva', 'Poeira do Abismo', 'Fragmento de Cometa', 'Lasca de Relicário', 'Sopro de Eco', 'Grão da Origem', 'Âmbar Vivo', 'Quartzo Rosa', 'Ferrão Negro', 'Chave Enferrujada', 'Elo de Corrente', 'Cabo de Madeira'];
  var MATERIALS = MATERIAIS_DEF.map(function (n, i) {
    return addItem('material_' + (i + 1), n, 'material', CORES_MINERIO[i % 10], 'Material de criação usado em receitas.', { empilhavel: true });
  });

  // ------------------------------------------------------- estações/ferramentas especiais (19)
  var ESTACOES_DEF = ['Bancada de Trabalho', 'Forja de Pedra', 'Bigorna', 'Forja Celeste', 'Mesa de Poções', 'Altar da Apoteose', 'Tear de Cordas', 'Mesa de Mapas', 'Cofre da Vila', 'Sino da Vila', 'Totem do Gancho', 'Espelho de Retorno', 'Bússola de Caverna', 'Diário do Arsenal', 'Lanterna Eterna', 'Rede de Drops', 'Varinha de Sinalização', 'Mapa em Branco', 'Chave dos Atos'];
  var SPECIALS = ESTACOES_DEF.map(function (n, i) {
    return addItem('especial_' + (i + 1), n, 'especial', TIERS[i % 10].cor, 'Item especial: ' + n.toLowerCase() + '.', { empilhavel: i >= 16 });
  });

  // ------------------------------------------------------------------ chefes (4 + 90 = 94)
  var ATOS = [
    { nome: 'Clássicos', qtd: 4 }, { nome: 'I · Despertar', qtd: 8 }, { nome: 'II · Pós-Olho', qtd: 14 },
    { nome: 'III · Hardmode', qtd: 16 }, { nome: 'IV · Além do Colosso', qtd: 12 },
    { nome: 'V · Além do Firmamento', qtd: 20 }, { nome: 'VI · Fim de Tudo', qtd: 20 }
  ];
  var CLASSICOS = [
    { nome: 'Rei Slime', mecanicaTxt: 'Saltos esmagadores e slimes invocados', fases: 1, forma: 'slime' },
    { nome: 'Olho Colossal', mecanicaTxt: 'Investidas aéreas e olhos menores', fases: 1, forma: 'olho' },
    { nome: 'Guardião do Abismo', mecanicaTxt: 'Lava, tentáculos e duas fases', fases: 2, forma: 'guardiao' },
    { nome: 'Colosso Estelar', mecanicaTxt: 'Meteoros, feixes e três fases', fases: 3, forma: 'colosso' }
  ];
  var RAIZES = ['Vex', 'Mor', 'Kar', 'Syl', 'Thor', 'Zam', 'Bel', 'Ryn', 'Og', 'Ael', 'Nix', 'Cor', 'Tal', 'Yrg', 'Mol', 'Fen', 'Sar', 'Oss'];
  var DESIN = ['ora', 'ath', 'ion', 'ara', 'um', 'essa', 'or', 'ix', 'arda', 'uel'];
  var TITULOS = ['o Devorador de Pontes', 'a Voz do Fundo', 'o Rei Sem Coroa', 'a Maré de Vidro', 'o Jardim de Ferro', 'a Filha do Eco', 'o Sino Partido', 'a Chuva Negra', 'o Mapa Vivo', 'a Boca do Céu', 'o Último Farol', 'a Serpe de Sal', 'o Trono Torto', 'a Mãe das Correntes', 'o Relógio Parado', 'a Fome Antiga', 'o Espelho Fundo', 'a Coroa de Ossos', 'o Mar de Cinzas', 'a Primeira Noite'];
  var MOV_POOL = ['voador', 'saltitante', 'investida', 'orbitante', 'escavador', 'flutuante'];
  var ATAQUE_POOL = ['rajada radial', 'espiral de projéteis', 'laser telegrafado', 'chuva de meteoros', 'invoca lacaios', 'onda de choque', 'tiros rastreadores', 'armadilha de espinhos', 'feixe em leque', 'marcas que detonam', 'fendas que engolem', 'clones de eco'];
  var ELEMENTOS = ['fogo', 'gelo', 'raio', 'veneno', 'vazio', 'luz', 'osso', 'estrela'];
  var FORMAS = ['olho', 'serpente', 'golem', 'aranha', 'morcego', 'caveira', 'cristal', 'slime'];

  var BOSSES = [];
  (function gerarChefes() {
    var indice = 0;
    ATOS.forEach(function (ato, ai) {
      for (var j = 0; j < ato.qtd; j++) {
        indice++;
        var nome, mecTxt, fases, forma;
        if (ai === 0) { var c = CLASSICOS[j]; nome = c.nome; mecTxt = c.mecanicaTxt; fases = c.fases; forma = c.forma; }
        else if (indice === 94) { nome = 'Apoteose'; mecTxt = 'Quatro fases, tela cheia e big bang'; fases = 4; forma = 'apoteose'; }
        else {
          nome = RAIZES[(indice - 1) % 18] + DESIN[Math.floor((indice - 1) / 18) % 10] + ', ' + TITULOS[(indice * 7) % 20];
          mecTxt = ATAQUE_POOL[indice % 12] + ' de ' + ELEMENTOS[Math.floor(indice / 12) % 8] + (indice % 3 === 0 ? ' com domínio de arena' : indice % 3 === 1 ? ' com telegrafia dupla' : ' com padrão espelhado');
          fases = indice % 10 === 0 ? 3 : (indice % 4 === 0 ? 2 : 1); forma = FORMAS[indice % 8];
        }
        var hp = Math.round(420 + indice * 240 + indice * indice * 17);
        var chefe = {
          indice: indice, id: 'chefe_' + indice, nome: nome, ato: ato.nome, atoIndice: ai,
          hp: hp, danoContato: 8 + Math.round(indice * 1.1), fases: fases, forma: forma,
          movimento: ai === 0 ? ['saltitante', 'voador', 'investida', 'orbitante'][j] : MOV_POOL[indice % 6],
          ataque: ai === 0 ? ['invoca lacaios', 'rajada radial', 'onda de choque', 'chuva de meteoros'][j] : ATAQUE_POOL[indice % 12],
          elemento: ELEMENTOS[Math.floor(indice / 12) % 8],
          mecanica: mecTxt, mecanicaId: 'mec-' + indice, // inédita por construção (índice único)
          cor: ai === 0 ? ['#57c84b', '#e8ecf5', '#7b4bc9', '#ffd166'][j] : TIERS[Math.min(9, Math.floor(indice / 10))].cor,
          tamanho: 1 + (indice % 5) * 0.18,
          chicoteGuardado: null, acessorioExclusivo: null
        };
        BOSSES.push(chefe);
      }
    });
    // Ato V (chefes 55..74) guarda os T9 (#161..180); Ato VI (75..93) guarda T10 #181..199; chefe 94 libera a Apoteose.
    for (var b = 54; b < 74; b++) { BOSSES[b].chicoteGuardado = 161 + (b - 54); WHIPS[160 + (b - 54)].chefeGuarda = BOSSES[b].indice; }
    for (var b2 = 74; b2 < 93; b2++) { BOSSES[b2].chicoteGuardado = 181 + (b2 - 74); WHIPS[180 + (b2 - 74)].chefeGuarda = BOSSES[b2].indice; }
    BOSSES[93].chicoteGuardado = 200; WHIPS[199].chefeGuarda = 94;
    // 45 acessórios exclusivos nos 45 primeiros chefes
    for (var a = 0; a < 45; a++) BOSSES[a].acessorioExclusivo = 'acessorio_' + (a + 1);
  })();

  // Selos de invocação (94 itens) — entram na conta dos 628
  var SEALS = BOSSES.map(function (b) {
    return addItem('selo_' + b.indice, 'Selo de ' + (b.nome.indexOf(',') > 0 ? b.nome.split(',')[0] : b.nome), 'invocador', b.cor,
      'Invoca ' + b.nome + ' (' + b.ato + '). ' + b.mecanica + '.', { chefeIndice: b.indice, empilhavel: true });
  });

  // ------------------------------------------------------------------ receitas (433)
  // 160 chicotes (T1-T8) + 50 armaduras + 50 barras + 5 picaretas + 5 acessórios + 30 poções + 40 blocos + 93 selos = 433
  var RECIPES = [];
  function addRecipe(resultadoId, qtd, ingredientes, estacao, categoria) {
    RECIPES.push({ id: 'receita_' + (RECIPES.length + 1), resultado: resultadoId, qtd: qtd, ingredientes: ingredientes, estacao: estacao, categoria: categoria });
  }
  WHIPS.slice(0, 160).forEach(function (w) {
    var f = w.tier <= 6 ? w.tier - 1 : w.tier, barra = 'barra_' + (f * 5 + (w.numero % 5) + 1); // T7/T8: famílias de chefe
    var mat = 'material_' + (((w.numero - 1) % 40) + 1);
    var ing = [{ item: barra, qtd: 2 + (w.tier % 4) }, { item: 'material_2', qtd: 1 + (w.tier % 3) }, { item: mat, qtd: 2 }];
    if (w.tier === 1) ing = [{ item: 'material_1', qtd: 2 }, { item: 'material_2', qtd: 2 }, { item: 'bloco_9', qtd: 1 }];
    addRecipe(w.itemId, 1, ing, w.tier <= 4 ? 'Bancada de Trabalho' : 'Forja Celeste', 'Chicotes');
  });
  ARMORS.forEach(function (a, i) { addRecipe(a.id, 1, [{ item: 'barra_' + ((Math.floor(i / 5) * 5) + (i % 5) + 1), qtd: 4 }, { item: 'material_1', qtd: 2 }], 'Bigorna', 'Armaduras'); });
  BARS.forEach(function (bar, i) { addRecipe(bar.id, 1, [{ item: 'minerio_' + (i + 1), qtd: 3 }], 'Forja de Pedra', 'Fundição'); });
  PICKAXES.forEach(function (p, i) { addRecipe(p.id, 1, [{ item: 'barra_' + (i * 10 + 1), qtd: 3 }, { item: 'bloco_9', qtd: 2 }], 'Forja Celeste', 'Picaretas'); });
  ACCESSORIES.slice(45).forEach(function (a, i) { addRecipe(a.id, 1, [{ item: 'barra_' + (i + 1), qtd: 2 }, { item: 'material_20', qtd: 1 }], 'Bancada de Trabalho', 'Acessórios'); });
  POTIONS.forEach(function (p, i) { addRecipe(p.id, 1, [{ item: 'material_14', qtd: 1 }, { item: 'material_' + (11 + (i % 3)), qtd: 1 }], 'Mesa de Poções', 'Poções'); });
  BLOCK_ITEMS.forEach(function (b, i) {
    var base = i < 8 ? 'bloco_2' : (i < 20 ? 'bloco_3' : 'bloco_9');
    addRecipe(b.id, 4, [{ item: base, qtd: 2 }, { item: 'material_' + ((i % 40) + 1), qtd: 1 }], 'Bancada de Trabalho', 'Construção');
  });
  SEALS.slice(0, 93).forEach(function (s, i) {
    addRecipe(s.id, 1, [{ item: 'material_' + ((i % 40) + 1), qtd: 2 }, { item: 'material_3', qtd: 1 }], 'Bancada de Trabalho', 'Invocação');
  });

  // ------------------------------------------------------------------ conquistas (429)
  // 200 armas + 94 chefes + 12 segredos + 123 nas outras 7 categorias
  var RARIDADES = ['Comum', 'Raro', 'Épico', 'Lendário'];
  var ACHIEVEMENTS = [];
  function addAch(cat, nome, desc, stat, alvo, rar) {
    ACHIEVEMENTS.push({ id: 'conquista_' + (ACHIEVEMENTS.length + 1), categoria: cat, nome: nome, descricao: desc, estat: stat, alvo: alvo, raridade: rar, secreta: cat === 'Segredos' });
  }
  WHIPS.forEach(function (w) {
    addAch('Chicotes', w.nome, 'Obter o chicote ' + w.nome + ' (Tier ' + w.tier + ').', 'chicote:' + w.itemId, 1, w.tier <= 3 ? 'Comum' : w.tier <= 6 ? 'Raro' : w.tier <= 8 ? 'Épico' : 'Lendário');
  });
  BOSSES.forEach(function (b) {
    addAch('Chefes', 'Queda de ' + (b.nome.indexOf(',') > 0 ? b.nome.split(',')[0] : b.nome), 'Derrotar ' + b.nome + ' (' + b.ato + ').', 'chefe:' + b.indice, 1, b.indice < 13 ? 'Comum' : b.indice < 43 ? 'Raro' : b.indice < 75 ? 'Épico' : 'Lendário');
  });
  function serie(cat, nomes, descs, stat, alvos) {
    alvos.forEach(function (alvo, i) { addAch(cat, nomes[i % nomes.length] + (alvos.length > nomes.length ? ' ' + ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][Math.floor(i / nomes.length)] : ''), descs[i % descs.length].replace('{n}', alvo), stat, alvo, i < alvos.length * 0.4 ? 'Comum' : i < alvos.length * 0.75 ? 'Raro' : i < alvos.length - 1 ? 'Épico' : 'Lendário'); });
  }
  // Progressão (25)
  serie('Progressão', ['Primeiros Passos', 'Colecionador', 'Arsenal Crescente'], ['Ter {n} chicotes diferentes.'], 'chicotesDiferentes', [1, 3, 5, 10, 20, 40, 80, 120, 160, 200]);
  serie('Progressão', ['Escada de Tiers'], ['Possuir um chicote do Tier {n}.'], 'maiorTier', [2, 3, 4, 5, 6]);
  serie('Progressão', ['Tempo de Aventura'], ['Jogar por {n} minutos.'], 'minutosJogados', [10, 30, 60, 180, 600]);
  serie('Progressão', ['Caçador de Chefes'], ['Derrotar {n} chefes diferentes.'], 'chefesDerrotados', [1, 4, 12, 42, 94]);
  // Combate (25)
  serie('Combate', ['Exterminador'], ['Derrotar {n} inimigos.'], 'inimigosMortos', [10, 50, 200, 1000, 5000]);
  serie('Combate', ['Estalo Perfeito'], ['Acertar {n} estalos (último 10% da corda).'], 'estalos', [1, 25, 100, 500, 2000]);
  serie('Combate', ['Na Pontinha'], ['Acertar {n} golpes na ponta da corda.'], 'golpesPonta', [10, 100, 500]);
  serie('Combate', ['Fila Indiana'], ['Acertar {n} golpes em 3 ou mais inimigos.'], 'multi3', [1, 20, 100]);
  serie('Combate', ['Peão do Destino'], ['Acertar {n} inimigos com o giro de 360°.'], 'girosAcerto', [5, 50, 250]);
  serie('Combate', ['Dano Monumental'], ['Causar {n} de dano total.'], 'danoTotal', [1000, 10000, 100000, 1000000]);
  serie('Combate', ['Mão Dupla'], ['Golpear {n} vezes com o segundo chicote do par.'], 'golpesPar', [1, 100]);
  // Mineração e construção (20)
  serie('Mineração e construção', ['Picareta Cansada'], ['Minerar {n} blocos.'], 'blocosMinerados', [10, 100, 1000, 5000, 20000]);
  serie('Mineração e construção', ['Arquiteto'], ['Colocar {n} blocos.'], 'blocosColocados', [10, 100, 1000, 5000]);
  serie('Mineração e construção', ['Fundo do Poço'], ['Descer até {n} blocos de profundidade.'], 'profundidade', [50, 150, 300, 440]);
  serie('Mineração e construção', ['Caçador de Veios'], ['Minerar {n} minérios.'], 'mineriosColetados', [5, 50, 250, 1000]);
  serie('Mineração e construção', ['Oficina Quente'], ['Criar {n} itens.'], 'itensCriados', [1, 25, 100]);
  // Equipamento (20)
  serie('Equipamento', ['Guarda-Roupa'], ['Ter {n} armaduras diferentes.'], 'armadurasDiferentes', [1, 5, 15, 30, 50]);
  serie('Equipamento', ['Bijuteria Fina'], ['Ter {n} acessórios diferentes.'], 'acessoriosDiferentes', [1, 5, 15, 30, 50]);
  serie('Equipamento', ['Kit de Mineração'], ['Ter {n} picaretas diferentes.'], 'picaretasDiferentes', [1, 3, 5]);
  serie('Equipamento', ['Conjunto Incompleto'], ['Usar conjunto de {n} peças da mesma família.'], 'conjuntoPecas', [2, 4]);
  serie('Equipamento', ['Duas Mãos'], ['Equipar um par de chicotes (Tier {n} ou maior).'], 'maiorTierPar', [5, 7, 10]);
  serie('Equipamento', ['Fundidor'], ['Fundir {n} barras.'], 'barrasFundidas', [1, 50]);
  // Exploração (15)
  serie('Exploração', ['Turista'], ['Visitar {n} biomas.'], 'biomasVisitados', [2, 4, 6]);
  serie('Exploração', ['Cartógrafo'], ['Revelar {n}% do mapa.'], 'mapaRevelado', [10, 30, 60, 90]);
  serie('Exploração', ['Viaduto Humano'], ['Usar o gancho {n} vezes.'], 'usosGancho', [1, 50, 300]);
  serie('Exploração', ['Estrada Longa'], ['Andar {n} blocos.'], 'blocosAndados', [500, 5000, 50000, 200000]);
  serie('Exploração', ['Primeira Ponte Sem Blocos'], ['Atravessar {n} vãos só com o gancho.'], 'vaosDeGancho', [1]);
  // Economia e NPCs (10)
  serie('Economia e NPCs', ['Bolso Cheio'], ['Ganhar {n} moedas no total.'], 'moedasGanhas', [100, 1000, 10000, 100000]);
  serie('Economia e NPCs', ['Bom Vizinho'], ['Conversar {n} vezes com NPCs.'], 'conversasNPC', [1, 10, 50]);
  serie('Economia e NPCs', ['Cliente Fiel'], ['Comprar {n} itens na vila.'], 'compras', [1, 10]);
  serie('Economia e NPCs', ['Goles Rápidos'], ['Beber {n} poções.'], 'pocoesBebidas', [10]);
  // Mundos (8)
  serie('Mundos', ['Fundador'], ['Criar {n} mundos.'], 'mundosCriados', [1, 3]);
  serie('Mundos', ['Semeador'], ['Salvar o jogo {n} vezes.'], 'salvamentos', [1, 20]);
  serie('Mundos', ['Passaporte'], ['Exportar {n} mapas.'], 'exportacoes', [1, 5]);
  serie('Mundos', ['Imigrante'], ['Importar {n} mapas.'], 'importacoes', [1, 3]);
  // Segredos (12) — mascarados com ??? até desbloquear
  [['Sorte de Principiante', 'Vença um chefe sem sofrer dano.', 'secreto:chefeSemDano'],
   ['Salvo Pela Corda', 'Agarre-se com o gancho no meio de uma queda longa.', 'secreto:ganchoSalvador'],
   ['Fila Perfeita', 'Acerte 8 inimigos com um único giro.', 'secreto:giro8'],
   ['Ponta Relíquia', 'Acerte 10 estalos seguidos sem errar.', 'secreto:estalosSeguidos10'],
   ['Fundo de Verdade', 'Toque o leito de pedra do mundo.', 'secreto:fundoDoMundo'],
   ['Dança Cerebral', 'Mate um inimigo só com o segundo chicote do par.', 'secreto:morteDoPar'],
   ['Queda de Altura', 'Sobreviva a uma queda de 80 blocos.', 'secreto:queda80'],
   ['Um de Cada', 'Possua um chicote de cada um dos 10 tiers.', 'secreto:todosOsTiers'],
   ['Quase Lá', 'Chegue a 93 de 94 chefes derrotados.', 'secreto:chefes93'],
   ['Ás da Apoteose', 'Empunhe a Apoteose.', 'secreto:apoteoseEquipada'],
   ['Luz Própria', 'Atravesse a noite inteira no subsolo.', 'secreto:noiteNoSubsolo'],
   ['Casa Simples', 'Coloque 50 blocos seguidos sem sair do lugar.', 'secreto:casaSimples']
  ].forEach(function (s) { addAch('Segredos', s[0], s[1], s[2], 1, 'Lendário'); });

  // ------------------------------------------------------------------ validação
  function validar() {
    var erros = [];
    function eq(nome, obtido, esperado) { if (obtido !== esperado) erros.push(nome + ': ' + obtido + ' ≠ ' + esperado); }
    eq('chicotes', WHIPS.length, 200);
    eq('chefes', BOSSES.length, 94);
    eq('itens', ITEMS.length, 628);
    eq('receitas', RECIPES.length, 433);
    eq('conquistas', ACHIEVEMENTS.length, 429);
    eq('minérios', ORES.length, 50); eq('barras', BARS.length, 50);
    eq('armaduras', ARMORS.length, 50); eq('acessórios', ACCESSORIES.length, 50);
    eq('picaretas', PICKAXES.length, 5);
    eq('tiers', TIERS.length, 10);
    TIERS.forEach(function (t) { eq('chicotes do tier ' + t.n, WHIPS.filter(function (w) { return w.tier === t.n; }).length, 20); });
    var vistos = {}, dup = 0;
    WHIPS.forEach(function (w) { var item = ITEM_BY_ID[w.itemId]; if (vistos[item.nome]) dup++; vistos[item.nome] = true; });
    if (dup) erros.push('nomes de chicote duplicados: ' + dup);
    var segs = ACHIEVEMENTS.filter(function (a) { return a.secreta; }).length;
    eq('segredos', segs, 12);
    eq('guardados T9/T10', BOSSES.filter(function (b) { return b.chicoteGuardado; }).length, 40);
    eq('atos somam 90', ATOS.slice(1).reduce(function (s, a) { return s + a.qtd; }, 0), 90);
    var mecnicas = BOSSES.map(function (b) { return b.mecanicaId; });
    if (new Set(mecnicas).size !== 94) erros.push('mecânicas de chefe repetidas');
    return erros;
  }

  global.GAME_DATA = {
    TIERS: TIERS, FORMULA: FORMULA, WHIPS: WHIPS, ITEMS: ITEMS, ITEM_BY_ID: ITEM_BY_ID,
    ORES: ORES, BARS: BARS, ARMORS: ARMORS, ACCESSORIES: ACCESSORIES, PICKAXES: PICKAXES,
    BLOCK_ITEMS: BLOCK_ITEMS, POTIONS: POTIONS, MATERIALS: MATERIALS, SPECIALS: SPECIALS,
    BOSSES: BOSSES, ATOS: ATOS, SEALS: SEALS, RECIPES: RECIPES,
    ACHIEVEMENTS: ACHIEVEMENTS, RARIDADES: RARIDADES, FAMILIAS_MINERIO: FAMILIAS_MINERIO,
    CORES_MINERIO: CORES_MINERIO, validar: validar,
    CONTAGENS: { chicotes: WHIPS.length, chefes: BOSSES.length, itens: ITEMS.length, receitas: RECIPES.length, conquistas: ACHIEVEMENTS.length, minerios: ORES.length, barras: BARS.length, armaduras: ARMORS.length, acessorios: ACCESSORIES.length, picaretas: PICKAXES.length }
  };
})(typeof window !== 'undefined' ? window : globalThis);
