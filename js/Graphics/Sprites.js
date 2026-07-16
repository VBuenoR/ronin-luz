'use strict';

/**
 * Biblioteca de Renderização de Sprites Vetoriais para Rōnin de Luz.
 * Centraliza o desenho geométrico do Samurai de Luz e dos Espíritos Elementais (Água/Fogo).
 */

// ─── Samurais Elementais (Água / Fogo) ──────────────────────────────────

/**
 * Renderizador unificado para Espíritos Elementais.
 * Elimina 100% da duplicação de geometria entre os espíritos de água e de fogo.
 */
function drawElementalSamurai(ctx, x, y, s, tier, o = {}, isFire) {
  const t = o.t || 0;
  const pose = o.pose || 'idle';
  const facing = o.facing || 1;
  const alpha = o.alpha === undefined ? 1 : o.alpha;
  if (alpha <= 0) return;

  const cfg = TIERS[tier];
  const boss = tier === 9 || tier === 10;
  const fly = cfg && cfg.fly;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * facing, s);
  ctx.globalAlpha = alpha;

  let squash = 1, lean = 0;
  if (pose === 'walk') squash = 1 + Math.sin(t * 0.25) * 0.05;
  if (pose === 'attack') lean = 0.3;
  if (pose === 'defend') squash = 0.86;
  if (pose === 'hurt') { squash = 0.8; lean = -0.25; }
  if (pose === 'magic') squash = 1.1;
  if (pose === 'charge') squash = 0.9 + Math.sin(t * 0.4) * 0.06;

  const hover = fly ? Math.sin(t * 0.09) * 4 - 16 : 0;
  const cx = lean * 12, cy = -22 + hover;

  // 1. Aura de Reivindicação
  if (o.aura > 0) {
    const ac = o.auraCol || '255,216,120';
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(${ac},${o.aura * (0.45 + 0.3 * Math.sin(t * 0.18))})`;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = `rgba(${ac},0.9)`;
    ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(cx, cy, 27 + Math.sin(t * 0.18) * 3, 0, 7); ctx.stroke();
    ctx.restore();
  }

  // Defesa elemental persistente: a geometria acompanha o corpo e deixa as
  // partículas livres para responder apenas ao início e ao impacto do escudo.
  if (pose === 'defend') {
    const guardRgb = isFire ? '255,146,76' : '122,218,255';
    const gp = 0.34 + 0.12 * Math.sin(t * 0.18);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const gg = ctx.createRadialGradient(cx, cy, 3, cx, cy, 31);
    gg.addColorStop(0, 'rgba(' + guardRgb + ',' + gp * 0.32 + ')');
    gg.addColorStop(1, 'rgba(' + guardRgb + ',0)');
    ctx.fillStyle = gg;
    ctx.beginPath(); ctx.ellipse(cx, cy, 29, 33, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(' + guardRgb + ',' + gp + ')';
    ctx.lineWidth = 1.7;
    ctx.shadowColor = 'rgba(' + guardRgb + ',0.75)';
    ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(cx, cy, 25 + Math.sin(t * 0.14) * 1.5, -1.25, 1.5); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  if (pose === 'magic') {
    const magicRgb = isFire ? '255,150,78' : (tier === 7 ? '214,198,255' : '130,218,255');
    const mp = 0.42 + 0.16 * Math.sin(t * 0.2);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const mg = ctx.createRadialGradient(cx, cy - 12, 2, cx, cy - 12, 28);
    mg.addColorStop(0, 'rgba(' + magicRgb + ',' + mp * 0.56 + ')');
    mg.addColorStop(1, 'rgba(' + magicRgb + ',0)');
    ctx.fillStyle = mg;
    ctx.beginPath(); ctx.arc(cx, cy - 12, 28, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(' + magicRgb + ',' + mp + ')';
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(cx, cy - 12, 19 + Math.sin(t * 0.16) * 2, 0, 7); ctx.stroke();
    ctx.restore();
  }

  // 2. Brilho Quente (Apenas Elemento Fogo)
  if (isFire) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const hg = ctx.createRadialGradient(cx, cy, 2, cx, cy, 32);
    hg.addColorStop(0, 'rgba(255,140,60,0.22)');
    hg.addColorStop(1, 'rgba(255,140,60,0)');
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.arc(cx, cy, 32, 0, 7); ctx.fill();
    ctx.restore();
  }

  // 3. Desenho do Corpo Principal (Bolha Líquida / Magma Ondulante)
  const N = 10, pts = [];
  const rx = fly ? 11 : 15, ry = fly ? 16 : 19;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const wobSpeed = isFire ? 0.13 : 0.09;
    const wob = 1 + 0.075 * Math.sin(t * wobSpeed + i * 2.3) + (!isFire && pose === 'walk' ? 0.05 * Math.sin(t * 0.22 + i) : 0);
    const stretch = fly && Math.sin(a) < 0 ? 1.35 : 1; // Topo estendido em chama
    pts.push({
      x: cx + Math.cos(a) * rx * wob,
      y: cy + Math.sin(a) * ry * wob * squash * stretch
    });
  }

  ctx.beginPath();
  ctx.moveTo((pts[N - 1].x + pts[0].x) / 2, (pts[N - 1].y + pts[0].y) / 2);
  for (let i = 0; i < N; i++) {
    const p = pts[i], q = pts[(i + 1) % N];
    ctx.quadraticCurveTo(p.x, p.y, (p.x + q.x) / 2, (p.y + q.y) / 2);
  }
  ctx.closePath();

  // Aplica cores e gradientes específicos do elemento
  const bg = ctx.createRadialGradient(cx - 3, cy - 8, 2, cx, cy, 24);
  const abyssal = tier === 4;
  const misty = tier === 7;

  if (isFire) {
    bg.addColorStop(0, 'rgba(255,224,140,0.98)');
    bg.addColorStop(0.5, 'rgba(255,120,40,0.95)');
    bg.addColorStop(1, 'rgba(140,30,10,0.92)');
  } else {
    if (misty) {
      bg.addColorStop(0, 'rgba(240,250,255,0.85)');
      bg.addColorStop(0.55, 'rgba(190,215,240,0.6)');
      bg.addColorStop(1, 'rgba(140,170,210,0.35)');
    } else if (abyssal) {
      bg.addColorStop(0, 'rgba(120,160,225,0.95)');
      bg.addColorStop(0.55, 'rgba(45,60,140,0.92)');
      bg.addColorStop(1, 'rgba(12,18,60,0.92)');
    } else {
      bg.addColorStop(0, 'rgba(160,228,255,0.95)');
      bg.addColorStop(0.55, 'rgba(70,150,220,0.9)');
      bg.addColorStop(1, 'rgba(22,70,150,0.88)');
    }
  }

  ctx.fillStyle = bg;
  ctx.fill();
  ctx.strokeStyle = isFire
    ? 'rgba(255,190,110,0.7)'
    : misty ? 'rgba(230,245,255,0.5)' : abyssal ? 'rgba(150,190,255,0.6)' : 'rgba(190,240,255,0.7)';
  ctx.lineWidth = 1.3;
  ctx.stroke();

  // 4. Efeitos Internos Procedurais
  if (isFire) {
    // Fissuras de magma resfriando
    ctx.strokeStyle = 'rgba(60,12,6,0.65)';
    ctx.lineWidth = 1.4;
    for (let j = 0; j < 3; j++) {
      const fx0 = cx - 8 + j * 7, fy0 = cy + 4 + Math.sin(t * 0.07 + j) * 2;
      ctx.beginPath();
      ctx.moveTo(fx0, fy0);
      ctx.lineTo(fx0 + 4, fy0 + 5);
      ctx.lineTo(fx0 + 8, fy0 + 3);
      ctx.stroke();
    }
  } else {
    // Bolhas subindo dentro do corpo de água
    ctx.fillStyle = 'rgba(230,250,255,0.5)';
    for (let j = 0; j < 3; j++) {
      const by = cy + 14 - ((t * 0.35 + j * 11) % 26);
      const bx = cx + Math.sin(t * 0.05 + j * 2.1) * 7;
      ctx.beginPath(); ctx.arc(bx, by, 1.6 + j * 0.5, 0, 7); ctx.fill();
    }
    // Véus extras de névoa do Yūrei
    if (misty) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let v = 0; v < 3; v++) {
        const va = t * 0.03 + v * 2.1;
        ctx.fillStyle = `rgba(220,240,255,${0.10 + 0.05 * Math.sin(t * 0.07 + v)})`;
        ctx.beginPath();
        ctx.ellipse(cx + Math.cos(va) * 14, cy + 8 + Math.sin(va) * 6, 14, 5, va * 0.4, 0, 7);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // 5. Asas de Chamas (Exclusivo da Vespa de Magma voadora)
  if (isFire && fly) {
    const flap = Math.sin(t * 0.5) * 0.6;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(cx + side * 10, cy - 4);
      ctx.rotate(side * (0.5 + flap));
      const wg = ctx.createLinearGradient(0, 0, side * 18, -10);
      wg.addColorStop(0, 'rgba(255,170,80,0.85)');
      wg.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.fillStyle = wg;
      ctx.beginPath();
      ctx.ellipse(side * 10, -4, 13, 5.5, side * 0.4, 0, 7);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  // 6. Braço/Pseudópode de Ataque
  if (pose === 'attack') {
    const ext = o.armT === undefined ? 1 : o.armT;
    const fx = cx + 10 + ext * 16, fy = cy + 2;
    ctx.strokeStyle = isFire ? 'rgba(255,150,70,0.9)' : 'rgba(120,200,250,0.9)';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx + 8, cy - 2);
    ctx.quadraticCurveTo(cx + 14, cy - 8, fx, fy);
    ctx.stroke();
    ctx.fillStyle = isFire ? 'rgba(255,220,140,0.95)' : 'rgba(190,235,255,0.95)';
    ctx.beginPath(); ctx.arc(fx, fy, 5.5, 0, 7); ctx.fill();
  }
  if (pose === 'magic') {
    ctx.strokeStyle = isFire ? 'rgba(255,170,90,0.85)' : 'rgba(150,215,255,0.8)';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - 8, cy - 6); ctx.lineTo(cx - 15, cy - 22); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 8, cy - 6); ctx.lineTo(cx + 15, cy - 22); ctx.stroke();
  }

  // 7. Armadura de Obsidiana (Fogo) ou Metal Afogado (Água)
  const ARM = isFire ? '#171019' : '#141a28';
  const ARM2 = isFire ? '#4a3238' : '#3d4a66';

  if (!isFire && misty) {
    // Amigasa (chapéu de palha do Yūrei)
    ctx.fillStyle = 'rgba(90,80,55,0.9)';
    ctx.strokeStyle = 'rgba(140,125,85,0.8)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx - 17, cy - 12);
    ctx.lineTo(cx, cy - 26);
    ctx.lineTo(cx + 17, cy - 12);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
  } else {
    // Kabuto (elmo)
    ctx.fillStyle = ARM;
    ctx.strokeStyle = ARM2;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx - 14, cy - 12);
    ctx.quadraticCurveTo(cx, cy - 26 - (boss ? 4 : 0), cx + 14, cy - 12);
    ctx.lineTo(cx + 11, cy - 9);
    ctx.quadraticCurveTo(cx, cy - 20, cx - 11, cy - 9);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    
    // Abas laterais (fukigaeshi)
    ctx.beginPath();
    ctx.moveTo(cx - 14, cy - 12); ctx.lineTo(cx - 19, cy - 6); ctx.lineTo(cx - 12, cy - 7);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 14, cy - 12); ctx.lineTo(cx + 19, cy - 6); ctx.lineTo(cx + 12, cy - 7);
    ctx.closePath(); ctx.fill();
  }

  // Crista do Elmo (Tiers superiores)
  if (tier >= 2 && !misty && (!isFire || !fly)) {
    ctx.save();
    ctx.fillStyle = isFire ? '#c9541e' : '#e8b93f';
    ctx.shadowColor = isFire ? 'rgba(201,84,30,0.8)' : 'rgba(232,185,63,0.8)';
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - 20);
    ctx.quadraticCurveTo(cx, cy - 30 - (boss ? 8 : 0), cx + 6, cy - 20);
    ctx.quadraticCurveTo(cx, cy - 24, cx - 6, cy - 20);
    ctx.fill();
    ctx.restore();
  }

  // Chifres (Apenas Chefes: Suijin e Kagutsuchi)
  if (boss) {
    ctx.fillStyle = isFire ? '#c9541e' : '#e8b93f';
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy - 20); ctx.lineTo(cx - 20, cy - 34); ctx.lineTo(cx - 7, cy - 23);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 10, cy - 20); ctx.lineTo(cx + 20, cy - 34); ctx.lineTo(cx + 7, cy - 23);
    ctx.closePath(); ctx.fill();
  }

  // Ombreira (Sode)
  if (tier >= 2 && !misty) {
    ctx.fillStyle = ARM;
    ctx.strokeStyle = ARM2;
    ctx.save();
    ctx.translate(cx - 13, cy - 2);
    ctx.rotate(-0.35);
    ctx.fillRect(-6, -5, 12, 11);
    ctx.strokeRect(-6, -5, 12, 11);
    ctx.restore();
  }

  // Máscara (Menpō)
  if (!misty && ((!isFire && tier >= 3) || (isFire && !fly && !boss))) {
    ctx.fillStyle = ARM;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy - 5);
    ctx.quadraticCurveTo(cx + 2, cy + 1, cx + 12, cy - 5);
    ctx.lineTo(cx + 10, cy + 2);
    ctx.quadraticCurveTo(cx + 2, cy + 6, cx - 6, cy + 2);
    ctx.closePath(); ctx.fill();
  }

  // Sashimono do Chefe (Bandeira nas costas)
  if (boss) {
    ctx.strokeStyle = ARM2;
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(cx - 12, cy - 8); ctx.lineTo(cx - 16, cy - 48); ctx.stroke();
    const wav = Math.sin(t * 0.08) * 3;
    ctx.fillStyle = isFire ? 'rgba(120,26,10,0.92)' : 'rgba(30,60,120,0.92)';
    ctx.beginPath();
    ctx.moveTo(cx - 16, cy - 48);
    ctx.lineTo(cx - 34 + wav, cy - 46);
    ctx.lineTo(cx - 34 + wav, cy - 28);
    ctx.lineTo(cx - 16, cy - 30);
    ctx.closePath(); ctx.fill();
    ctx.save();
    ctx.translate(cx - 25 + wav / 2, cy - 38);
    ctx.scale(facing, 1);
    ctx.fillStyle = isFire ? '#ffd9a0' : '#bfe4ff';
    ctx.font = '10px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(isFire ? '火' : '水', 0, 0);
    ctx.restore();
  }

  // 8. Olhos Brilhantes
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.shadowBlur = 7;
  const eyeColor = isFire
    ? (boss ? '#fff1b0' : '#ffd070')
    : (boss ? '#ffc46b' : (misty ? '#d8c8ff' : (abyssal ? '#b7ffd9' : '#a9f2ff')));
  ctx.shadowColor = eyeColor;
  ctx.fillStyle = eyeColor;
  ctx.beginPath(); ctx.ellipse(cx + 3, cy - 8, 2, 1.4, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + 9, cy - 8, 2, 1.4, 0, 0, 7); ctx.fill();
  ctx.restore();

  // 9. Kanji de Defesa
  if (pose === 'defend') {
    ctx.save();
    ctx.translate(cx + 20, cy);
    ctx.scale(facing, 1);
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = isFire
      ? `rgba(255,170,90,${0.6 + 0.3 * Math.sin(t * 0.2)})`
      : `rgba(140,215,255,${0.6 + 0.3 * Math.sin(t * 0.2)})`;
    ctx.font = '700 14px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('守', 0, 0);
    ctx.restore();
  }

  // 10. Energia de Carga (Chefe acumulando golpe pesado)
  if (pose === 'charge') {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const cg = ctx.createRadialGradient(cx, cy, 2, cx, cy, 38);
    cg.addColorStop(0, isFire ? `rgba(255,150,60,${0.35 + 0.2 * Math.sin(t * 0.4)})` : `rgba(120,210,255,${0.3 + 0.2 * Math.sin(t * 0.4)})`);
    cg.addColorStop(1, isFire ? 'rgba(255,150,60,0)' : 'rgba(120,210,255,0)');
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(cx, cy, 38, 0, 7); ctx.fill();
    ctx.restore();
  }

  // 11. Flash de Dano
  if (o.flash > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, o.flash) * alpha;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = isFire ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.75)';
    ctx.beginPath(); ctx.ellipse(cx, cy, 16, 20, 0, 0, 7); ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Desenha o espírito de água (invoca o renderizador elemental unificado)
 */
function drawWaterSamurai(ctx, x, y, s, tier, o = {}) {
  drawElementalSamurai(ctx, x, y, s, tier, o, false);
}

/**
 * Desenha o espírito de fogo (invoca o renderizador elemental unificado)
 */
function drawFireSamurai(ctx, x, y, s, tier, o = {}) {
  drawElementalSamurai(ctx, x, y, s, tier, o, true);
}


// ─── O Rōnin de Luz (Jogador) ──────────────────────────────────────────

/**
 * Desenha o samurai de luz. (x,y) = pés. Usado no mapa e na batalha.
 */
function drawLightSamurai(ctx, x, y, s, o = {}) {
  const t = o.t || 0;
  const facing = o.facing || 1;
  const pose = o.pose || 'idle';
  const bob = (pose === 'idle' ? Math.sin(t * 0.06) * 1.6 : 0);
  const cor = U.clamp(o.corrupt || 0, 0, 1);
  const wieldDark = o.wield === 'dark';
  // spirit: reflexo espectral dourado · weak: essência perdida (luz apagada)
  const isSpirit = !!o.spirit;
  const isWeak = !!o.weak;
  const mixC = (a, b, alpha) => U.rgb(U.mixRGB(a, b, cor), alpha);

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * facing, s);

  if (isSpirit) ctx.globalAlpha = 0.72 + 0.12 * Math.sin(t * 0.08);
  else if (isWeak) ctx.globalAlpha = 0.82;

  // Aura luminosa - Dourada gradualmente tomada por Violeta corrompido
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const aur = isSpirit ? [255, 236, 176]
    : U.mixRGB([255, 216, 130], [150, 95, 255], Math.max(cor, wieldDark ? 0.45 : 0));
  const auraCol = aur[0] + ',' + aur[1] + ',' + aur[2];
  // essência perdida → halo fraco e curto; espírito → halo amplo e dourado
  const auraStrength = isSpirit ? 0.42 : isWeak ? 0.14 : 0.30;
  const auraR = isSpirit ? 42 : 36;
  const glow = ctx.createRadialGradient(0, -22, 2, 0, -22, auraR);
  glow.addColorStop(0, `rgba(${auraCol},${auraStrength})`);
  glow.addColorStop(1, `rgba(${auraCol},0)`);
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(0, -22, auraR, 0, 7); ctx.fill();
  ctx.restore();

  // O dash deixa duas silhuetas de luz, curtas e discretas, em vez de uma
  // fumaça pesada. Isso mantém a leitura do personagem em fundos escuros.
  if (pose === 'dash') {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(' + auraCol + ',1)';
    for (let i = 1; i <= 2; i++) {
      ctx.globalAlpha = 0.14 / i;
      ctx.beginPath();
      ctx.ellipse(-i * 12, -20 + i * 2, 7, 17, 0, 0, 7);
      ctx.fill();
    }
    ctx.restore();
  }

  // A defesa persistente mora no sprite, enquanto as partículas apenas
  // anunciam sua criação e seus impactos. Assim o escudo não some entre frames.
  if (o.shield) {
    const alias = { agua: 'water', sui: 'water', fogo: 'fire', ka: 'fire' };
    const mode = alias[o.shield] || o.shield;
    const shieldRgb = mode === 'water' ? '120,220,255'
      : mode === 'fire' ? '255,145,78'
      : mode === 'dark' ? '186,132,255'
      : mode === 'guard' ? '210,255,176' : '255,224,150';
    const shieldPulse = 0.34 + 0.13 * Math.sin(t * 0.16);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const sg = ctx.createRadialGradient(0, -23, 5, 0, -23, 32);
    sg.addColorStop(0, 'rgba(' + shieldRgb + ',' + (shieldPulse * 0.35) + ')');
    sg.addColorStop(0.7, 'rgba(' + shieldRgb + ',' + (shieldPulse * 0.12) + ')');
    sg.addColorStop(1, 'rgba(' + shieldRgb + ',0)');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.ellipse(2, -22, 27, 34, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(' + shieldRgb + ',' + shieldPulse + ')';
    ctx.lineWidth = mode === 'light' ? 2.2 : 1.7;
    ctx.shadowColor = 'rgba(' + shieldRgb + ',0.85)';
    ctx.shadowBlur = 9;
    ctx.beginPath(); ctx.arc(2, -22, 25 + Math.sin(t * 0.13) * 1.5, -1.2, 1.45); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  const CORE = mixC([255, 248, 226], [212, 190, 255]);
  const MID  = mixC([255, 217, 141], [148, 108, 228]);
  const EDGE = mixC([255, 184, 77], [106, 66, 196]);
  let hipY = -18 + bob, headY = -37 + bob, lean = 0, crouch = 0;
  if (pose === 'run') lean = 0.22;
  if (pose === 'dash') { lean = 0.5; crouch = 4; hipY += 4; headY += 5; }
  if (pose === 'defend') { crouch = 4; hipY += 4; headY += 4; }
  if (pose === 'hurt') lean = -0.3;
  if (pose === 'wall') lean = -0.12;
  if (pose === 'kneel') { crouch = 10; hipY += 10; headY += 12; }
  if (pose === 'swim') { lean = 0.4; hipY += 2 + Math.sin(t * 0.12) * 1.5; headY += 2 + Math.sin(t * 0.12) * 1.5; }

  // Pernas
  const runS = pose === 'run' ? Math.sin((o.runPhase || 0)) : 0;
  let f1x = -5, f2x = 5, f1y = 0, f2y = 0;
  if (pose === 'run') { f1x = -4 + runS * 8; f2x = 4 - runS * 8; f1y = -Math.max(0, runS) * 5; f2y = -Math.max(0, -runS) * 5; }
  if (pose === 'jump' || pose === 'fall') { f1x = -6; f2x = 7; f1y = -6; f2y = -2; }
  if (pose === 'wall') { f1x = -3; f2x = 5; f1y = -4; f2y = 0; }
  if (pose === 'dash') { f1x = -12; f2x = 8; f1y = -2; f2y = -4; }
  if (pose === 'kneel') { f1x = -7; f2x = 6; f2y = -1; }
  if (pose === 'groundcast') { f1x = -8; f2x = 7; f1y = -1; f2y = -2; }
  if (pose === 'swim') {
    const kick = Math.sin(t * 0.22) * 4;
    f1x = -9; f2x = -5;
    f1y = -3 + kick; f2y = -1 - kick;
  }
  ctx.strokeStyle = MID;
  ctx.lineCap = 'round';
  ctx.lineWidth = 4.2;
  ctx.beginPath(); ctx.moveTo(-2, hipY + 4); ctx.lineTo(f1x, f1y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(2, hipY + 4); ctx.lineTo(f2x, f2y); ctx.stroke();

  // Hakama (saia larga)
  ctx.fillStyle = mixC([255, 184, 77], [106, 66, 196], 0.55);
  ctx.beginPath();
  ctx.moveTo(-6, hipY);
  ctx.lineTo(6, hipY);
  ctx.lineTo(f2x + 4, f2y - 4);
  ctx.lineTo(f1x - 4, f1y - 4);
  ctx.closePath(); ctx.fill();

  // Torso
  const shX = lean * 8;
  const tg = ctx.createLinearGradient(0, hipY, shX, hipY - 16);
  tg.addColorStop(0, MID);
  tg.addColorStop(1, CORE);
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.moveTo(-6, hipY);
  ctx.quadraticCurveTo(-7 + shX, hipY - 9, -5 + shX, hipY - 15);
  ctx.lineTo(5 + shX, hipY - 15);
  ctx.quadraticCurveTo(7 + shX, hipY - 9, 6, hipY);
  ctx.closePath(); ctx.fill();
  
  // Gola do Kimono
  ctx.strokeStyle = EDGE;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(shX + 1, hipY - 14);
  ctx.lineTo(shX + 4, hipY - 6);
  ctx.stroke();
  
  // Obi (faixa)
  ctx.fillStyle = wieldDark ? '#8a5fe0'
    : o.amulet === 'sui' ? '#5ac8ff'
    : o.amulet === 'ka' ? '#ff8a4d' : EDGE;
  ctx.fillRect(-6, hipY - 2, 12, 3);

  // Cabeça
  ctx.fillStyle = CORE;
  ctx.beginPath(); ctx.arc(shX + 2, headY, 5, 0, 7); ctx.fill();
  
  // Coque + fita ao vento
  ctx.fillStyle = MID;
  ctx.beginPath(); ctx.arc(shX - 1, headY - 5.5, 2.6, 0, 7); ctx.fill();
  ctx.strokeStyle = mixC([255, 200, 110], [170, 120, 255], 0.8);
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(shX - 3, headY - 5);
  ctx.quadraticCurveTo(shX - 10, headY - 4 + Math.sin(t * 0.15) * 2, shX - 15, headY - 1 + Math.sin(t * 0.12) * 3);
  ctx.stroke();
  
  // Olho fenda (arde violeta em karma escuro)
  ctx.strokeStyle = cor > 0.5 ? '#8a5fe0' : '#7a4a12';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(shX + 3.5, headY - 0.5); ctx.lineTo(shX + 6, headY - 1); ctx.stroke();

  // Katana e Lâminas
  const bladeGrad = (x1, y1, x2, y2) => {
    const g = ctx.createLinearGradient(x1, y1, x2, y2);
    g.addColorStop(0, wieldDark ? '#efe2ff' : '#fffdf4');
    g.addColorStop(1, wieldDark ? 'rgba(110,50,200,0.2)'
      : o.amulet === 'sui' ? 'rgba(120,220,255,0.15)'
      : o.amulet === 'ka' ? 'rgba(255,150,80,0.15)'
      : 'rgba(255,230,160,0.1)');
    return g;
  };

  const blade = (gx, gy, bx, by, w0) => {
    ctx.save();
    ctx.shadowColor = wieldDark ? 'rgba(160,95,255,0.9)'
      : o.amulet === 'sui' ? 'rgba(130,220,255,0.9)'
      : o.amulet === 'ka' ? 'rgba(255,150,80,0.9)'
      : 'rgba(255,220,140,0.9)';
    ctx.shadowBlur = 8;
    ctx.strokeStyle = bladeGrad(gx, gy, bx, by);
    ctx.lineWidth = w0;
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(bx, by); ctx.stroke();
    ctx.strokeStyle = '#8a5a20';
    ctx.shadowBlur = 0;
    ctx.lineWidth = w0 + 0.8;
    const hx = gx + (bx - gx) * -0.12, hy = gy + (by - gy) * -0.12;
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.restore();
  };

  if (pose === 'slash' && o.slashT !== undefined) {
    // Arco de corte
    const p = U.clamp(o.slashT, 0, 1);
    const a0 = -2.2, a1 = U.lerp(-2.2, 1.15, U.easeOut(p));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = wieldDark ? 'rgba(220,190,255,0.9)' : 'rgba(255,246,210,0.92)';
    ctx.lineWidth = 1.4 + (1 - p) * 2.4;
    ctx.shadowColor = wieldDark ? 'rgba(170,110,255,0.85)' : 'rgba(255,210,110,0.85)';
    ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(4, hipY - 8, 31, a0, a1); ctx.stroke();
    ctx.strokeStyle = wieldDark ? 'rgba(160,100,255,0.52)' : 'rgba(255,192,92,0.52)';
    ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.arc(4, hipY - 8, 37, a0 - 0.08, a1 - 0.16); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = wieldDark ? 'rgba(212,180,255,0.42)' : 'rgba(255,240,200,0.4)';
    ctx.beginPath();
    ctx.arc(4, hipY - 8, 30, a0, a1);
    ctx.arc(4, hipY - 8, 12, a1, a0, true);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    blade(4 + Math.cos(a1) * 10, hipY - 8 + Math.sin(a1) * 10, 4 + Math.cos(a1) * 32, hipY - 8 + Math.sin(a1) * 32, 2.6);
  } else if (pose === 'groundcast') {
    // Barragens elementais: a katana aponta a origem da magia e crava no solo.
    const groundAlias = { agua: 'water', sui: 'water', fogo: 'fire', ka: 'fire' };
    const groundMode = groundAlias[o.castElement] || o.castElement || 'water';
    const groundFire = groundMode === 'fire';
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const groundGlow = ctx.createRadialGradient(12, 5, 1, 12, 5, 24);
    groundGlow.addColorStop(0, groundFire ? 'rgba(255,244,190,0.76)' : 'rgba(225,252,255,0.72)');
    groundGlow.addColorStop(0.36, groundFire ? 'rgba(255,112,42,0.38)' : 'rgba(95,204,255,0.34)');
    groundGlow.addColorStop(1, groundFire ? 'rgba(202,60,28,0)' : 'rgba(45,127,214,0)');
    ctx.fillStyle = groundGlow;
    ctx.beginPath(); ctx.ellipse(12, 5, 24, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = groundFire ? 'rgba(255,190,92,0.78)' : 'rgba(170,238,255,0.74)';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(12, 5, 18 + Math.sin(t * 0.16) * 3, 4, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    blade(shX + 4, hipY - 12, shX + 12, 7, 2.8);
  } else if (pose === 'cast') {
    // Lâmina erguida ao céu
    const alias = { agua: 'water', sui: 'water', fogo: 'fire', ka: 'fire' };
    const castMode = alias[o.castElement] || o.castElement || (wieldDark ? 'dark' : 'light');
    const castRgb = castMode === 'water' ? '120,220,255'
      : castMode === 'fire' ? '255,142,74'
      : castMode === 'dark' ? '182,120,255' : '255,224,150';
    const castPulse = 0.48 + 0.2 * Math.sin(t * 0.2);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const castGlow = ctx.createRadialGradient(4, hipY - 13, 2, 4, hipY - 13, 25);
    castGlow.addColorStop(0, 'rgba(' + castRgb + ',' + castPulse * 0.45 + ')');
    castGlow.addColorStop(1, 'rgba(' + castRgb + ',0)');
    ctx.fillStyle = castGlow;
    ctx.beginPath(); ctx.arc(4, hipY - 13, 25, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(' + castRgb + ',' + castPulse + ')';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(4, hipY - 10, 18 + Math.sin(t * 0.14) * 2, 0, 7); ctx.stroke();
    ctx.restore();
    blade(shX + 3, headY - 8, shX + 3, headY - 34, 2.4);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const a = t * 0.09 + i * 2.09;
      ctx.fillStyle = wieldDark ? 'rgba(200,160,255,0.85)' : 'rgba(255,236,180,0.8)';
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 16, hipY - 10 + Math.sin(a) * 8, 1.8, 0, 7);
      ctx.fill();
    }
    ctx.restore();
  } else if (pose === 'defend') {
    blade(10, hipY - 16, 10, hipY + 2, 2.4);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = wieldDark
      ? `rgba(190,150,255,${0.5 + 0.3 * Math.sin(t * 0.2)})`
      : `rgba(255,230,170,${0.5 + 0.3 * Math.sin(t * 0.2)})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(2, hipY - 8, 22, -1.3, 1.3); ctx.stroke();
    ctx.restore();
  } else if (pose === 'victory') {
    blade(shX + 5, headY - 4, shX + 22, headY - 26, 2.6);
  } else if (pose === 'wall') {
    blade(-2, hipY - 4, -14, hipY + 10, 2);
  } else {
    // Em guarda normal, lâmina baixa
    const bx = pose === 'dash' ? -16 : 18, by = pose === 'dash' ? hipY + 2 : hipY - 2 + bob;
    blade(6, hipY - 6, bx, by, 2.2);
  }

  // Flash de dano recebido
  if (o.flash > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, o.flash);
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255,120,90,0.55)';
    ctx.beginPath(); ctx.ellipse(0, -20, 12, 22, 0, 0, 7); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

// Vincula funções ao escopo global para compatibilidade direta
window.drawLightSamurai = drawLightSamurai;
window.drawWaterSamurai = drawWaterSamurai;
window.drawFireSamurai = drawFireSamurai;
