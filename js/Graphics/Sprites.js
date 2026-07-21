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

// ─── Espíritos do Reino do Vento (batalha) ─────────────────────────

function drawWindClaimAura(ctx, x, y, t, amount, color) {
  if (!(amount > 0)) return;
  const pulse = 0.55 + 0.25 * Math.sin(t * 0.18);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = `rgba(${color || '255,216,120'},${amount * pulse})`;
  ctx.lineWidth = 1.8;
  ctx.shadowColor = `rgba(${color || '255,216,120'},0.9)`;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.ellipse(x, y, 29 + Math.sin(t * 0.13) * 2, 35 + Math.cos(t * 0.11) * 2, 0, 0, 7);
  ctx.stroke();
  ctx.restore();
}

/**
 * Pássaro-samurai de batalha. Tier 8 é claro e elegante; tier 13 recebe
 * capa, coroa e correntes orbitais para manter uma silhueta régia própria.
 */
function drawWindBattleSprite(ctx, x, y, s, tier, o = {}) {
  const t = o.t || 0;
  const pose = o.pose || 'idle';
  const facing = o.facing || 1;
  const alpha = o.alpha === undefined ? 1 : o.alpha;
  if (alpha <= 0) return;

  const king = tier === 13;
  const stormPhase = king && !!o.stormPhase;
  const hover = Math.sin(t * 0.075) * 2.4 - (king ? 10 : 13);
  const hurtLean = pose === 'hurt' ? -0.22 : 0;
  const attackLean = pose === 'attack' ? 0.18 : 0;
  const cx = (hurtLean + attackLean) * 18;
  const cy = hover - 30;
  const wingOpen = pose === 'attack' || pose === 'magic' || pose === 'charge'
    ? 1 : pose === 'defend' ? 0.14 : 0.46 + Math.sin(t * 0.11) * 0.08;
  const featherLight = king ? (stormPhase ? '#8995aa' : '#b7c2c7') : '#e8f2f1';
  const featherMid = king ? '#455064' : '#94bbca';
  const featherDark = king ? '#1d2534' : '#36566a';
  const armor = king ? '#202834' : '#253d4b';
  const armorEdge = king ? '#9a8046' : '#88afba';
  const eye = stormPhase ? '#a8efff' : king ? '#e7bd62' : '#bdf7ff';

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * facing, s);
  ctx.globalAlpha = alpha;
  drawWindClaimAura(ctx, cx, cy, t, o.aura, o.auraCol);

  // O Rei carrega dois anéis de vento opostos; eles também anunciam a fase 2.
  if (king) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let ring = 0; ring < 2; ring++) {
      const a = t * (stormPhase ? 0.11 : 0.055) * (ring ? -1 : 1) + ring * Math.PI;
      const ox = Math.cos(a) * (31 + ring * 4);
      const oy = cy + Math.sin(a) * (13 + ring * 3);
      ctx.strokeStyle = stormPhase ? 'rgba(166,231,255,0.62)' : 'rgba(214,239,230,0.42)';
      ctx.lineWidth = stormPhase ? 1.7 : 1.2;
      ctx.beginPath();
      ctx.ellipse(cx + ox * 0.12, oy, 34 + ring * 5, 12 + ring * 2, a * 0.16, 0.25, 5.85);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Capa rasgada, sempre atrás das asas e do corpo.
  if (king) {
    const capeWave = Math.sin(t * 0.12) * 5;
    ctx.fillStyle = stormPhase ? 'rgba(18,25,42,0.92)' : 'rgba(48,57,69,0.9)';
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy - 8);
    ctx.bezierCurveTo(cx - 32, cy + 2, cx - 38 + capeWave, cy + 25, cx - 29 + capeWave, cy + 43);
    ctx.lineTo(cx - 17 + capeWave * 0.4, cy + 35);
    ctx.lineTo(cx - 8 + capeWave * 0.25, cy + 46);
    ctx.lineTo(cx + 4, cy + 18);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(154,128,70,0.52)';
    ctx.lineWidth = 0.9;
    ctx.stroke();
  }

  // Cauda longa de garça/corvo: três lâminas de pena dão leitura vertical.
  for (let tail = -1; tail <= 1; tail++) {
    const sway = Math.sin(t * 0.09 + tail) * 2;
    ctx.fillStyle = tail === 0 ? featherLight : featherMid;
    ctx.beginPath();
    ctx.moveTo(cx + tail * 5, cy + 13);
    ctx.quadraticCurveTo(cx + tail * 9 + sway, cy + 34, cx + tail * 13 + sway, cy + 48 + Math.abs(tail) * 4);
    ctx.quadraticCurveTo(cx + tail * 2, cy + 38, cx + tail * 2, cy + 13);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = featherDark;
    ctx.lineWidth = 0.75;
    ctx.stroke();
  }

  // Asas segmentadas. Ataque/magia abre a silhueta; defesa as fecha à frente.
  for (const side of [-1, 1]) {
    const shoulderX = cx + side * 9;
    const reach = 17 + wingOpen * (king ? 27 : 23);
    const lift = wingOpen * (king ? 22 : 18);
    const fold = pose === 'defend' ? 14 : 0;
    ctx.fillStyle = side < 0 ? featherMid : featherLight;
    ctx.strokeStyle = featherDark;
    ctx.lineWidth = 1.05;
    ctx.beginPath();
    ctx.moveTo(shoulderX, cy - 6);
    ctx.quadraticCurveTo(cx + side * (18 + fold), cy - 16 - lift,
      cx + side * reach, cy - 12 - lift * 0.45);
    ctx.quadraticCurveTo(cx + side * (reach - 5), cy + 2,
      cx + side * (12 + fold), cy + 15);
    ctx.quadraticCurveTo(cx + side * 6, cy + 6, shoulderX, cy - 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = king ? 'rgba(31,41,58,0.8)' : 'rgba(76,117,138,0.72)';
    ctx.lineWidth = 0.8;
    for (let feather = 0; feather < 4; feather++) {
      const k = (feather + 1) / 5;
      ctx.beginPath();
      ctx.moveTo(shoulderX, cy - 3 + feather * 3);
      ctx.lineTo(cx + side * (12 + reach * k * 0.62), cy - 10 - lift * (1 - k) + feather * 3);
      ctx.stroke();
    }
  }

  // Pernas finas e garras mantêm o parentesco com a garça.
  ctx.strokeStyle = king ? '#947a43' : '#7f9ca6';
  ctx.lineWidth = 1.4;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + side * 5, cy + 13);
    ctx.lineTo(cx + side * 6, cy + 27);
    ctx.lineTo(cx + side * 11, cy + 30);
    ctx.stroke();
  }

  // Peito emplumado e armadura leve sobreposta.
  const body = ctx.createLinearGradient(cx, cy - 19, cx, cy + 19);
  body.addColorStop(0, featherLight);
  body.addColorStop(0.55, featherMid);
  body.addColorStop(1, featherDark);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(cx, cy, king ? 13 : 11, king ? 21 : 19, pose === 'hurt' ? -0.16 : 0, 0, 7);
  ctx.fill();
  ctx.strokeStyle = featherDark;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = armor;
  ctx.strokeStyle = armorEdge;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 12, cy - 5);
  ctx.lineTo(cx + 12, cy - 5);
  ctx.lineTo(cx + 9, cy + 12);
  ctx.lineTo(cx, cy + 17);
  ctx.lineTo(cx - 9, cy + 12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  for (let plate = -1; plate <= 1; plate++) {
    ctx.strokeStyle = 'rgba(185,209,211,0.42)';
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy + plate * 5 + 2);
    ctx.lineTo(cx + 8, cy + plate * 5 + 2);
    ctx.stroke();
  }

  // Pescoço alto, cabeça de falcão e bico comprido.
  ctx.fillStyle = featherLight;
  ctx.beginPath();
  ctx.ellipse(cx + 3, cy - 22, king ? 10 : 9, king ? 11 : 10, -0.15, 0, 7);
  ctx.fill();
  ctx.strokeStyle = featherDark;
  ctx.stroke();
  ctx.fillStyle = king ? '#9b7d3f' : '#8aaeb9';
  ctx.beginPath();
  ctx.moveTo(cx + 10, cy - 25);
  ctx.lineTo(cx + (king ? 29 : 25), cy - 21);
  ctx.lineTo(cx + 10, cy - 18);
  ctx.closePath();
  ctx.fill();

  // Kabuto aerodinâmico; no Rei, o penacho vira uma coroa quebrada.
  ctx.fillStyle = armor;
  ctx.strokeStyle = armorEdge;
  ctx.beginPath();
  ctx.moveTo(cx - 7, cy - 27);
  ctx.quadraticCurveTo(cx + 2, cy - 39, cx + 12, cy - 27);
  ctx.lineTo(cx + 9, cy - 23);
  ctx.lineTo(cx - 6, cy - 23);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (king) {
    ctx.fillStyle = '#b3944e';
    for (let spike = -1; spike <= 1; spike++) {
      ctx.beginPath();
      ctx.moveTo(cx + spike * 5 - 2, cy - 31);
      ctx.lineTo(cx + spike * 6, cy - 45 - (spike === 0 ? 4 : 0));
      ctx.lineTo(cx + spike * 5 + 3, cy - 31);
      ctx.closePath();
      ctx.fill();
    }
  }

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = eye;
  ctx.shadowColor = eye;
  ctx.shadowBlur = stormPhase ? 11 : 6;
  ctx.beginPath();
  ctx.ellipse(cx + 7, cy - 24, stormPhase ? 2.4 : 1.8, 1.2, -0.1, 0, 7);
  ctx.fill();
  ctx.restore();

  // Katana constituída pelo próprio fluxo de ar.
  const arm = o.armT === undefined ? 0.75 : o.armT;
  let handX = cx + 10, handY = cy + 3;
  let bladeX = cx + 31, bladeY = cy + 13;
  if (pose === 'attack') { bladeX = cx + 43 + arm * 7; bladeY = cy - 13 + arm * 7; }
  if (pose === 'defend') { handX = cx + 5; bladeX = cx + 5; bladeY = cy - 35; }
  if (pose === 'magic' || pose === 'charge') { bladeX = cx + 20; bladeY = cy - 35; }
  ctx.strokeStyle = '#7a6944';
  ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.moveTo(cx + 4, cy + 5); ctx.lineTo(handX, handY); ctx.stroke();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = stormPhase ? 'rgba(166,235,255,0.96)' : 'rgba(219,250,246,0.92)';
  ctx.lineWidth = king ? 2.8 : 2.2;
  ctx.shadowColor = stormPhase ? '#8edfff' : '#bfeee5';
  ctx.shadowBlur = 7;
  ctx.beginPath();
  ctx.moveTo(handX, handY);
  ctx.quadraticCurveTo((handX + bladeX) * 0.5 + 4, (handY + bladeY) * 0.5 - 5, bladeX, bladeY);
  ctx.stroke();
  ctx.lineWidth = 0.8;
  for (let spiral = 1; spiral <= 3; spiral++) {
    const k = spiral / 4;
    const bx = U.lerp(handX, bladeX, k);
    const by = U.lerp(handY, bladeY, k);
    ctx.beginPath();
    ctx.arc(bx, by, 2.2 + spiral * 0.45, t * 0.12 + spiral, t * 0.12 + spiral + Math.PI * 1.3);
    ctx.stroke();
  }
  ctx.restore();

  if (pose === 'magic' || pose === 'charge') {
    const charge = pose === 'charge' ? 0.72 + Math.sin(t * 0.22) * 0.16 : 0.48;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(cx + 20, cy - 40, 1, cx + 20, cy - 40, 18);
    g.addColorStop(0, `rgba(240,255,249,${charge})`);
    g.addColorStop(0.45, `rgba(143,224,235,${charge * 0.55})`);
    g.addColorStop(1, 'rgba(143,224,235,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx + 20, cy - 40, 18, 0, 7); ctx.fill();
    ctx.restore();
  }

  if (o.flash > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, o.flash) * alpha;
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    ctx.beginPath(); ctx.ellipse(cx, cy - 3, king ? 24 : 20, king ? 39 : 34, 0, 0, 7); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}


// ─── O Rōnin de Luz (Jogador) ──────────────────────────────────────────

/**
 * Desenha o samurai de luz. (x,y) = pés. Usado no mapa e na batalha.
 */
/** Corpo de nuvens sem anatomia fixa, exclusivo do Espírito da Tempestade. */
function drawStormBattleSprite(ctx, x, y, s, tier, o = {}) {
  const t = o.t || 0;
  const pose = o.pose || 'idle';
  const facing = o.facing || 1;
  const alpha = o.alpha === undefined ? 1 : o.alpha;
  if (alpha <= 0) return;
  const hover = Math.sin(t * 0.085) * 3 - 19;
  const cx = pose === 'attack' ? 6 : pose === 'hurt' ? -5 : 0;
  const cy = hover - 27;
  const compressed = pose === 'defend' ? 0.82 : pose === 'charge' ? 1.08 : 1;
  const pulse = 0.5 + 0.5 * Math.sin(t * 0.17);

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * facing, s);
  ctx.globalAlpha = alpha;
  drawWindClaimAura(ctx, cx, cy, t, o.aura, o.auraCol);

  // Tentáculos inferiores tornam a silhueta diferente de qualquer samurai.
  ctx.strokeStyle = 'rgba(38,55,78,0.9)';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  for (let tendril = -1; tendril <= 1; tendril++) {
    const sway = Math.sin(t * 0.12 + tendril * 1.8) * 5;
    ctx.beginPath();
    ctx.moveTo(cx + tendril * 12, cy + 12);
    ctx.quadraticCurveTo(cx + tendril * 18 + sway, cy + 26,
      cx + tendril * 9 - sway * 0.4, cy + 38 + Math.abs(tendril) * 4);
    ctx.stroke();
  }

  const body = ctx.createRadialGradient(cx - 8, cy - 12, 2, cx, cy, 36);
  body.addColorStop(0, 'rgba(113,139,169,0.98)');
  body.addColorStop(0.42, 'rgba(55,76,105,0.98)');
  body.addColorStop(1, 'rgba(18,29,49,0.96)');
  ctx.fillStyle = body;
  ctx.strokeStyle = 'rgba(139,192,221,0.58)';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.ellipse(cx - 21, cy + 1, 18, 13 * compressed, -0.18, 0, 7);
  ctx.ellipse(cx - 8, cy - 12, 21, 18 * compressed, 0.08, 0, 7);
  ctx.ellipse(cx + 11, cy - 9, 22, 19 * compressed, -0.06, 0, 7);
  ctx.ellipse(cx + 25, cy + 3, 17, 13 * compressed, 0.14, 0, 7);
  ctx.ellipse(cx + 2, cy + 9, 30, 15 * compressed, 0, 0, 7);
  ctx.fill();
  ctx.stroke();

  // Núcleo azul pulsante, visível através da massa escura.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const core = ctx.createRadialGradient(cx + 3, cy, 1, cx + 3, cy, 18);
  core.addColorStop(0, `rgba(234,253,255,${0.92 + pulse * 0.08})`);
  core.addColorStop(0.28, `rgba(103,207,255,${0.68 + pulse * 0.18})`);
  core.addColorStop(1, 'rgba(63,142,220,0)');
  ctx.fillStyle = core;
  ctx.beginPath(); ctx.arc(cx + 3, cy, 18, 0, 7); ctx.fill();
  ctx.fillStyle = '#ddfbff';
  ctx.beginPath(); ctx.arc(cx + 3, cy, 3.4 + pulse * 1.2, 0, 7); ctx.fill();
  ctx.restore();

  // Veias elétricas internas; poucas linhas mantêm o pico de brilho legível.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = `rgba(175,235,255,${0.55 + pulse * 0.32})`;
  ctx.shadowColor = '#82d8ff';
  ctx.shadowBlur = 5;
  ctx.lineWidth = 1.15;
  for (let bolt = 0; bolt < 3; bolt++) {
    const bx = cx - 19 + bolt * 17;
    const by = cy - 14 + (bolt % 2) * 5;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + 5, by + 7);
    ctx.lineTo(bx + 1, by + 13);
    ctx.lineTo(bx + 9, by + 20);
    ctx.stroke();
  }
  ctx.restore();

  if (pose === 'attack') {
    ctx.strokeStyle = 'rgba(97,145,181,0.9)';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(cx + 20, cy);
    ctx.quadraticCurveTo(cx + 35, cy - 10, cx + 45, cy + 3);
    ctx.stroke();
  } else if (pose === 'defend') {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(168,224,245,${0.48 + pulse * 0.22})`;
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.ellipse(cx, cy, 37, 30, 0, 0, 7); ctx.stroke();
    ctx.restore();
  }

  // A esfera cresce em charge e funciona como telegráfico da Paralisante.
  if (pose === 'charge' || pose === 'magic') {
    const orbRadius = pose === 'charge' ? 10 + pulse * 7 : 9 + pulse * 2;
    const ox = cx + 25, oy = cy - 28;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const orb = ctx.createRadialGradient(ox, oy, 1, ox, oy, orbRadius * 1.8);
    orb.addColorStop(0, 'rgba(255,255,255,0.98)');
    orb.addColorStop(0.28, 'rgba(135,225,255,0.9)');
    orb.addColorStop(1, 'rgba(66,130,225,0)');
    ctx.fillStyle = orb;
    ctx.beginPath(); ctx.arc(ox, oy, orbRadius * 1.8, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(205,248,255,0.9)';
    ctx.lineWidth = 1.2;
    for (let arc = 0; arc < 3; arc++) {
      const a = t * 0.14 + arc * 2.1;
      ctx.beginPath();
      ctx.arc(ox, oy, orbRadius + arc * 2.3, a, a + 1.35);
      ctx.stroke();
    }
    ctx.restore();
  }

  if (o.flash > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, o.flash) * alpha;
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    ctx.beginPath(); ctx.ellipse(cx, cy, 39, 31, 0, 0, 7); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

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
  const auraStrength = isSpirit ? 0.36 : isWeak ? 0.10 : 0.16;
  const auraR = isSpirit ? 38 : 29;
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

// ─── Espíritos da Chama Ancestral (Vale dos Ossos) ──────────────────────────

// Os despachantes antigos passam `(tier, options)`; os novos podem passar apenas
// `options`. Aceitar as duas formas mantém estes sprites independentes da camada
// de simulação e evita adaptações duplicadas no campo e na batalha.
function resolveAshSpriteOptions(tierOrOptions, maybeOptions) {
  if (tierOrOptions && typeof tierOrOptions === 'object') return tierOrOptions;
  return maybeOptions && typeof maybeOptions === 'object' ? maybeOptions : {};
}

function drawAshBlueFlame(ctx, x, y, w, h, phase, alpha = 1) {
  if (!(w > 0) || !(h > 0) || alpha <= 0) return;
  const sway = Math.sin(phase) * w * 0.24;
  const fork = Math.sin(phase * 1.73 + 0.8) * w * 0.14;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha *= alpha;
  ctx.globalCompositeOperation = 'lighter';
  const flame = ctx.createLinearGradient(0, 2, 0, -h);
  flame.addColorStop(0, 'rgba(28,76,255,0.58)');
  flame.addColorStop(0.5, 'rgba(56,178,255,0.94)');
  flame.addColorStop(1, 'rgba(214,246,255,0.12)');
  ctx.fillStyle = flame;
  ctx.beginPath();
  ctx.moveTo(-w * 0.52, 1);
  ctx.quadraticCurveTo(-w * 0.36 + sway * 0.24, -h * 0.48, sway, -h);
  ctx.quadraticCurveTo(w * 0.12 + fork, -h * 0.58, w * 0.52, 1);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(225,249,255,0.58)';
  ctx.beginPath();
  ctx.moveTo(-w * 0.16, 0);
  ctx.quadraticCurveTo(sway * 0.18, -h * 0.42, sway * 0.42, -h * 0.68);
  ctx.quadraticCurveTo(w * 0.2, -h * 0.36, w * 0.18, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawAshBoneLink(ctx, ax, ay, bx, by, width, bone, edge) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = edge;
  ctx.lineWidth = width + 1.7;
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
  ctx.strokeStyle = bone;
  ctx.lineWidth = width;
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
  ctx.fillStyle = bone;
  ctx.beginPath(); ctx.arc(ax, ay, width * 0.56, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(bx, by, width * 0.56, 0, Math.PI * 2); ctx.fill();
}

/**
 * Esqueleto coberto pelas chamas azuis do Vale dos Ossos.
 * Assinaturas aceitas:
 *   drawBlueFlameSkeleton(ctx, x, y, scale, options)
 *   drawBlueFlameSkeleton(ctx, x, y, scale, tier, options)
 */
function drawBlueFlameSkeleton(ctx, x, y, s, tierOrOptions = {}, maybeOptions) {
  const o = resolveAshSpriteOptions(tierOrOptions, maybeOptions);
  const t = Number.isFinite(o.t) ? o.t : 0;
  const pose = o.pose || 'idle';
  const facing = o.facing || 1;
  const alpha = o.alpha === undefined ? 1 : o.alpha;
  if (alpha <= 0) return;

  const walk = Math.sin(t * 0.24);
  const pulse = 0.5 + 0.5 * Math.sin(t * 0.13);
  const crouched = pose === 'crouch' || pose === 'cocoon';
  const jumping = pose === 'jump';
  const hurt = pose === 'hurt';
  const charging = pose === 'charge';
  const healing = pose === 'heal';
  const victorious = pose === 'victory';
  const bob = pose === 'idle' ? Math.sin(t * 0.09) * 0.8 : pose === 'walk' ? Math.abs(walk) * -0.7 : 0;
  const lean = hurt ? -4.2 : jumping ? 2.3 : pose === 'attack' ? 2.8 : 0;
  const squash = crouched ? 0.78 : jumping ? 0.94 : 1;

  ctx.save();
  ctx.translate(x, y + bob);
  ctx.scale(s * facing, s);
  ctx.globalAlpha = alpha;
  ctx.translate(lean, 0);
  ctx.scale(1, squash);

  // Halo e chamas ficam atrás da ossatura para preservar a leitura da silhueta.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const aura = ctx.createRadialGradient(0, -27, 2, 0, -27, charging || healing ? 34 : 25);
  aura.addColorStop(0, `rgba(65,183,255,${0.14 + pulse * 0.08})`);
  aura.addColorStop(1, 'rgba(28,106,255,0)');
  ctx.fillStyle = aura;
  ctx.beginPath(); ctx.ellipse(0, -27, charging || healing ? 34 : 25, charging || healing ? 39 : 31, 0, 0, Math.PI * 2); ctx.fill();
  if (o.aura > 0) {
    ctx.strokeStyle = `rgba(112,207,255,${Math.min(0.72, o.aura * (0.42 + pulse * 0.18))})`;
    ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.ellipse(0, -27, 21 + pulse * 2, 29 + pulse * 2, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();

  const flameH = charging ? 20 : healing ? 18 : victorious ? 17 : 12;
  drawAshBlueFlame(ctx, -8, -12, 10, flameH, t * 0.18 + 0.2, 0.78);
  drawAshBlueFlame(ctx, 8, -12, 10, flameH * 0.92, t * 0.2 + 2.1, 0.74);
  drawAshBlueFlame(ctx, -11, -29, 9, flameH * 0.84, t * 0.23 + 1.2, 0.76);
  drawAshBlueFlame(ctx, 11, -29, 9, flameH * 0.9, t * 0.19 + 3.4, 0.74);
  drawAshBlueFlame(ctx, 0, -40, 13, flameH * 1.1, t * 0.21 + 4.2, 0.86);

  const bone = hurt ? '#eefaff' : '#cbd9df';
  const boneHi = '#eff8f5';
  const edge = '#586d7d';
  const pelvisY = -16;
  const chestY = -30;
  const stride = pose === 'walk' ? walk * 5.2 : 0;

  // Pernas segmentadas; em salto elas se recolhem e, na vitória, firmam a base.
  let kneeL = { x: -5 - stride * 0.35, y: -8 };
  let footL = { x: -7 - stride, y: 0 };
  let kneeR = { x: 5 + stride * 0.35, y: -8 };
  let footR = { x: 7 + stride, y: 0 };
  if (jumping) {
    kneeL = { x: -9, y: -8 }; footL = { x: -4, y: -4 };
    kneeR = { x: 9, y: -7 }; footR = { x: 13, y: -3 };
  } else if (crouched) {
    kneeL = { x: -9, y: -7 }; footL = { x: -13, y: 0 };
    kneeR = { x: 9, y: -7 }; footR = { x: 13, y: 0 };
  }
  drawAshBoneLink(ctx, -4, pelvisY, kneeL.x, kneeL.y, 2.6, bone, edge);
  drawAshBoneLink(ctx, kneeL.x, kneeL.y, footL.x, footL.y, 2.4, bone, edge);
  drawAshBoneLink(ctx, 4, pelvisY, kneeR.x, kneeR.y, 2.6, bone, edge);
  drawAshBoneLink(ctx, kneeR.x, kneeR.y, footR.x, footR.y, 2.4, bone, edge);

  // Pelve e coluna.
  ctx.fillStyle = edge;
  ctx.beginPath(); ctx.ellipse(0, pelvisY, 8.5, 4.8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = bone;
  ctx.beginPath();
  ctx.moveTo(-7, pelvisY - 2); ctx.quadraticCurveTo(-4, pelvisY + 5, 0, pelvisY + 2);
  ctx.quadraticCurveTo(4, pelvisY + 5, 7, pelvisY - 2);
  ctx.lineTo(4, pelvisY - 5); ctx.quadraticCurveTo(0, pelvisY - 2, -4, pelvisY - 5); ctx.closePath(); ctx.fill();
  drawAshBoneLink(ctx, 0, pelvisY - 3, 0, chestY + 6, 2.5, bone, edge);

  // Caixa torácica aberta: os arcos claros diferenciam o inimigo das chamas do cenário.
  ctx.strokeStyle = edge; ctx.lineWidth = 3.6; ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const ry = chestY - 5 + i * 4;
    const rw = 10.5 - i * 1.1;
    ctx.beginPath(); ctx.moveTo(0, ry); ctx.quadraticCurveTo(-rw, ry - 1, -rw + 1.5, ry + 5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, ry); ctx.quadraticCurveTo(rw, ry - 1, rw - 1.5, ry + 5); ctx.stroke();
  }
  ctx.strokeStyle = boneHi; ctx.lineWidth = 1.9;
  for (let i = 0; i < 4; i++) {
    const ry = chestY - 5 + i * 4;
    const rw = 10.5 - i * 1.1;
    ctx.beginPath(); ctx.moveTo(0, ry); ctx.quadraticCurveTo(-rw, ry - 1, -rw + 1.5, ry + 5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, ry); ctx.quadraticCurveTo(rw, ry - 1, rw - 1.5, ry + 5); ctx.stroke();
  }

  // Braços mudam de forma por pose; o lado positivo sempre encara o jogador.
  let elbowL = { x: -15, y: -27 }, handL = { x: -13, y: -18 };
  let elbowR = { x: 15, y: -27 }, handR = { x: 14, y: -18 };
  if (pose === 'walk') {
    elbowL.x -= walk * 2; handL.x -= walk * 4;
    elbowR.x += walk * 2; handR.x += walk * 4;
  } else if (pose === 'attack') {
    elbowR = { x: 18, y: -30 }; handR = { x: 29, y: -29 };
    elbowL = { x: -12, y: -25 }; handL = { x: -4, y: -20 };
  } else if (pose === 'magic' || charging || healing) {
    elbowL = { x: -16, y: -35 }; handL = { x: -9, y: -42 };
    elbowR = { x: 16, y: -35 }; handR = { x: 9, y: -42 };
  } else if (pose === 'defend' || pose === 'cocoon') {
    elbowL = { x: -14, y: -31 }; handL = { x: 6, y: -25 };
    elbowR = { x: 14, y: -31 }; handR = { x: -6, y: -25 };
  } else if (jumping) {
    elbowL = { x: -14, y: -37 }; handL = { x: -18, y: -31 };
    elbowR = { x: 14, y: -37 }; handR = { x: 20, y: -34 };
  } else if (victorious) {
    elbowL = { x: -15, y: -39 }; handL = { x: -11, y: -49 };
    elbowR = { x: 15, y: -39 }; handR = { x: 11, y: -49 };
  }
  drawAshBoneLink(ctx, -8, chestY - 4, elbowL.x, elbowL.y, 2.4, bone, edge);
  drawAshBoneLink(ctx, elbowL.x, elbowL.y, handL.x, handL.y, 2.2, bone, edge);
  drawAshBoneLink(ctx, 8, chestY - 4, elbowR.x, elbowR.y, 2.4, bone, edge);
  drawAshBoneLink(ctx, elbowR.x, elbowR.y, handR.x, handR.y, 2.2, bone, edge);

  // Crânio de calcário, com cavidades escuras e centelhas azuis internas.
  const skullY = -45;
  ctx.fillStyle = edge;
  ctx.beginPath(); ctx.ellipse(0, skullY, 10.6, 10.2, 0, 0, Math.PI * 2); ctx.fill();
  const skull = ctx.createLinearGradient(-6, skullY - 8, 7, skullY + 7);
  skull.addColorStop(0, boneHi); skull.addColorStop(1, bone);
  ctx.fillStyle = skull;
  ctx.beginPath();
  ctx.moveTo(-8.5, skullY - 5);
  ctx.quadraticCurveTo(-5, skullY - 12, 2, skullY - 10);
  ctx.quadraticCurveTo(10, skullY - 8, 9, skullY);
  ctx.lineTo(6, skullY + 8); ctx.lineTo(1.8, skullY + 6);
  ctx.lineTo(0, skullY + 10); ctx.lineTo(-2.2, skullY + 6);
  ctx.lineTo(-7, skullY + 7); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#07111e';
  ctx.beginPath(); ctx.ellipse(-3.5, skullY - 1.5, 2.7, 3.1, -0.15, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(3.8, skullY - 1.5, 2.7, 3.1, 0.15, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0, skullY + 1); ctx.lineTo(-1.7, skullY + 4); ctx.lineTo(1.7, skullY + 4); ctx.closePath(); ctx.fill();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = `rgba(150,224,255,${0.64 + pulse * 0.32})`;
  ctx.shadowColor = '#64c8ff'; ctx.shadowBlur = 5;
  ctx.beginPath(); ctx.arc(-3.5, skullY - 1.5, 0.9, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(3.8, skullY - 1.5, 0.9, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  if (pose === 'attack') {
    // Costela destacada em pleno ar, com uma cauda curta de chama ancestral.
    ctx.strokeStyle = edge; ctx.lineWidth = 3.8;
    ctx.beginPath(); ctx.arc(33, -29, 7, -1.2, 1.15); ctx.stroke();
    ctx.strokeStyle = boneHi; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(33, -29, 7, -1.2, 1.15); ctx.stroke();
    drawAshBlueFlame(ctx, 26, -27, 7, 12, t * 0.3, 0.9);
  }

  if (pose === 'magic' || charging) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const orbY = -43;
    const orbR = charging ? 4.4 + pulse * 2.2 : 4.2 + pulse;
    const orb = ctx.createRadialGradient(0, orbY, 0, 0, orbY, orbR * 2.7);
    orb.addColorStop(0, 'rgba(238,253,255,0.98)');
    orb.addColorStop(0.35, 'rgba(73,193,255,0.86)');
    orb.addColorStop(1, 'rgba(20,82,255,0)');
    ctx.fillStyle = orb; ctx.beginPath(); ctx.arc(0, orbY, orbR * 2.7, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  if (pose === 'defend' || pose === 'cocoon') {
    ctx.save();
    ctx.strokeStyle = 'rgba(221,240,244,0.86)';
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.arc(1, -27, 14 + i * 2.5, -1.35, 1.35); ctx.stroke();
    }
    ctx.restore();
  }

  if (healing || pose === 'cocoon') {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const count = pose === 'cocoon' ? 8 : 6;
    for (let i = 0; i < count; i++) {
      const a = i / count * Math.PI * 2 + t * 0.035;
      const travel = ((t * 0.025 + i * 0.17) % 1);
      const radius = 30 * (1 - travel) + 7;
      ctx.fillStyle = `rgba(128,215,255,${0.32 + travel * 0.5})`;
      ctx.beginPath(); ctx.arc(Math.cos(a) * radius, -27 + Math.sin(a) * radius * 0.72, 1.1 + travel, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  if (victorious || o.extraLife > 0) {
    drawAshBlueFlame(ctx, -5, skullY - 8, 8, 14 + pulse * 4, t * 0.24, 0.9);
    drawAshBlueFlame(ctx, 5, skullY - 8, 8, 15 + (1 - pulse) * 4, t * 0.21 + 2, 0.9);
  }

  if (o.flash > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, o.flash) * alpha;
    ctx.fillStyle = 'rgba(231,250,255,0.78)';
    ctx.beginPath(); ctx.ellipse(0, -28, 15, 27, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawAshRockPolygon(ctx, points, fill, stroke = '#34475b', lineWidth = 1.15) {
  if (!points || points.length < 3) return;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
  ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke();
}

/**
 * Golem de rocha vulcânica e chama ancestral. A geometria-base é compacta
 * para funcionar com as escalas de chefe já usadas no campo e na batalha.
 */
function drawAncientFlameGolem(ctx, x, y, s, tierOrOptions = {}, maybeOptions) {
  const o = resolveAshSpriteOptions(tierOrOptions, maybeOptions);
  const t = Number.isFinite(o.t) ? o.t : 0;
  const pose = o.pose || 'idle';
  const facing = o.facing || 1;
  const alpha = o.alpha === undefined ? 1 : o.alpha;
  if (alpha <= 0) return;

  const pulse = 0.5 + 0.5 * Math.sin(t * 0.11);
  const step = Math.sin(t * 0.17);
  const cocoon = pose === 'cocoon' || pose === 'heal';
  const charging = pose === 'charge';
  const casting = pose === 'magic';
  const hurt = pose === 'hurt';
  const crouched = pose === 'crouch' || cocoon;
  const jumping = pose === 'jump';
  const victorious = pose === 'victory';
  const chargeProgress = Number.isFinite(o.chargeProgress)
    ? U.clamp(o.chargeProgress, 0, 1)
    : charging ? 0.55 + pulse * 0.45 : casting ? 1 : 0.16;
  const bodyLift = pose === 'idle' ? Math.sin(t * 0.065) * 0.45 : pose === 'walk' ? -Math.abs(step) * 0.5 : 0;
  const lean = hurt ? -2.8 : pose === 'attack' ? 1.8 : jumping ? 1.4 : 0;
  const squash = crouched ? 0.88 : jumping ? 0.94 : 1;

  ctx.save();
  ctx.translate(x, y + bodyLift);
  ctx.scale(s * facing, s);
  ctx.globalAlpha = alpha;
  ctx.translate(lean, 0);
  ctx.scale(1, squash);

  // Presença azul contida: o centro ilumina, mas a rocha continua quase preta.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const auraRadius = cocoon ? 34 : charging || casting ? 38 : 29;
  const aura = ctx.createRadialGradient(0, -27, 3, 0, -27, auraRadius);
  aura.addColorStop(0, `rgba(58,169,255,${0.12 + pulse * 0.08})`);
  aura.addColorStop(0.55, 'rgba(35,112,255,0.08)');
  aura.addColorStop(1, 'rgba(18,68,210,0)');
  ctx.fillStyle = aura;
  ctx.beginPath(); ctx.ellipse(0, -27, auraRadius, auraRadius * 1.08, 0, 0, Math.PI * 2); ctx.fill();
  if (o.aura > 0) {
    ctx.strokeStyle = `rgba(104,205,255,${Math.min(0.68, o.aura * (0.36 + pulse * 0.18))})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(0, -27, 25 + pulse * 2, 31 + pulse * 2, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();

  const ventH = victorious ? 22 : charging || casting ? 18 : cocoon ? 8 : 13;
  drawAshBlueFlame(ctx, -13, -34, 9, ventH, t * 0.18 + 0.4, 0.8);
  drawAshBlueFlame(ctx, 13, -34, 9, ventH * 0.92, t * 0.2 + 2.4, 0.8);
  drawAshBlueFlame(ctx, 0, -44, 12, ventH * 1.15, t * 0.17 + 4, 0.86);

  const rockDark = hurt ? '#202f40' : '#0b111b';
  const rock = hurt ? '#34495c' : '#172230';
  const rockHi = '#2a3a4b';
  const edge = '#40566b';
  const footShift = pose === 'walk' ? step * 2.2 : 0;

  // Pés e pernas em blocos separados deixam o peso legível durante a marcha.
  drawAshRockPolygon(ctx, [[-18, -13], [-7, -14], [-5, -2], [-9 + footShift, 1], [-22 + footShift, 0], [-23, -5]], rock, edge);
  drawAshRockPolygon(ctx, [[7, -14], [18, -13], [23, -5], [22 - footShift, 0], [9 - footShift, 1], [5, -2]], rock, edge);
  drawAshRockPolygon(ctx, [[-16, -24], [-5, -24], [-4, -11], [-18, -10], [-21, -17]], rockDark, edge);
  drawAshRockPolygon(ctx, [[5, -24], [16, -24], [21, -17], [18, -10], [4, -11]], rockDark, edge);

  const torsoGradient = ctx.createLinearGradient(-18, -44, 20, -15);
  torsoGradient.addColorStop(0, rockHi);
  torsoGradient.addColorStop(0.48, rock);
  torsoGradient.addColorStop(1, rockDark);
  drawAshRockPolygon(ctx, [[-21, -39], [-12, -48], [9, -49], [21, -39], [18, -19], [8, -14], [-10, -15], [-19, -21]], torsoGradient, edge, 1.35);

  // Braços. O punho direito avança no golpe; no casulo ambos fecham o núcleo.
  let lElbow = [-25, -29], lFist = [-25, -16];
  let rElbow = [25, -29], rFist = [25, -16];
  if (pose === 'walk') {
    lFist = [-25 - step * 2, -17]; rFist = [25 + step * 2, -17];
  } else if (pose === 'attack') {
    rElbow = [28, -34]; rFist = [39, -31]; lFist = [-18, -17];
  } else if (pose === 'defend') {
    lElbow = [-24, -34]; lFist = [4, -27]; rElbow = [24, -34]; rFist = [-4, -27];
  } else if (charging || casting) {
    lElbow = [-27, -38]; lFist = [-14, -45]; rElbow = [27, -38]; rFist = [14, -45];
  } else if (cocoon) {
    lElbow = [-21, -34]; lFist = [-6, -27]; rElbow = [21, -34]; rFist = [6, -27];
  } else if (jumping) {
    lElbow = [-26, -37]; lFist = [-30, -28]; rElbow = [26, -37]; rFist = [31, -30];
  } else if (victorious) {
    lElbow = [-27, -43]; lFist = [-22, -55]; rElbow = [27, -43]; rFist = [22, -55];
  }
  drawAshRockPolygon(ctx, [[-16, -42], [-25, -39], [lElbow[0] - 4, lElbow[1]], [lElbow[0] + 4, lElbow[1] + 3], [-11, -29]], rock, edge);
  drawAshRockPolygon(ctx, [[lElbow[0] - 4, lElbow[1]], [lElbow[0] + 5, lElbow[1] + 1], [lFist[0] + 5, lFist[1] + 5], [lFist[0] - 5, lFist[1] + 5]], rockDark, edge);
  drawAshRockPolygon(ctx, [[16, -42], [25, -39], [rElbow[0] + 4, rElbow[1]], [rElbow[0] - 4, rElbow[1] + 3], [11, -29]], rock, edge);
  drawAshRockPolygon(ctx, [[rElbow[0] + 4, rElbow[1]], [rElbow[0] - 5, rElbow[1] + 1], [rFist[0] - 5, rFist[1] + 5], [rFist[0] + 5, rFist[1] + 5]], rockDark, edge);
  drawAshRockPolygon(ctx, [[lFist[0] - 6, lFist[1] - 2], [lFist[0] + 5, lFist[1] - 3], [lFist[0] + 7, lFist[1] + 5], [lFist[0] - 5, lFist[1] + 7]], rockHi, edge);
  drawAshRockPolygon(ctx, [[rFist[0] - 5, rFist[1] - 3], [rFist[0] + 6, rFist[1] - 2], [rFist[0] + 5, rFist[1] + 7], [rFist[0] - 7, rFist[1] + 5]], rockHi, edge);

  // Cabeça baixa, sem pescoço, com mandíbula vulcânica.
  drawAshRockPolygon(ctx, [[-14, -51], [-8, -57], [9, -57], [15, -50], [12, -38], [5, -35], [-8, -36], [-13, -41]], rock, edge, 1.35);
  ctx.fillStyle = '#020812';
  ctx.beginPath();
  ctx.moveTo(-7, -47); ctx.quadraticCurveTo(0, -51 - chargeProgress * 2, 8, -47);
  ctx.lineTo(6, -40); ctx.quadraticCurveTo(0, -37 + chargeProgress, -6, -40); ctx.closePath(); ctx.fill();

  // Olhos e fornalha da boca compartilham o mesmo núcleo azul.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = `rgba(169,231,255,${0.62 + pulse * 0.28})`;
  ctx.shadowColor = '#4db8ff'; ctx.shadowBlur = 4 + chargeProgress * 7;
  ctx.beginPath(); ctx.arc(-5, -50, 1.15, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(5, -50, 1.15, 0, Math.PI * 2); ctx.fill();
  const mouthR = 1.8 + chargeProgress * 3.2;
  const mouth = ctx.createRadialGradient(0, -44, 0, 0, -44, mouthR * 2.7);
  mouth.addColorStop(0, 'rgba(242,254,255,1)');
  mouth.addColorStop(0.3, 'rgba(84,202,255,0.95)');
  mouth.addColorStop(1, 'rgba(31,78,255,0)');
  ctx.fillStyle = mouth; ctx.beginPath(); ctx.arc(0, -44, mouthR * 2.7, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Fissuras emissivas. Em cura/carga elas se alargam sem clarear toda a rocha.
  const crackAlpha = cocoon || charging || casting ? 0.78 + pulse * 0.2 : 0.44 + pulse * 0.18;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = `rgba(83,190,255,${crackAlpha})`;
  ctx.lineWidth = cocoon || charging ? 1.45 : 0.9;
  ctx.shadowColor = 'rgba(44,137,255,0.82)'; ctx.shadowBlur = cocoon || charging ? 6 : 3;
  ctx.beginPath();
  ctx.moveTo(-4, -47); ctx.lineTo(-8, -38); ctx.lineTo(-3, -31); ctx.lineTo(-7, -22);
  ctx.moveTo(7, -42); ctx.lineTo(3, -34); ctx.lineTo(8, -27); ctx.lineTo(4, -17);
  ctx.moveTo(-15, -34); ctx.lineTo(-10, -28); ctx.lineTo(-13, -20);
  ctx.stroke();
  ctx.restore();

  if (pose === 'defend') {
    ctx.save();
    ctx.strokeStyle = 'rgba(72,100,126,0.86)'; ctx.lineWidth = 3.4;
    ctx.beginPath(); ctx.arc(0, -28, 21, -1.32, 1.32); ctx.stroke();
    ctx.strokeStyle = `rgba(94,197,255,${0.34 + pulse * 0.22})`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, -28, 23, -1.32, 1.32); ctx.stroke();
    ctx.restore();
  }

  if (charging || casting) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const ringR = 21 + chargeProgress * 8 + pulse * 1.5;
    ctx.strokeStyle = `rgba(89,193,255,${0.34 + chargeProgress * 0.38})`;
    ctx.lineWidth = 1.15;
    ctx.beginPath(); ctx.arc(0, -43, ringR, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2 - t * 0.04;
      const r = ringR - ((t * 0.12 + i * 4) % 8);
      ctx.fillStyle = 'rgba(164,226,255,0.72)';
      ctx.beginPath(); ctx.arc(Math.cos(a) * r, -43 + Math.sin(a) * r, 1.1, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  if (cocoon) {
    // Placas fechadas deixam uma fresta azul central e três marcas de turno.
    drawAshRockPolygon(ctx, [[-23, -47], [-15, -57], [-3, -53], [-6, -17], [-18, -14], [-25, -27]], rockDark, edge, 1.4);
    drawAshRockPolygon(ctx, [[23, -47], [15, -57], [3, -53], [6, -17], [18, -14], [25, -27]], rockDark, edge, 1.4);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const shell = ctx.createLinearGradient(0, -54, 0, -15);
    shell.addColorStop(0, 'rgba(78,191,255,0.12)'); shell.addColorStop(0.5, 'rgba(112,215,255,0.72)'); shell.addColorStop(1, 'rgba(38,91,255,0.08)');
    ctx.fillStyle = shell; ctx.fillRect(-1.2, -52, 2.4, 36);
    const activeTurns = Number.isFinite(o.cocoonTurns) ? U.clamp(o.cocoonTurns, 0, 3) : 3;
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < activeTurns ? 'rgba(176,233,255,0.9)' : 'rgba(62,93,121,0.42)';
      ctx.beginPath(); ctx.arc(-6 + i * 6, -59, 1.8, 0, Math.PI * 2); ctx.fill();
    }
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2 + t * 0.025;
      const travel = (t * 0.018 + i * 0.13) % 1;
      const r = 39 * (1 - travel) + 9;
      ctx.fillStyle = `rgba(90,195,255,${0.25 + travel * 0.55})`;
      ctx.beginPath(); ctx.arc(Math.cos(a) * r, -32 + Math.sin(a) * r * 0.72, 1.1 + travel, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  if (victorious) {
    drawAshBlueFlame(ctx, -9, -54, 10, 21 + pulse * 4, t * 0.2, 0.92);
    drawAshBlueFlame(ctx, 9, -54, 10, 22 + (1 - pulse) * 4, t * 0.22 + 2.2, 0.92);
  }

  if (o.flash > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, o.flash) * alpha;
    ctx.fillStyle = 'rgba(222,247,255,0.72)';
    ctx.beginPath(); ctx.ellipse(0, -30, 24, 31, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

// Vincula funções ao escopo global para compatibilidade direta
window.drawLightSamurai = drawLightSamurai;
window.drawWaterSamurai = drawWaterSamurai;
window.drawFireSamurai = drawFireSamurai;
window.drawWindBattleSprite = drawWindBattleSprite;
window.drawStormBattleSprite = drawStormBattleSprite;
window.drawBlueFlameSkeleton = drawBlueFlameSkeleton;
window.drawAncientFlameGolem = drawAncientFlameGolem;
