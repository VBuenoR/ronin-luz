'use strict';

/**
 * Códice de habilidades.
 *
 * O catálogo é derivado do estado atual do jogador: não cria uma segunda
 * fonte de verdade e nunca revela amuletos ou técnicas ainda não conquistados.
 */
const AbilityMenu = {
  open: false,
  index: 0,
  scroll: 0,
  visibleRows: 11,

  openMenu() {
    this.open = true;
    this.index = U.clamp(this.index, 0, Math.max(0, this.entries().length - 1));
    this.ensureVisible();
    Sfx.confirm();
  },

  closeToPause() {
    this.open = false;
    Game.pauseIdx = 1;
    Sfx.menuMove();
  },

  magicCost(base) {
    return typeof Battle !== 'undefined' && Battle.magicCost
      ? Battle.magicCost(base)
      : base;
  },

  magicBonus() { return Game.absorbed * 4; },

  entries() {
    const P = Game.player;
    if (!P) return [];
    const entries = [];
    const add = (entry) => entries.push(entry);
    const light = '#ffe9b0';
    const dark = '#c9a6ff';
    const water = '#8fd8ff';
    const fire = '#ffab66';
    const wind = '#a2e8c9';
    const magicBonus = this.magicBonus();
    const cost4 = this.magicCost(4);
    const cost6 = this.magicCost(6);
    const cost7 = this.magicCost(7);
    const attack = P.atk;
    const lightHeal = Math.floor(Game.purified / 2);
    const guardHeal = 4 + Math.floor(Game.purified * 0.75);
    const offensiveHeal = lightHeal > 0
      ? `\n✦ Benção de Luz: Magias também regeneram +${lightHeal} PV do rōnin.`
      : '';

    add({
      group: 'Katana de Luz', kanji: '斬', title: 'Corte de Luz', color: light,
      badge: 'Inicial · 2 EST',
      desc: `Golpe físico veloz com a katana sagrada. Causa ${attack} de dano base e possui 50% de chance de Acerto Crítico (${attack * 2} de dano). Consome 2 de Estamina.\n`
        + `✦ Progressão Viva: O dano físico cresce +1 a cada 3 purificações de luz e +2 a cada 2 absorções sombrias.`
    });
    add({
      group: 'Técnica', kanji: '守', title: 'Defender', color: light,
      badge: 'Inicial · Grátis',
      desc: 'Postura defensiva de combate. Reduz em 50% todo o dano do próximo ataque inimigo e recupera instantaneamente +2 de Estamina (EST) e +3 Pontos de Magia (PM).\n'
        + '⚠️ Sob o efeito de Paralisia Elétrica (espíritos de Vento), o reflexo é afetado e a redução cai para 25%.'
    });
    add({
      group: 'Magia da Luz', kanji: '癒', title: 'Cura da Luz', color: light,
      badge: 'Segure R no mapa',
      desc: 'Canalização sagrada fora de combate. No chão do mapa, segure R para erguer uma aura dourada. A cada 0,3s, consome 2 PM para regenerar +2 PV de Vida e +2 EST de Estamina.'
    });
    add({
      group: 'Técnica', kanji: '瞑', title: 'Meditação', color: light,
      badge: 'Portal Torii',
      desc: 'Transe espiritual diante de portais Torii. Permaneça imóvel em frente a um Torii por 3 segundos para restaurar 100% da sua Vida, PM e Estamina.\n'
        + '⚠️ Qualquer movimento ou dano sofrido interrompe a meditação.'
    });
    add({
      group: 'Magia da Luz', kanji: '盾', title: 'Defesa da Luz', color: light,
      badge: `${cost6} PM`,
      desc: `Escudo divino inquebrável. Exige a Katana de Luz. Bloqueia 75% do próximo dano sem fraqueza elemental e regenera ${guardHeal} PV de Vida (cura cresce com as purificações).\n`
        + '⚠️ Fica indisponível enquanto a essência do rōnin estiver perdida.'
    });
    add({
      group: 'Magia da Luz', kanji: '浄', title: 'Purificar', color: light,
      badge: `${cost7} PM`,
      desc: 'Ritual sagrado de libertação. Exige a Katana de Luz. Execução 100% garantida quando inimigos comuns estão com ≤20% de vida (chefes: ≤15%).\n'
        + '✦ Recompensa: Concede +3 PV Máximos permanentes, experiência e essências da alma.'
    });
    add({
      group: 'Passiva da Luz', kanji: '明', title: 'Iluminado', color: '#fff3cf',
      badge: 'Passiva',
      desc: 'Benção permanente da luz. Quando um inimigo comum está com até 50% de vida, a habilidade Purificar ganha 20% de chance de sucesso antecipado antes do limite garantido.\n'
        + 'Não afeta combates contra chefes nem a técnica Absorver.'
    });

    if (Game.hasDarkKatana) {
      add({
        group: 'Katana da Escuridão', kanji: '闇', title: 'Corte das Trevas', color: dark,
        badge: 'Q alterna · 2 EST',
        desc: `Corte profano revestido em escuridão. Causa ${attack} de dano físico base com 50% de chance de crítico (${attack * 2} de dano). Em Acertos Críticos, rouba +${2 + Game.absorbed} de Vida do inimigo.\n`
          + `✦ Progressão Viva: Compartilha o dano físico com a Katana de Luz (+1 a cada 3 purificações e +2 a cada 2 absorções). O Roubo de Vida aumenta em +1 para cada espírito absorvido!`
      });
      add({
        group: 'Magia Sombria', kanji: '喰', title: 'Absorver', color: dark,
        badge: `${cost7} PM`,
        desc: 'Devora a essência do espírito inimigo. Exige a Katana da Escuridão. Execução 100% garantida com inimigos em ≤20% de vida (chefes: ≤15%); até 50% de vida, possui 5% de chance.\n'
          + '✦ Poder Devorado: Cada espírito absorvido concede +4 de dano permanente para TODAS as magias.'
      });
      add({
        group: 'Magia Sombria', kanji: '暗', title: 'Força das Trevas', color: dark,
        badge: `${cost4} PM`,
        desc: 'Empodera a lâmina sombria com ódio reprimido. Exige a Katana da Escuridão. Garante 100% de chance de Acerto Crítico para os seus próximos 2 ataques físicos.'
      });
      add({
        group: 'Magia Sombria', kanji: '呪', title: 'Rajada Sombria', color: dark,
        badge: `${cost6} PM`,
        desc: `Dispara a energia acumulada dos espíritos devorados. Causa ${15 + Game.absorbed * 5} de dano mágico sombrio (15 base + 5 por espírito absorvido).${offensiveHeal}`
      });
    }

    if (Game.amulets.sui) {
      add({
        group: 'Amuleto', kanji: '水', title: 'Sui — Amuleto da Água', color: water,
        badge: Game.equipped === 'sui' ? 'Equipado' : 'Possuído',
        desc: 'Relíquia sagrada dos rios. Equipe com E fora de combate. Enquanto equipado no mapa, aumenta em +50% a velocidade e controle de nado. Libera as artes de água em combate.'
      });
      add({
        group: 'Sui', kanji: '障', title: 'Barragem de Água', color: water,
        badge: `${cost6} PM`,
        desc: `Escudo fluido de alta pressão. Causa ${7 + magicBonus} de dano mágico e reduz em 50% o próximo ataque sofrido.${offensiveHeal}\n`
          + '⚠️ Contra magias de água/maré ou ataques elétricos do vento, reduz apenas 25%.'
      });
      add({
        group: 'Sui', kanji: '波', title: 'Pulso de Água', color: water,
        badge: `${cost6} PM`,
        desc: `Disparo aquático perfurante. Causa ${16 + magicBonus} de dano mágico de água.${offensiveHeal}\n`
          + '✦ Perfura Defesa: Ignora a postura defensiva e escudos de espíritos de Fogo, além de romper proteções especiais.'
      });
    }

    if (Game.amulets.ka) {
      const ancestral = Game.fireAmuletForm === 'ancestral';
      add({
        group: 'Amuleto', kanji: ancestral ? '蒼' : '火',
        title: ancestral ? 'Ka — Chama Ancestral' : 'Ka — Amuleto de Fogo',
        color: ancestral ? '#85dcff' : fire,
        badge: Game.equipped === 'ka' ? 'Equipado' : 'Possuído',
        desc: ancestral
          ? 'Forma suprema despertada na Antiga Forja. Substitui a Barragem de Fogo por Incinerar Ancestral, ativa Corpo em Chama Azul e adiciona +1 PM ao custo das magias enquanto equipado.'
          : 'Relíquia das chamas vivas. Equipe com E fora de combate para liberar as magias Barragem de Fogo e Incinerar.'
      });
      if (!ancestral) {
        add({
          group: 'Ka', kanji: '障', title: 'Barragem de Fogo', color: fire,
          badge: `${cost6} PM`,
          desc: `Círculo defensivo de chamas. Causa ${7 + magicBonus} de dano mágico e reduz em 50% o próximo golpe sofrido.${offensiveHeal}\n`
            + '⚠️ Vulnerável à Água: Contra ataques mágicos de água, reduz apenas 25% do dano.'
        });
      }
      add({
        group: ancestral ? 'Ka Ancestral' : 'Ka', kanji: '炎', title: 'Incinerar',
        color: ancestral ? '#85dcff' : fire, badge: `${cost6} PM`,
        desc: `Chama purificadora intensa. Causa ${16 + magicBonus} de dano mágico de fogo.${offensiveHeal}\n`
          + '✦ Perfura Defesa: Bypassa a defesa de espíritos de Água e causa +20% de dano bônus (×1,2) contra alvos de água desprotegidos.'
      });
      if (ancestral) {
        add({
          group: 'Ka Ancestral', kanji: '蒼', title: 'Incinerar Ancestral', color: '#85dcff',
          badge: `${cost6} PM`,
          desc: 'Arte secreta das chamas azuis. Marca o inimigo por 5 ações. Cada ataque conectado armazena 40% do dano causado.\n'
            + '✦ Detonação Azul: Ao final das 5 ações, a Marca explode causando todo o dano acumulado de uma só vez, IGNORANDO a defesa.'
        });
        add({
          group: 'Passiva Ancestral', kanji: '藍', title: 'Corpo em Chama Azul', color: '#85dcff',
          badge: 'Passiva',
          desc: 'Simbio com o Fogo Ancestral. Converte 20% de todo o dano mágico de fogo causado em regeneração de VIDA direta para o rōnin.\n'
            + '⚠️ Efeito Colateral: O rōnin sofre +20% de dano de magias de Água e +15% de dano físico.'
        });
      }
    }

    if (Game.amulets.wind) {
      add({
        group: 'Amuleto', kanji: '風', title: 'Fū — Amuleto do Vento', color: wind,
        badge: Game.equipped === 'wind' ? 'Equipado' : 'Possuído',
        desc: 'Relíquia das rajadas de ar. Equipe com E fora de combate. Libera Salto Duplo no ar, Dash Expandido (em terra e debaixo d’água) e a magia Tornado em combate.'
      });
      add({
        group: 'Fū', kanji: '旋', title: 'Tornado', color: wind,
        badge: `${cost6} PM`,
        desc: `Vórtice ciclônico cortante. Causa ${16 + magicBonus} de dano mágico de vento.${offensiveHeal}\n`
          + '✦ Perfura Defesa: Ignora a postura defensiva e escudos de espíritos de Água.'
      });
    }

    if (window.WindKingdom && WindKingdom.phoenixUnlocked) {
      add({
        group: 'Relíquia', kanji: '鳥', title: 'Asas da Fênix', color: '#ffe0a0',
        badge: 'Possuída',
        desc: 'Poder lendário conquistado ao reunir todas as Penas da Fênix. No ar, mantenha a tecla Espaço segurada para abrir as asas e planar suavemente, reduzindo drasticamente a queda.\n'
          + 'Consome 1 de Estamina (EST) a cada 20 quadros enquanto paira no ar.'
      });
    }

    if (window.AncientForge && AncientForge.imbued) {
      add({
        group: 'Aprimoramento', kanji: '鍛', title: 'Katana Imbuída', color: '#e0b8ff',
        badge: 'Metal Lendário',
        desc: 'Lâmina refinada com 5 Metais Lendários na Antiga Forja. Ao pegar um inimigo de surpresa no mapa com a Katana da Escuridão empunhada, desfere um SEGUNDO golpe imediato na entrada do combate.\n'
          + '✦ Dano de Vantagem: Causa +10% da vida máxima de inimigos comuns ou +5% da vida máxima de chefes.'
      });
    }

    return entries;
  },

  ensureVisible() {
    if (this.index < this.scroll) this.scroll = this.index;
    if (this.index >= this.scroll + this.visibleRows) {
      this.scroll = this.index - this.visibleRows + 1;
    }
    const maxScroll = Math.max(0, this.entries().length - this.visibleRows);
    this.scroll = U.clamp(this.scroll, 0, maxScroll);
  },

  update(game) {
    const entries = this.entries();
    const isEscOrP = (Input.keys.Escape && Input.just.Escape)
      || (Input.keys.KeyP && Input.just.KeyP);
    if (isEscOrP) {
      this.open = false;
      game.state = game.prevState;
      Sfx.confirm();
      return;
    }
    if (Input.pressed('back')) {
      this.closeToPause();
      return;
    }
    if (!entries.length) return;
    if (Input.pressed('up')) {
      this.index = (this.index + entries.length - 1) % entries.length;
      this.ensureVisible();
      Sfx.menuMove();
    }
    if (Input.pressed('downKey')) {
      this.index = (this.index + 1) % entries.length;
      this.ensureVisible();
      Sfx.menuMove();
    }
  },

  wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const lines = text.split('\n');
    let py = y;
    for (const rawLine of lines) {
      if (rawLine === '') {
        py += Math.round(lineHeight * 0.4);
        continue;
      }
      const words = rawLine.split(/\s+/);
      let line = '';
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (line && ctx.measureText(test).width > maxWidth) {
          ctx.fillText(line, x, py);
          line = word;
          py += lineHeight;
        } else {
          line = test;
        }
      }
      if (line) {
        ctx.fillText(line, x, py);
        py += lineHeight;
      }
    }
    return py;
  },

  draw(ctx) {
    if (!this.open) return;
    const entries = this.entries();
    if (!entries.length) return;
    this.index = U.clamp(this.index, 0, entries.length - 1);
    this.ensureVisible();
    const selected = entries[this.index];
    const x = 42, y = 28, w = 876, h = 484;
    const listX = x + 18, listY = y + 78, listW = 294;
    const detailX = x + 332, detailY = listY, detailW = w - 350;

    ctx.save();
    ctx.fillStyle = 'rgba(2,4,10,0.88)';
    ctx.fillRect(0, 0, 960, 540);
    ctx.fillStyle = 'rgba(8,13,28,0.97)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255,214,130,0.52)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    const headerGlow = ctx.createLinearGradient(x, y, x + w, y);
    headerGlow.addColorStop(0, 'rgba(255,214,130,0.12)');
    headerGlow.addColorStop(0.55, 'rgba(110,150,220,0.06)');
    headerGlow.addColorStop(1, 'rgba(255,214,130,0)');
    ctx.fillStyle = headerGlow;
    ctx.fillRect(x + 1, y + 1, w - 2, 58);
    ctx.fillStyle = '#ffe9b0';
    ctx.font = '700 24px "Yu Mincho", "Segoe UI", serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('技  HABILIDADES', x + 22, y + 36);
    ctx.fillStyle = '#8096b7';
    ctx.font = '11px "Segoe UI", sans-serif';
    ctx.fillText('Somente técnicas conquistadas', x + 244, y + 35);
    ctx.textAlign = 'right';
    ctx.fillText(`${entries.length} registradas`, x + w - 22, y + 35);

    ctx.fillStyle = 'rgba(4,8,18,0.72)';
    ctx.fillRect(listX, listY, listW, 346);
    ctx.strokeStyle = 'rgba(140,180,240,0.22)';
    ctx.strokeRect(listX, listY, listW, 346);

    const end = Math.min(entries.length, this.scroll + this.visibleRows);
    for (let i = this.scroll; i < end; i++) {
      const entry = entries[i];
      const row = i - this.scroll;
      const rowY = listY + 9 + row * 30;
      const active = i === this.index;
      if (active) {
        ctx.fillStyle = 'rgba(255,214,130,0.12)';
        ctx.fillRect(listX + 6, rowY - 2, listW - 12, 26);
        ctx.strokeStyle = 'rgba(255,214,130,0.28)';
        ctx.strokeRect(listX + 6.5, rowY - 1.5, listW - 13, 25);
      }
      ctx.fillStyle = active ? '#ffe9b0' : entry.color;
      ctx.font = active ? '700 13px "Segoe UI", sans-serif' : '600 12px "Segoe UI", sans-serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(active ? '›' : entry.kanji, listX + 14, rowY + 11);
      ctx.fillText(entry.title, listX + 34, rowY + 11);
      ctx.fillStyle = active ? '#bba66f' : '#607493';
      ctx.font = '700 8px "Segoe UI", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(entry.group.toUpperCase(), listX + listW - 13, rowY + 11);
    }

    if (entries.length > this.visibleRows) {
      const trackY = listY + 8;
      const trackH = 330;
      const thumbH = Math.max(34, trackH * this.visibleRows / entries.length);
      const maxScroll = entries.length - this.visibleRows;
      const thumbY = trackY + (trackH - thumbH) * (this.scroll / maxScroll);
      ctx.fillStyle = 'rgba(120,145,185,0.14)';
      ctx.fillRect(listX + listW - 4, trackY, 2, trackH);
      ctx.fillStyle = 'rgba(255,214,130,0.52)';
      ctx.fillRect(listX + listW - 5, thumbY, 4, thumbH);
    }

    ctx.fillStyle = 'rgba(5,9,20,0.74)';
    ctx.fillRect(detailX, detailY, detailW, 346);
    ctx.strokeStyle = 'rgba(140,180,240,0.22)';
    ctx.strokeRect(detailX, detailY, detailW, 346);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = selected.color;
    ctx.shadowColor = selected.color;
    ctx.shadowBlur = 14;
    ctx.font = '700 42px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(selected.kanji, detailX + 48, detailY + 56);
    ctx.restore();
    ctx.fillStyle = '#7388aa';
    ctx.font = '700 10px "Segoe UI", sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(selected.group.toUpperCase(), detailX + 90, detailY + 33);
    ctx.fillStyle = selected.color;
    ctx.font = '700 22px "Yu Mincho", "Segoe UI", serif';
    ctx.fillText(selected.title, detailX + 90, detailY + 61);

    ctx.font = '700 10px "Segoe UI", sans-serif';
    const badgeW = Math.max(66, ctx.measureText(selected.badge).width + 22);
    ctx.fillStyle = 'rgba(255,214,130,0.09)';
    ctx.fillRect(detailX + detailW - badgeW - 18, detailY + 24, badgeW, 25);
    ctx.strokeStyle = 'rgba(255,214,130,0.28)';
    ctx.strokeRect(detailX + detailW - badgeW - 17.5, detailY + 24.5, badgeW - 1, 24);
    ctx.fillStyle = '#ffe9b0';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(selected.badge, detailX + detailW - badgeW / 2 - 18, detailY + 37);

    ctx.strokeStyle = 'rgba(255,214,130,0.24)';
    ctx.beginPath();
    ctx.moveTo(detailX + 20, detailY + 91);
    ctx.lineTo(detailX + detailW - 20, detailY + 91);
    ctx.stroke();
    ctx.fillStyle = '#c9d8ec';
    ctx.font = '13px "Segoe UI", sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    this.wrapText(ctx, selected.desc, detailX + 24, detailY + 118, detailW - 48, 19);

    ctx.fillStyle = 'rgba(255,214,130,0.055)';
    ctx.fillRect(detailX + 20, detailY + 278, detailW - 40, 45);
    ctx.strokeStyle = 'rgba(255,214,130,0.16)';
    ctx.strokeRect(detailX + 20.5, detailY + 278.5, detailW - 41, 44);
    ctx.fillStyle = '#86a0c2';
    ctx.font = '10px "Segoe UI", sans-serif';
    ctx.fillText('STATUS', detailX + 34, detailY + 296);
    ctx.fillStyle = selected.color;
    ctx.font = '700 12px "Segoe UI", sans-serif';
    ctx.fillText('DESPERTA · DISPONÍVEL NO CÓDICE', detailX + 34, detailY + 314);

    ctx.fillStyle = '#7186a6';
    ctx.font = '11px "Segoe UI", sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('↑ ↓ navegar', x + 22, y + h - 22);
    ctx.textAlign = 'center';
    ctx.fillText(`${this.index + 1} / ${entries.length}`, x + w / 2, y + h - 22);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#b9c9df';
    ctx.fillText('X voltar à pausa  ·  ESC/P retomar o jogo', x + w - 22, y + h - 22);
    ctx.restore();
  }
};

window.AbilityMenu = AbilityMenu;
