'use strict';

/**
 * O VALE DOS OSSOS — caverna nas PROFUNDEZAS do Reino do Fogo.
 *
 * Não é uma reskin da superfície: é um caminho que DESCE. Um poço se abre no
 * piso do reino (x ~3730–3910) e uma escada de saliências mergulha ~1000px até
 * uma caverna própria, muito abaixo de tudo (y > 2500) — separada da área de
 * lava/espinhos/chefe que já existe.
 *
 * Lá: basalto escuro, fósseis de feras ancestrais, neblina azul fria e FOGO
 * AZUL ESPIRITUAL, que queima a carne E a alma (PV e PM) e o Amuleto de Fogo
 * apenas atenua, nunca anula.
 *
 * Região declarativa integrada pelos hooks explícitos de World, Game e Lighting.
 */
const AshValley = {

  // ─── região: tudo abaixo do piso do reino é o Vale dos Ossos ───
  DEEP_Y: 2460,
  MOUTH: { x: 3820, y: 2440 },   // boca do poço de descida
  FIRE_HEIGHT: 3800,             // profundidade que a câmera precisa alcançar
  SHELL_X: 3300,
  SHELL_RIGHT: 6240,
  ANCIENT_ESSENCE: { x: 6020, y: 3580 },

  inValley(x, y) { return World.current === 'fogo' && y > this.DEEP_Y; },

  // paleta fria e mística — contraste com o vermelho vulcânico
  palette: { skyT: [8, 12, 24], skyB: [16, 26, 46], fog: [30, 80, 160], moss: [80, 150, 220], tree: [12, 16, 24] },

  paletteAt(y) {
    if (World.current !== 'fogo' || y === undefined || y < 2240) return null;
    const hot = { skyT: [22, 7, 8], skyB: [66, 22, 14], fog: [140, 60, 30], moss: [255, 150, 70], tree: [34, 12, 10] };
    const t = this.transitionAt(y);
    if (t >= 1) return this.palette;
    const out = {};
    for (const key of ['skyT', 'skyB', 'fog', 'moss', 'tree']) out[key] = U.mixRGB(hot[key], this.palette[key], t);
    return out;
  },

  transitionAt(y) {
    const t = U.clamp((y - 2240) / 720, 0, 1);
    return t * t * (3 - 2 * t);
  },

  blueFireFrame(fire) {
    const mount = fire.mount || 'floor';
    const span = fire.span || fire.w || 40;
    if (mount === 'ceiling') {
      return { cx: fire.x + span * 0.5, cy: fire.y, angle: Math.PI, span, nx: 0, ny: 1 };
    }
    if (mount === 'left') {
      return { cx: fire.x, cy: fire.y + span * 0.5, angle: Math.PI * 0.5, span, nx: 1, ny: 0 };
    }
    if (mount === 'right') {
      return { cx: fire.x, cy: fire.y + span * 0.5, angle: -Math.PI * 0.5, span, nx: -1, ny: 0 };
    }
    return { cx: fire.x + span * 0.5, cy: fire.y, angle: 0, span, nx: 0, ny: -1 };
  },

  blueFireBounds(fire) {
    const span = fire.span || fire.w || 40;
    const reach = fire.reach || 38;
    const mount = fire.mount || 'floor';
    if (mount === 'ceiling') return { x: fire.x, y: fire.y, w: span, h: reach };
    if (mount === 'left') return { x: fire.x, y: fire.y, w: reach, h: span };
    if (mount === 'right') return { x: fire.x - reach, y: fire.y, w: reach, h: span };
    return { x: fire.x, y: fire.y - reach, w: span, h: reach };
  },

  blueFireCenter(fire) {
    const frame = this.blueFireFrame(fire);
    const lift = Math.min((fire.reach || 38) * 0.48, 34);
    return { x: frame.cx + frame.nx * lift, y: frame.cy + frame.ny * lift };
  },

  blueFirePoint(fire, along = 0.5, lift = 0) {
    const frame = this.blueFireFrame(fire);
    const tangentX = Math.cos(frame.angle), tangentY = Math.sin(frame.angle);
    const offset = (along - 0.5) * frame.span;
    return {
      x: frame.cx + tangentX * offset + frame.nx * lift,
      y: frame.cy + tangentY * offset + frame.ny * lift,
      nx: frame.nx, ny: frame.ny,
      tx: tangentX, ty: tangentY
    };
  },

  blueFireLightRadius(fire) {
    const center = this.blueFireCenter(fire);
    let width = 360;
    for (const seg of this.tunnelSegments) {
      if (center.y >= seg.y && center.y <= seg.y + seg.h) {
        width = Math.min(width, seg.right - seg.left);
      }
    }
    return U.clamp(Math.min(width * 0.22, (fire.span || 40) * 0.7), 46, 84);
  },

  // O vazio jogável é definido por segmentos de túnel. As massas de rocha
  // ocupam tudo à esquerda/direita, eliminando a antiga "caixa" vazia.
  tunnelSegments: [
    { id: 'mouth',       y: 2440, h: 220, left: 3650, right: 3910 },
    { id: 'turnWTop',    y: 2660, h: 60,  left: 3470, right: 3860 },
    { id: 'branchW',     y: 2720, h: 100, left: 3340, right: 3860 },
    { id: 'turnWBottom', y: 2820, h: 30,  left: 3650, right: 3860 },
    { id: 'turnEUpper',  y: 2850, h: 80,  left: 3650, right: 4100 },
    { id: 'branchE',     y: 2930, h: 100, left: 3650, right: 4420 },
    { id: 'turnEMid',    y: 3030, h: 60,  left: 3650, right: 4100 },
    { id: 'turnWLower',  y: 3090, h: 50,  left: 3490, right: 4100 },
    { id: 'branchCrypt', y: 3140, h: 110, left: 3340, right: 3900 },
    { id: 'cryptExit',   y: 3250, h: 70,  left: 3650, right: 3900 },
    { id: 'sanctuaryRoof', y: 3320, h: 80, left: 3450, right: 4050 },
    { id: 'lowerPassage',  y: 3400, h: 180, left: 3450, right: 6100 }
  ],

  tunnelDividers: [
    { id: 'hangingSpine', x: 3860, y: 2850, w: 140, h: 240 }
  ],

  floorSections: [
    { id: 'ashFloorWest', x: 3300, y: 3580, w: 1080, h: 220 },
    { id: 'ashPitFloor', x: 4380, y: 3680, w: 110, h: 120 },
    { id: 'ashFloorEast', x: 4490, y: 3580, w: 1750, h: 220 }
  ],

  // Chamas ancoradas em rocha. `mount` define a normal que aponta para o ar.
  blueFires: [
    { id: 'wallWestUpper', mount: 'left', x: 3650, y: 2495, span: 72, reach: 34 },
    { id: 'wallEastUpper', mount: 'right', x: 3860, y: 2730, span: 70, reach: 32 },
    { id: 'ledgeWestUpper', mount: 'floor', x: 3460, y: 2820, span: 80, reach: 38 },
    { id: 'wallWestMid', mount: 'left', x: 3650, y: 2945, span: 70, reach: 34 },
    { id: 'ledgeEast', mount: 'floor', x: 4160, y: 3030, span: 86, reach: 38 },
    { id: 'wallEastLower', mount: 'right', x: 3900, y: 3155, span: 64, reach: 32 },
    { id: 'ledgeWestLower', mount: 'floor', x: 3480, y: 3250, span: 80, reach: 38 },
    { id: 'corridorFloorA', mount: 'floor', x: 3990, y: 3580, span: 90, reach: 42 },
    { id: 'pitFloor', mount: 'floor', x: 4385, y: 3680, span: 100, reach: 80 },
    { id: 'corridorCeiling', mount: 'ceiling', x: 4660, y: 3400, span: 140, reach: 100 },
    { id: 'corridorFloorB', mount: 'floor', x: 4930, y: 3580, span: 90, reach: 42 }
  ],

  boneSpikes: [
    { id: 'ashBoneA', x: 5160, y: 3562, w: 84, h: 18, ashBone: true },
    { id: 'ashBoneB', x: 5360, y: 3562, w: 70, h: 18, ashBone: true }
  ],

  // ── fósseis de feras gigantes incrustados na rocha ──
  fossils: [
    { x: 3580, y: 2610, type: 'ribs', size: 1.05, rot: 0.18 },
    { x: 3330, y: 2760, type: 'skull', size: 0.95, rot: -0.12 },
    { x: 4015, y: 2890, type: 'spine', size: 1.25, rot: 0.08 },
    { x: 4290, y: 2960, type: 'skull', size: 1.15, rot: -0.18 },
    { x: 3480, y: 3165, type: 'ribs', size: 1.25, rot: -0.08 },
    { x: 4020, y: 3500, type: 'spine', size: 2.2, rot: Math.PI / 2 }
  ],

  // Antiga fortaleza funerária: cada volume visual corresponde a uma função.
  architecture: [
    { y: 2525, left: 3650, right: 3910, kind: 'mouth' },
    { y: 2750, left: 3470, right: 3860, kind: 'ribArch' },
    { y: 2960, left: 3650, right: 4100, kind: 'brokenArch' },
    { y: 3165, left: 3490, right: 3900, kind: 'ribArch' },
    { y: 3505, left: 5750, right: 5910, kind: 'sanctuary' }
  ],

  chains: [
    { x: 3690, y: 2450, len: 105 }, { x: 3870, y: 2450, len: 145 },
    { x: 3520, y: 2670, len: 82 }, { x: 4050, y: 2860, len: 95 },
    { x: 3540, y: 3100, len: 105 }, { x: 4560, y: 3400, len: 76 },
    { x: 5580, y: 3400, len: 68 }
  ],

  bannerShown: false,
  sanctuaryBannerShown: false,
  installed: false,

  // As fichas e os pontos de aparição pertencem ao Vale, não ao elenco
  // genérico. O registro acontece antes de Enemies.init e o spawn, logo depois,
  // para que World.setDecorActors já reserve espaço para cada criatura.
  enemySpawns: [
    {
      id: 'ashSkeletonA', tier: 11, archetype: 'ashSkeleton',
      x: 4210, y: 3580, min: 4145, max: 4305, map: 'fogo',
      ashValley: true, lightKind: 'blueFire'
    },
    {
      id: 'ashSkeletonB', tier: 11, archetype: 'ashSkeleton',
      x: 5525, y: 3580, min: 5490, max: 5590, map: 'fogo',
      ashValley: true, lightKind: 'blueFire'
    },
    {
      id: 'ashSkeletonC', tier: 11, archetype: 'ashSkeleton',
      x: 3595, y: 2820, min: 3580, max: 3610, map: 'fogo',
      ashValley: true, lightKind: 'blueFire'
    },
    {
      id: 'ashSkeletonD', tier: 11, archetype: 'ashSkeleton',
      x: 3605, y: 3250, min: 3590, max: 3620, map: 'fogo',
      ashValley: true, lightKind: 'blueFire'
    },
    {
      id: 'ashSkeletonE', tier: 11, archetype: 'ashSkeleton',
      x: 3810, y: 3580, min: 3740, max: 3915, map: 'fogo',
      ashValley: true, lightKind: 'blueFire'
    },
    {
      id: 'ashAncientGolem', tier: 14, archetype: 'ancientGolem',
      x: 6020, y: 3580, min: 6020, max: 6020, map: 'fogo',
      isBoss: true, miniBoss: true, ashValley: true, lightKind: 'blueFire'
    }
  ],

  registerEnemyTiers() {
    if (typeof TIERS === 'undefined') return;
    TIERS[11] = {
      name: 'Esqueleto das Chamas Azuis', short: 'o Esqueleto',
      hp: 78, soco: 11, mare: 17, xp: 44, kanji: '骸', element: 'fogo',
      archetype: 'ashSkeleton', lightKind: 'blueFire',
      fireAbsorb: true, fireAbsorbRatio: 0.5, extraHpCap: 0.5,
      guardReduction: 0.25, ribBurnChance: 0.35, ribBurnDamage: 3
    };
    TIERS[14] = {
      name: 'Golem da Chama Ancestral', short: 'o Golem Ancestral',
      hp: 240, soco: 15, mare: 23, xp: 125, kanji: '獄', element: 'fogo',
      boss: true, miniBoss: true, archetype: 'ancientGolem', lightKind: 'blueFire',
      vulcanoDamage: 24, vulcanoBurnDamage: 4,
      cocoonHealPct: 0.10
    };
  },

  spawnEnemies(list) {
    if (!Array.isArray(list) || typeof FieldEnemy === 'undefined') return;
    this.registerEnemyTiers();
    for (const spec of this.enemySpawns) {
      if (list.some(enemy => enemy.id === spec.id)) continue;
      const enemy = new FieldEnemy({ ...spec });
      if (spec.archetype === 'ancientGolem' && typeof Game !== 'undefined' && Game.ancientGolemDefeated) {
        enemy.dead = true;
      }
      list.push(enemy);
    }
  },

  ancientEssenceAvailable(G) {
    return !!G && World.current === 'fogo'
      && G.ancientGolemDefeated === true
      && G.ancientEssenceClaimed !== true;
  },

  playerNearAncientEssence(player) {
    if (!player) return false;
    const essence = this.ANCIENT_ESSENCE;
    return Math.abs(player.x - essence.x) < 76
      && Math.abs((player.y - 20) - (essence.y - 26)) < 82;
  },

  // ════════════════════════ geometria ═══════════════════════════
  /**
   * Abre o poço no piso do reino e constrói a caverna profunda. Feito uma vez,
   * mutando mapFogo antes de qualquer carga do reino do fogo.
   */
  install(map) {
    this.registerEnemyTiers();
    if (!map || this.installed) return;
    this.buildGeometry(map);
  },

  buildGeometry(map = World.mapFogo) {
    if (this.installed || !map) return;
    const S = map.solids;

    // ── abre a boca do poço: parte o piso C e a rocha-mãe em 3730–3910 ──
    const floorC = S.find(s => s.x === 3510 && s.y === 2280 && s.w === 400);
    const bedrock = S.find(s => s.x === 1700 && s.y === 2380 && s.w === 3630);
    if (floorC && bedrock) {
      floorC.w = 220;                                   // 3510–3730 (borda oeste do poço)
      bedrock.w = 2030;                                 // 1700–3730
      S.push({ x: 3910, y: 2380, w: 1420, h: 60, id: 'bedrockE' }); // 3910–5330
    }

    const addSolid = (o) => { if (!S.some(p => p.id === o.id)) S.push(o); };
    const addSpike = (o) => { if (!map.spikes.some(p => p.id === o.id)) map.spikes.push(o); };

    // Lábio estrutural entre a boca e a lava; encosta no leito em y=2380.
    addSolid({ x: 3910, y: 2280, w: 60, h: 100, id: 'ashLavaLip' });

    // Cada segmento cria duas massas de rocha; o espaço negativo entre elas é
    // o túnel. Segmentos adjacentes apenas se tocam, nunca se sobrepõem.
    for (const seg of this.tunnelSegments) {
      addSolid({
        x: this.SHELL_X, y: seg.y, w: seg.left - this.SHELL_X, h: seg.h,
        id: `ashRockW_${seg.id}`, ashTunnelShell: true, ashSide: 'west'
      });
      addSolid({
        x: seg.right, y: seg.y, w: this.SHELL_RIGHT - seg.right, h: seg.h,
        id: `ashRockE_${seg.id}`, ashTunnelShell: true, ashSide: 'east'
      });
    }
    for (const divider of this.tunnelDividers) {
      addSolid({ ...divider, id: `ashDivider_${divider.id}`, ashTunnelDivider: true });
    }
    for (const floor of this.floorSections) {
      addSolid({ ...floor, ashTunnelShell: true, ashSide: 'floor' });
    }
    for (const spike of this.boneSpikes) addSpike({ ...spike });

    // O Vale não possui torii: limpa também os dois checkpoints de versões
    // anteriores sem alterar os pontos de descanso das outras regiões.
    const cp = map.checkpoints;
    if (Array.isArray(cp)) {
      for (let i = cp.length - 1; i >= 0; i--) {
        if (cp[i].id === 'ashValeBase' || cp[i].id === 'ashSanctuary') cp.splice(i, 1);
      }
    }

    // Cada recompensa fica numa área segura depois de uma faixa de fogo.
    const pk = map.pickups;
    const rewards = [
      { id: 'ashRewardWestUpper', x: 3385, y: 2780, type: 'crystal', taken: false },
      { id: 'ashRewardEast', x: 4350, y: 2990, type: 'lotus', taken: false },
      { id: 'ashRewardWestLower', x: 3385, y: 3210, type: 'crystal', taken: false }
    ];
    if (pk) {
      for (const reward of rewards) {
        if (!pk.some(p => p.id === reward.id)) pk.push(reward);
      }
    }

    this.installed = true;
  },

  // ════════════════════════ desenho ═════════════════════════════

  /** Fósseis ao fundo — silhuetas de calcário desgastado. */
  drawFossils(ctx, cam, frames) {
    if (World.current !== 'fogo') return;
    ctx.save();
    ctx.strokeStyle = 'rgba(200,208,216,0.30)';
    ctx.fillStyle = 'rgba(200,208,216,0.16)';
    ctx.lineCap = 'round';
    for (const f of this.fossils) {
      const sx = f.x - cam.x, sy = f.y - cam.y;
      if (sx < -260 || sx > 1220 || sy < -260 || sy > 800) continue;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(f.rot);
      ctx.scale(f.size, f.size);
      if (f.type === 'ribs') this._ribs(ctx);
      else if (f.type === 'skull') this._skull(ctx);
      else this._spine(ctx);
      ctx.restore();
    }
    ctx.restore();
  },

  drawAncientEssenceBase(ctx, cam, frames, G) {
    if (!this.ancientEssenceAvailable(G)) return;
    const essence = this.ANCIENT_ESSENCE;
    const sx = essence.x - cam.x, sy = essence.y - cam.y;
    if (sx < -90 || sx > 1050 || sy < -120 || sy > 650) return;

    const bob = Math.sin(frames * 0.055) * 4;
    ctx.save();
    ctx.translate(sx, sy);

    // Pequeno receptáculo de basalto: comunica que é um artefato, não um
    // pickup automático de vida ou mana.
    ctx.fillStyle = '#111a25';
    ctx.strokeStyle = 'rgba(92,145,185,0.65)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-18, 2); ctx.lineTo(-12, -8); ctx.lineTo(12, -8);
    ctx.lineTo(18, 2); ctx.lineTo(13, 8); ctx.lineTo(-13, 8);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(70,155,220,0.28)';
    ctx.beginPath(); ctx.ellipse(0, -7, 11, 3.5, 0, 0, Math.PI * 2); ctx.fill();

    ctx.translate(0, -31 + bob);
    const core = ctx.createRadialGradient(-3, -4, 1, 0, 0, 15);
    core.addColorStop(0, '#f3fdff');
    core.addColorStop(0.28, '#8fe7ff');
    core.addColorStop(0.72, '#397fdd');
    core.addColorStop(1, 'rgba(31,73,160,0.1)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.bezierCurveTo(13, -7, 12, 7, 0, 16);
    ctx.bezierCurveTo(-12, 7, -13, -7, 0, -18);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(205,247,255,0.88)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  },

  drawAncientEssenceEmissive(ctx, cam, frames, G) {
    if (!this.ancientEssenceAvailable(G)) return;
    const essence = this.ANCIENT_ESSENCE;
    const sx = essence.x - cam.x, sy = essence.y - cam.y - 31 + Math.sin(frames * 0.055) * 4;
    if (sx < -100 || sx > 1060 || sy < -100 || sy > 640) return;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(sx, sy, 2, sx, sy, 54);
    glow.addColorStop(0, 'rgba(190,245,255,0.74)');
    glow.addColorStop(0.25, 'rgba(70,185,255,0.34)');
    glow.addColorStop(1, 'rgba(30,90,255,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(sx, sy, 54, 0, Math.PI * 2); ctx.fill();

    for (let i = 0; i < 3; i++) {
      const phase = frames * (0.045 + i * 0.006) + i * 2.1;
      const orbit = 18 + i * 4;
      const ox = sx + Math.cos(phase) * orbit;
      const oy = sy + Math.sin(phase) * orbit * 0.42;
      ctx.fillStyle = `rgba(${120 + i * 25},${205 + i * 12},255,${0.5 - i * 0.08})`;
      ctx.beginPath(); ctx.arc(ox, oy, 2.2 - i * 0.25, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  },

  drawAncientEssencePrompt(ctx, cam, frames, G) {
    if (!this.ancientEssenceAvailable(G) || G.dialog || !this.playerNearAncientEssence(G.player)) return;
    const essence = this.ANCIENT_ESSENCE;
    const sx = essence.x - cam.x, sy = essence.y - cam.y - 82 + Math.sin(frames * 0.06) * 2;
    const alpha = 0.76 + Math.sin(frames * 0.1) * 0.16;

    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(4,12,24,0.84)';
    ctx.fillRect(sx - 94, sy - 12, 188, 25);
    ctx.strokeStyle = `rgba(130,221,255,${alpha})`;
    ctx.strokeRect(sx - 93.5, sy - 11.5, 187, 24);
    ctx.fillStyle = `rgba(218,249,255,${alpha})`;
    ctx.font = '700 12px "Segoe UI", sans-serif';
    ctx.fillText('↑ tocar a Essência Ancestral', sx, sy + 1);
    ctx.restore();
  },

  drawBackgroundDetails(ctx, cam, frames) {
    if (World.current !== 'fogo') return;
    const blend = this.transitionAt(cam.y + 270);
    if (blend <= 0.001) return;
    ctx.save();
    ctx.globalAlpha = blend;
    ctx.translate(-cam.x, -cam.y);
    // Galeria remota acompanha o eixo sinuoso do túnel, sem formar um bloco.
    for (const seg of this.tunnelSegments) {
      const inset = Math.min(54, (seg.right - seg.left) * 0.12);
      const g = ctx.createLinearGradient(seg.left, 0, seg.right, 0);
      g.addColorStop(0, 'rgba(18,32,55,0.04)');
      g.addColorStop(0.5, 'rgba(2,6,15,0.42)');
      g.addColorStop(1, 'rgba(18,32,55,0.04)');
      ctx.fillStyle = g;
      ctx.fillRect(seg.left + inset, seg.y, seg.right - seg.left - inset * 2, seg.h + 1);
    }
    // Silhueta enterrada no santuário inferior.
    ctx.strokeStyle = 'rgba(160,185,210,0.10)';
    ctx.lineWidth = 14;
    ctx.beginPath(); ctx.moveTo(3470, 3535); ctx.bezierCurveTo(3650, 3470, 4030, 3470, 4230, 3540); ctx.stroke();
    for (let x = 3560; x < 4200; x += 92) {
      ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(x, 3510); ctx.quadraticCurveTo(x - 26, 3395, x + 14, 3345); ctx.stroke();
    }
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = blend;
    this.drawFossils(ctx, cam, frames);
    ctx.restore();
  },

  _ribs(ctx) {
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(0, -70); ctx.lineTo(4, 90); ctx.stroke();
    ctx.lineWidth = 4;
    for (let i = 0; i < 6; i++) {
      const y = -50 + i * 26, span = 44 - i * 3, droop = 30 + i * 5;
      ctx.beginPath(); ctx.moveTo(2, y);
      ctx.bezierCurveTo(-span * 0.5, y + 4, -span, y + droop * 0.6, -span * 0.8, y + droop); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(2, y);
      ctx.bezierCurveTo(span * 0.5, y + 4, span, y + droop * 0.6, span * 0.8, y + droop); ctx.stroke();
    }
  },

  _skull(ctx) {
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-34, -10);
    ctx.bezierCurveTo(-40, -34, 6, -46, 30, -32);
    ctx.bezierCurveTo(62, -22, 60, 14, 34, 22);
    ctx.bezierCurveTo(10, 30, -28, 20, -34, -10);
    ctx.stroke();
    ctx.beginPath(); ctx.ellipse(20, -14, 12, 10, -0.2, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(46, 2, 4, 6, 0, 0, 7); ctx.fill();
    ctx.lineWidth = 3;
    for (const dx of [8, 20, 32]) { ctx.beginPath(); ctx.moveTo(dx, 20); ctx.lineTo(dx + 2, 38); ctx.stroke(); }
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-6, -40); ctx.lineTo(2, -18); ctx.lineTo(-4, -2); ctx.stroke();
  },

  _spine(ctx) {
    ctx.lineWidth = 3;
    for (let i = 0; i < 9; i++) {
      const y = -80 + i * 20, x = Math.sin(i * 0.6) * 8;
      ctx.beginPath(); ctx.ellipse(x, y, 11, 7, 0, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y - 7); ctx.lineTo(x - 4, y - 20); ctx.stroke();
    }
  },

  /** Verniz de basalto: fissuras azul-fósforo nas superfícies da caverna. */
  drawBasalt(ctx, cam, frames) {
    if (World.current !== 'fogo') return;
    const pulse = 0.5 + 0.5 * Math.sin(frames * 0.05);
    for (const s of World.solids) {
      if (s.ashTunnelShell || s.ashTunnelDivider) continue;
      if (s.y < this.DEEP_Y || s.w < 60) continue;
      const sx = s.x - cam.x, sy = s.y - cam.y;
      if (sx > 980 || sx + s.w < -20 || sy > 560 || sy + s.h < -20) continue;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(70,150,230,${0.28 + 0.22 * pulse})`;
      ctx.lineWidth = 1.4;
      ctx.shadowColor = 'rgba(60,160,255,0.7)';
      ctx.shadowBlur = 6;
      const n = Math.max(1, Math.floor(s.w / 90));
      for (let i = 0; i < n; i++) {
        const fx = s.x + 30 + i * (s.w / n);
        let px = fx - cam.x, py = sy + 2;
        ctx.beginPath(); ctx.moveTo(px, py);
        for (let seg = 0; seg < 4; seg++) {
          px += (WorldHash(fx + seg * 13, s.y + seg) - 0.5) * 26;
          py += 5 + seg * 2;
          ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
  },

  drawTunnelShell(ctx, cam) {
    if (World.current !== 'fogo') return;
    const blend = this.transitionAt(cam.y + 270);
    const first = this.tunnelSegments[0];
    ctx.save();
    ctx.translate(-cam.x, -cam.y);
    ctx.globalAlpha = 1;
    const warmMid = [45, 23, 23], coldMid = [21, 28, 41];
    const warmEdge = [20, 10, 13], coldEdge = [9, 13, 22];
    const rock = ctx.createLinearGradient(this.SHELL_X, 0, this.SHELL_RIGHT, 0);
    rock.addColorStop(0, U.rgb(U.mixRGB(warmEdge, coldEdge, blend), 1));
    rock.addColorStop(0.28, U.rgb(U.mixRGB(warmMid, coldMid, blend), 1));
    rock.addColorStop(0.72, U.rgb(U.mixRGB(warmMid, coldMid, blend), 1));
    rock.addColorStop(1, U.rgb(U.mixRGB(warmEdge, coldEdge, blend), 1));
    ctx.fillStyle = rock;
    for (const seg of this.tunnelSegments) {
      ctx.fillRect(this.SHELL_X, seg.y, seg.left - this.SHELL_X, seg.h + 1);
      ctx.fillRect(seg.right, seg.y, this.SHELL_RIGHT - seg.right, seg.h + 1);
    }
    for (const floor of this.floorSections) {
      ctx.fillRect(floor.x, floor.y, floor.w, floor.h);
    }
    for (const divider of this.tunnelDividers) {
      ctx.fillRect(divider.x, divider.y, divider.w, divider.h);
      ctx.strokeStyle = 'rgba(4,7,13,0.82)';
      ctx.lineWidth = 10;
      ctx.strokeRect(divider.x + 5, divider.y, divider.w - 10, divider.h - 4);
      ctx.strokeStyle = 'rgba(118,139,163,0.20)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(divider.x + 18, divider.y + 4);
      ctx.lineTo(divider.x + 32, divider.y + divider.h * 0.42);
      ctx.lineTo(divider.x + 22, divider.y + divider.h - 12);
      ctx.moveTo(divider.x + divider.w - 22, divider.y + 5);
      ctx.lineTo(divider.x + divider.w - 36, divider.y + divider.h * 0.55);
      ctx.lineTo(divider.x + divider.w - 18, divider.y + divider.h - 10);
      ctx.stroke();
    }

    const traceWall = (side) => {
      const key = side === 'west' ? 'left' : 'right';
      ctx.beginPath();
      ctx.moveTo(first[key], first.y);
      for (let i = 0; i < this.tunnelSegments.length; i++) {
        const seg = this.tunnelSegments[i];
        if (i > 0) ctx.lineTo(seg[key], seg.y);
        ctx.lineTo(seg[key], seg.y + seg.h);
      }
      ctx.stroke();
    };
    ctx.strokeStyle = 'rgba(4,7,13,0.88)';
    ctx.lineWidth = 13;
    traceWall('west'); traceWall('east');
    ctx.strokeStyle = 'rgba(105,130,158,0.28)';
    ctx.lineWidth = 2.2;
    traceWall('west'); traceWall('east');

    // Blocos, juntas e rachaduras quebram as paredes sem criar novos pisos.
    ctx.strokeStyle = 'rgba(75,91,113,0.16)';
    ctx.lineWidth = 1.2;
    for (const seg of this.tunnelSegments) {
      for (let y = seg.y + 34; y < seg.y + seg.h; y += 46) {
        ctx.beginPath();
        ctx.moveTo(seg.left - 58, y);
        ctx.lineTo(seg.left - 8, y + ((y / 46) % 2 ? 5 : -3));
        ctx.moveTo(seg.right + 8, y - 2);
        ctx.lineTo(seg.right + 58, y + 4);
        ctx.stroke();
      }
    }
    // O piso é rocha estrutural contínua, interrompida apenas pelo poço azul.
    for (const floor of this.floorSections) {
      ctx.strokeStyle = 'rgba(5,9,16,0.94)';
      ctx.lineWidth = floor.id === 'ashPitFloor' ? 7 : 11;
      ctx.beginPath(); ctx.moveTo(floor.x, floor.y); ctx.lineTo(floor.x + floor.w, floor.y); ctx.stroke();
      ctx.strokeStyle = 'rgba(91,126,160,0.30)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(floor.x, floor.y - 1); ctx.lineTo(floor.x + floor.w, floor.y - 1); ctx.stroke();
      const cracks = Math.max(1, Math.floor(floor.w / 170));
      ctx.strokeStyle = 'rgba(64,94,132,0.22)';
      ctx.lineWidth = 1.4;
      for (let i = 0; i < cracks; i++) {
        const x = floor.x + 48 + i * (floor.w / cracks);
        ctx.beginPath(); ctx.moveTo(x, floor.y + 2); ctx.lineTo(x - 10, floor.y + 19); ctx.lineTo(x - 3, floor.y + 34); ctx.stroke();
      }
    }
    ctx.restore();
  },

  drawArchitecture(ctx, cam) {
    if (World.current !== 'fogo') return;
    const blend = this.transitionAt(cam.y + 270);
    if (blend <= 0.001) return;
    ctx.save();
    ctx.globalAlpha = blend;
    // A alcova além do arco é um espaço real e seguro, não apenas um símbolo.
    const shrineX = 5910 - cam.x, shrineY = 3400 - cam.y;
    if (shrineX < 1040 && shrineX + 190 > -80 && shrineY < 620 && shrineY + 180 > -80) {
      const recess = ctx.createLinearGradient(shrineX, 0, shrineX + 190, 0);
      recess.addColorStop(0, 'rgba(4,8,16,0.72)');
      recess.addColorStop(1, 'rgba(12,20,35,0.94)');
      ctx.fillStyle = recess;
      ctx.fillRect(shrineX, shrineY, 190, 180);
      ctx.strokeStyle = 'rgba(132,156,181,0.24)';
      ctx.lineWidth = 3;
      ctx.strokeRect(shrineX + 12, shrineY + 12, 164, 156);
      ctx.fillStyle = 'rgba(170,194,214,0.20)';
      ctx.font = '700 42px serif';
      ctx.textAlign = 'center';
      ctx.fillText('祠', shrineX + 95, shrineY + 72);
      ctx.strokeStyle = 'rgba(180,194,202,0.26)';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(shrineX + 95, shrineY + 88, 48, Math.PI, Math.PI * 2); ctx.stroke();
    }
    for (const a of this.architecture) {
      const left = a.left - cam.x, right = a.right - cam.x, y = a.y - cam.y;
      if (right < -80 || left > 1040 || y < -140 || y > 680) continue;
      const mid = (left + right) * 0.5;
      ctx.fillStyle = 'rgba(24,29,40,0.88)';
      ctx.fillRect(left - 18, y - 22, 18, 96);
      ctx.fillRect(right, y - 22, 18, 96);
      ctx.strokeStyle = a.kind === 'ribArch' ? 'rgba(184,191,191,0.42)' : 'rgba(91,108,134,0.48)';
      ctx.lineWidth = a.kind === 'sanctuary' ? 11 : 7;
      ctx.beginPath();
      ctx.moveTo(left, y + 42);
      ctx.lineTo(left, y + 8);
      if (a.kind === 'brokenArch') {
        ctx.quadraticCurveTo(mid - 65, y - 44, mid - 18, y - 12);
        ctx.moveTo(mid + 38, y - 19);
        ctx.quadraticCurveTo(mid + 78, y - 34, right, y + 8);
      } else {
        ctx.quadraticCurveTo(mid, y - 58, right, y + 8);
      }
      ctx.lineTo(right, y + 42);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(74,94,122,0.28)';
      ctx.lineWidth = 2;
      ctx.strokeRect(left - 12, y - 16, 12, 84);
      ctx.strokeRect(right, y - 16, 12, 84);
    }
    ctx.lineWidth = 2;
    for (const c of this.chains) {
      const x = c.x - cam.x, y = c.y - cam.y;
      if (x < -40 || x > 1000) continue;
      for (let i = 0; i < c.len; i += 10) {
        ctx.strokeStyle = i % 20 ? 'rgba(75,88,108,0.58)' : 'rgba(112,126,145,0.58)';
        ctx.beginPath(); ctx.ellipse(x + Math.sin(i * 0.12) * 2, y + i, 3, 6, i % 20 ? 0 : Math.PI / 2, 0, 7); ctx.stroke();
      }
    }
    ctx.restore();
  },

  drawForegroundEffects(ctx, cam, frames) {
    if (World.current !== 'fogo') return;
    this.drawEntrance(ctx, cam, frames);
    this.drawBlueFires(ctx, cam, frames);
  },

  drawTerrainEmissive(ctx, cam, frames) {
    this.drawBasalt(ctx, cam, frames);
    this.drawBoneSpikeEmissive(ctx, cam, frames);
  },

  drawBoneSpikeEmissive(ctx, cam, frames) {
    if (World.current !== 'fogo') return;
    const pulse = 0.42 + Math.sin(frames * 0.055) * 0.08;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(190,220,235,${pulse})`;
    ctx.lineWidth = 1.15;
    ctx.shadowColor = 'rgba(100,165,220,0.46)';
    ctx.shadowBlur = 4;
    for (const sp of this.boneSpikes) {
      const sx = sp.x - cam.x, sy = sp.y - cam.y;
      if (sx + sp.w < -30 || sx > 990 || sy < -40 || sy > 580) continue;
      const n = Math.max(2, Math.round(sp.w / 14));
      for (let i = 0; i < n; i++) {
        const cell = sp.w / n, px = sx + (i + 0.5) * cell;
        const lean = ((i % 3) - 1) * 2.4;
        ctx.beginPath();
        ctx.moveTo(px - Math.min(6, cell * 0.38), sy + sp.h);
        ctx.quadraticCurveTo(px - 2 + lean, sy + sp.h * 0.42, px + lean, sy + (i % 2 ? 2 : 0));
        ctx.quadraticCurveTo(px + 3 + lean, sy + sp.h * 0.46, px + Math.min(6, cell * 0.38), sy + sp.h);
        ctx.stroke();
      }
    }
    ctx.restore();
  },

  drawBlueFireBases(ctx, cam, frames) {
    if (World.current !== 'fogo') return;
    for (const bf of this.blueFires) {
      const bounds = this.blueFireBounds(bf);
      if (bounds.x + bounds.w < cam.x - 50 || bounds.x > cam.x + 1010 ||
          bounds.y + bounds.h < cam.y - 50 || bounds.y > cam.y + 590) continue;
      const frame = this.blueFireFrame(bf);
      ctx.save();
      ctx.translate(frame.cx - cam.x, frame.cy - cam.y);
      ctx.rotate(frame.angle);
      ctx.fillStyle = '#080e18';
      ctx.fillRect(-frame.span * 0.5 - 4, -3, frame.span + 8, 7);
      ctx.fillStyle = 'rgba(55,91,132,0.82)';
      ctx.fillRect(-frame.span * 0.5, -6, frame.span, 4);
      ctx.strokeStyle = 'rgba(75,154,228,0.42)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-frame.span * 0.5 + 5, -6);
      ctx.lineTo(-frame.span * 0.16, -10 - Math.sin(frames * 0.09 + bf.x) * 2);
      ctx.lineTo(frame.span * 0.18, -7);
      ctx.lineTo(frame.span * 0.5 - 5, -6);
      ctx.stroke();
      ctx.restore();
    }
  },

  /** Marca a boca do poço com um sopro frio e a seta de descida. */
  drawEntrance(ctx, cam, frames) {
    if (World.current !== 'fogo') return;
    const m = this.MOUTH;
    const sx = m.x - cam.x, sy = m.y - cam.y;
    if (sx < -80 || sx > 1040) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // ar frio subindo do poço
    for (let i = 0; i < 4; i++) {
      const p = ((frames * 0.6 + i * 30) % 90) / 90;
      ctx.fillStyle = `rgba(90,170,255,${0.18 * (1 - p)})`;
      ctx.beginPath();
      ctx.ellipse(sx + Math.sin(frames * 0.05 + i) * 10, sy - p * 60, 10 - p * 4, 5, 0, 0, 7);
      ctx.fill();
    }
    // seta de descida pulsante
    ctx.fillStyle = `rgba(150,210,255,${0.5 + 0.4 * Math.sin(frames * 0.12)})`;
    ctx.font = '700 20px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('↓', sx, sy - 26 + Math.sin(frames * 0.1) * 3);
    ctx.font = '700 11px "Segoe UI", sans-serif';
    ctx.fillText('深', sx, sy - 44);
    ctx.restore();
  },

  /** Chamas de fogo azul + brilho aditivo (passe de frente). */
  drawBlueFires(ctx, cam, frames) {
    if (World.current !== 'fogo') return;
    for (const bf of this.blueFires) {
      const bounds = this.blueFireBounds(bf);
      if (bounds.x + bounds.w < cam.x - 60 || bounds.x > cam.x + 1020 ||
          bounds.y + bounds.h < cam.y - 60 || bounds.y > cam.y + 600) continue;
      const frame = this.blueFireFrame(bf);
      const reach = bf.reach || 38;
      ctx.save();
      ctx.translate(frame.cx - cam.x, frame.cy - cam.y);
      ctx.rotate(frame.angle);
      ctx.globalCompositeOperation = 'lighter';
      const glowRadius = Math.max(frame.span * 0.72, reach * 0.88);
      const glow = ctx.createRadialGradient(0, -reach * 0.34, 2, 0, -reach * 0.34, glowRadius);
      glow.addColorStop(0, `rgba(0,140,255,${0.30 + 0.08 * Math.sin(frames * 0.1)})`);
      glow.addColorStop(1, 'rgba(0,140,255,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(0, -reach * 0.34, glowRadius, 0, Math.PI * 2); ctx.fill();

      const tongues = Math.max(3, Math.floor(frame.span / 22));
      for (let i = 0; i < tongues; i++) {
        const fx = -frame.span * 0.5 + 8 + i * ((frame.span - 16) / (tongues - 1));
        const flick = Math.sin(frames * 0.22 + i * 1.7);
        const h = reach * (0.72 + 0.28 * (0.5 + 0.5 * flick));
        const sway = flick * Math.min(6, reach * 0.12);
        const halfW = Math.min(7, Math.max(4, frame.span / tongues * 0.28));
        ctx.beginPath();
        ctx.moveTo(fx - halfW, 4);
        ctx.quadraticCurveTo(fx - halfW * 0.65 + sway, -h * 0.5, fx + sway, -h);
        ctx.quadraticCurveTo(fx + halfW * 0.65 + sway, -h * 0.5, fx + halfW, 4);
        ctx.closePath();
        const fg = ctx.createLinearGradient(fx, 0, fx, -h);
        fg.addColorStop(0, 'rgba(30,80,255,0.65)');
        fg.addColorStop(0.55, 'rgba(60,180,255,0.95)');
        fg.addColorStop(1, 'rgba(200,240,255,0.2)');
        ctx.fillStyle = fg;
        ctx.fill();
        ctx.fillStyle = 'rgba(220,245,255,0.6)';
        ctx.beginPath();
        ctx.ellipse(fx + sway * 0.5, -h * 0.35, 2, h * 0.28, 0, 0, 7);
        ctx.fill();
      }
      ctx.restore();
    }
  },

  /** Aura de fogo azul contornando o Rōnin queimado espiritualmente. */
  drawBurn(ctx, p, cam) {
    if (!p.blueFireBurnT || p.blueFireBurnT <= 0) return;
    const sx = p.x - cam.x, sy = p.y - cam.y;
    const k = p.blueFireBurnT / 60;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) {
      const a = (p.t || 0) * 0.3 + i * 1.26;
      const fx = sx + Math.cos(a) * 10;
      const fy = sy - 16 + Math.sin(a) * 14 - 4;
      const h = 12 + 8 * Math.sin((p.t || 0) * 0.4 + i);
      const fg = ctx.createLinearGradient(fx, fy, fx, fy - h);
      fg.addColorStop(0, `rgba(60,170,255,${0.7 * k})`);
      fg.addColorStop(1, 'rgba(210,240,255,0)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.moveTo(fx - 3, fy);
      ctx.quadraticCurveTo(fx, fy - h, fx + 3, fy);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  },

  // ════════════════════════ lógica ══════════════════════════════
  update(G) {
    const p = G.player;
    if (!Number.isFinite(p.blueFireBurnT)) p.blueFireBurnT = 0;
    if (World.current !== 'fogo') { if (p.blueFireBurnT) p.blueFireBurnT = 0; return; }
    if (p.blueFireBurnT > 0) p.blueFireBurnT--;

    if (!this.bannerShown && this.inValley(p.x, p.y)) {
      this.bannerShown = true;
      Hud.showBanner('骨', 'Vale dos Ossos', 'O fogo azul queima a carne e a alma.');
    }
    if (!this.sanctuaryBannerShown && p.y > 3380 && p.x > 5910) {
      this.sanctuaryBannerShown = true;
      Hud.showBanner('祠', 'Santuário dos Ossos', 'A chama não atravessa este limiar.');
    }

    for (const bf of this.blueFires) {
      if (U.aabb(p.rect, this.blueFireBounds(bf))) {
        if (p.blueFireBurnT <= 0) {
          const ka = G.equipped === 'ka';
          // fogo espiritual: o Amuleto de Fogo reduz pela metade, nunca anula
          p.hp = Math.max(1, p.hp - (ka ? 3 : 6));
          if (!ka) p.mp = Math.max(0, p.mp - 1);
          p.blueFireBurnT = 60;
          Sfx.noise({ dur: 0.4, vol: 0.14, fc: 900, fc2: 2400, type: 'bandpass', q: 1.2 });
          Sfx.tone({ f: 320, f2: 180, dur: 0.3, type: 'sine', vol: 0.08 });
          if (Hud.toast) Hud.toast(ka ? '骨 fogo azul atenuado (−3)' : '骨 fogo azul (−6 PV · −1 PM)', '#7ac8ff');
          G.cam.shake = Math.max(G.cam.shake, 4);
          Particles.burst(p.x, p.y - 16, 10, () => ({
            x: p.x + U.rand(-10, 10), y: p.y - U.rand(0, 30),
            vx: U.rand(-1.2, 1.2), vy: U.rand(-2, -0.5),
            life: 34, size: 2.4, color: 'rgba(120,200,255,0.95)', type: 'wisp'
          }));
        }
      }
      const center = this.blueFireCenter(bf);
      if (Math.abs(center.x - G.cam.x - 480) < 620 && Math.abs(center.y - G.cam.y - 270) < 420 && Math.random() < 0.18) {
        const ember = this.blueFirePoint(bf, Math.random(), U.rand(3, Math.min(20, (bf.reach || 38) * 0.45)));
        const drift = U.rand(-0.35, 0.35), speed = U.rand(0.75, 1.5);
        Particles.spawn({
          x: ember.x, y: ember.y,
          vx: ember.nx * speed + ember.tx * drift,
          vy: ember.ny * speed + ember.ty * drift,
          life: 40, size: U.rand(1.4, 2.4),
          color: 'rgba(120,200,255,0.92)', type: 'wisp'
        });
      }
    }

    if (this.inValley(p.x, p.y) && Math.random() < 0.22) {
      Particles.spawn({
        x: G.cam.x + U.rand(0, 960), y: G.cam.y + U.rand(280, 560),
        vx: U.rand(-0.15, 0.15), vy: U.rand(-0.4, -0.2),
        life: 160, size: U.rand(3, 6),
        color: 'rgba(80,150,255,0.18)', type: 'mist'
      });
    }
  }
};

function WorldHash(x, y) {
  let h = (Math.floor(x) * 374761393 + Math.floor(y) * 668265263) | 0;
  h = (h ^ (h >> 13)) * 1274126177 | 0;
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
}

window.AshValley = AshValley;
