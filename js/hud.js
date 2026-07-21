'use strict';
// ─── HUD de exploração, banners e avisos ─────────────────────────────
// Estado visual separado do estado mecânico: o valor lógico muda no turno,
// enquanto a interface o alcança em poucos frames e deixa um rastro legível.
const UiMotion = {
  bars: Object.create(null),

  sync(key, value, max) {
    const target = U.clamp(max > 0 ? value / max : 0, 0, 1);
    let state = this.bars[key];
    if (!state) {
      state = this.bars[key] = { target, display: target, trail: target, direction: 0, flash: 0 };
      return state;
    }
    if (Math.abs(target - state.target) > 0.0005) {
      state.direction = Math.sign(target - state.target);
      state.target = target;
      state.flash = 1;
    }
    return state;
  },

  update() {
    for (const key in this.bars) {
      const state = this.bars[key];
      state.display = U.lerp(state.display, state.target, 0.34);
      state.trail = U.lerp(state.trail, state.display, 0.11);
      if (Math.abs(state.display - state.target) < 0.001) state.display = state.target;
      if (Math.abs(state.trail - state.display) < 0.001) state.trail = state.display;
      state.flash = Math.max(0, state.flash - 0.12);
    }
  },

  drawBar(ctx, key, x, y, w, h, value, max, c1, c2, options) {
    const state = this.sync(key, value, max);
    const opts = options || {};
    const fillW = w * state.display;
    const trailW = w * state.trail;

    ctx.fillStyle = opts.back || '#0b1322';
    ctx.fillRect(x, y, w, h);
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();

    const gradient = ctx.createLinearGradient(0, y, 0, y + h);
    gradient.addColorStop(0, c1); gradient.addColorStop(1, c2);
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, fillW, h);

    // Perda deixa uma cicatriz quente; ganho recebe um brilho marfim. Ambos
    // duram só até o rastro alcançar o valor exibido.
    if (trailW > fillW + 0.5) {
      ctx.fillStyle = opts.damageTrail || 'rgba(255,115,90,0.72)';
      ctx.fillRect(x + fillW, y, trailW - fillW, h);
    } else if (trailW < fillW - 0.5) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = opts.healTrail || 'rgba(255,244,205,0.55)';
      ctx.fillRect(x + trailW, y, fillW - trailW, h);
    }

    if (state.flash > 0) {
      const glowW = Math.min(18, Math.max(6, w * 0.12));
      const glow = ctx.createLinearGradient(x + fillW - glowW, y, x + fillW + 2, y);
      glow.addColorStop(0, 'rgba(255,255,255,0)');
      glow.addColorStop(0.7, `rgba(255,255,255,${state.flash * 0.52})`);
      glow.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = glow;
      ctx.fillRect(x + fillW - glowW, y, glowW + 2, h);
    }
    ctx.restore();

    ctx.strokeStyle = opts.stroke || 'rgba(255,255,255,0.18)';
    ctx.strokeRect(x, y, w, h);
    if (opts.warning && state.target <= 0.25) {
      const pulse = 0.24 + 0.18 * (0.5 + 0.5 * Math.sin(Game.frames * 0.12));
      ctx.strokeStyle = `rgba(255,150,104,${pulse})`;
      ctx.strokeRect(x - 1, y - 1, w + 2, h + 2);
    }
    return state;
  }
};

const Hud = {
  bannerData: null, toasts: [],

  showBanner(kanji, name, sub) {
    this.bannerData = { kanji, name, sub, t: 0, dur: 220 };
    Sfx.tone({ f: 392, dur: 0.6, type: 'sine', vol: 0.1 });
    Sfx.tone({ f: 587, dur: 0.8, type: 'sine', vol: 0.08, delay: 0.2 });
  },

  toast(txt, color) {
    this.toasts.push({ txt, color: color || '#ffe9b0', t: 0, dur: 180 });
    if (this.toasts.length > 3) this.toasts.shift();
  },

  update() {
    UiMotion.update();
    if (this.bannerData && ++this.bannerData.t > this.bannerData.dur) this.bannerData = null;
    for (let i = this.toasts.length - 1; i >= 0; i--) {
      if (++this.toasts[i].t > this.toasts[i].dur) this.toasts.splice(i, 1);
    }
  },

  draw(ctx) {
    const p = Game.player;
    const resource = value => Math.abs(value - Math.round(value)) < 0.01
      ? Math.round(value) : value.toFixed(1);

    // ── painel de status ──
    ctx.save();
    // Painéis um pouco mais densos: o mundo pode ser escuro sem que recursos
    // vitais percam contraste contra as silhuetas e o bloom.
    ctx.fillStyle = 'rgba(5,8,18,0.78)';
    ctx.fillRect(12, 12, 226, 74);
    ctx.strokeStyle = 'rgba(255,214,130,0.42)';
    ctx.strokeRect(12, 12, 226, 74);

    // nível
    ctx.fillStyle = 'rgba(255,220,140,0.15)';
    ctx.beginPath(); ctx.arc(38, 46, 19, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(255,220,140,0.6)';
    ctx.beginPath(); ctx.arc(38, 46, 19, 0, 7); ctx.stroke();
    ctx.fillStyle = '#ffe9b0';
    ctx.font = '700 15px "Segoe UI", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(p.level, 38, 43);
    ctx.font = '8px "Segoe UI", sans-serif';
    ctx.fillStyle = '#bfa878';
    ctx.fillText('NÍVEL', 38, 56);

    UiMotion.drawBar(ctx, 'explore-hp', 66, 22, 160, 11, p.hp, p.maxHp,
      Game.essenceLost ? '#c8b070' : '#ffe08a', Game.essenceLost ? '#7a5a28' : '#d98a2b',
      { warning: true, stroke: 'rgba(255,255,255,0.15)' });
    // essência perdida: uma fatia da vida máxima aparece rachada e apagada
    if (Game.essenceLost && Game.hpPenalty > 0) {
      const full = p.maxHp + Game.hpPenalty;
      const lostW = 160 * (Game.hpPenalty / full);
      const x0 = 66 + 160 - lostW;
      ctx.save();
      ctx.fillStyle = 'rgba(10,8,14,0.62)';
      ctx.fillRect(x0, 22, lostW, 11);
      ctx.strokeStyle = 'rgba(255,220,150,0.35)';
      ctx.lineWidth = 1;
      // fratura em ziguezague
      ctx.beginPath();
      ctx.moveTo(x0, 22);
      for (let sx = x0; sx <= 66 + 160; sx += 6) {
        ctx.lineTo(sx, 22 + ((sx / 6) % 2 ? 8 : 3));
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,224,150,0.8)';
      ctx.font = '8px "Segoe UI", sans-serif';
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText('魂', 66 + 158, 27.5);
      ctx.restore();
    }
    UiMotion.drawBar(ctx, 'explore-mp', 66, 39, 116, 8, p.mp, p.maxMp,
      '#a8c8ff', '#5a6ee0', { healTrail: 'rgba(190,225,255,0.52)', stroke: 'rgba(255,255,255,0.15)' });
    UiMotion.drawBar(ctx, 'explore-xp', 66, 53, 160, 4, p.xp, p.xpNext(),
      '#fff3cf', '#c8a04a', { healTrail: 'rgba(255,232,170,0.45)', stroke: 'rgba(255,255,255,0.12)' });
    ctx.fillStyle = '#b9cce5';
    ctx.font = '9px "Segoe UI", sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(resource(p.hp) + '/' + p.maxHp + ' PV', 66, 70);
    ctx.fillText(resource(p.mp) + '/' + p.maxMp + ' PM', 140, 70);

    // essências
    const shogunEssences = Game.shogunEssenceCount();
    const gOpen = Game.hasAllShogunEssences();
    const need = 3;
    ctx.textBaseline = 'middle';
    for (let i = 0; i < need; i++) {
      const ex = 260 + i * 20, ey = 28;
      const filled = shogunEssences > i;
      ctx.save();
      if (filled) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.shadowColor = '#ffd678'; ctx.shadowBlur = 8;
        ctx.fillStyle = '#ffe4a0';
      } else {
        ctx.fillStyle = 'rgba(20,28,48,0.8)';
        ctx.strokeStyle = 'rgba(160,180,220,0.4)';
      }
      ctx.beginPath();
      ctx.moveTo(ex, ey - 8); ctx.lineTo(ex + 6, ey); ctx.lineTo(ex, ey + 8); ctx.lineTo(ex - 6, ey);
      ctx.closePath();
      ctx.fill();
      if (!filled) ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = '#9fb8d8';
    ctx.font = '9px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(gOpen ? 'essências dos Shōguns — portal ativo' : `essências dos Shōguns — ${shogunEssences}/${need}`, 252, 48);

    // amuleto
    if (Game.equipped) {
      const sui = Game.equipped === 'sui';
      const ka = Game.equipped === 'ka';
      const wind = Game.equipped === 'wind';
      const ancestralKa = ka && Game.fireAmuletForm === 'ancestral';
      const ax = 262, ay = 66;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.shadowBlur = 8;
      if (sui) {
        ctx.fillStyle = '#bfe8ff';
        ctx.shadowColor = '#7fd4ff';
        ctx.beginPath();
        ctx.moveTo(ax, ay - 6);
        ctx.bezierCurveTo(ax + 5, ay - 1, ax + 4, ay + 4, ax, ay + 5);
        ctx.bezierCurveTo(ax - 4, ay + 4, ax - 5, ay - 1, ax, ay - 6);
        ctx.fill();
      } else if (ka) {
        ctx.fillStyle = ancestralKa ? '#b9f4ff' : '#ffcf9a';
        ctx.shadowColor = ancestralKa ? '#2bbcff' : '#ff9a50';
        ctx.beginPath();
        ctx.moveTo(ax, ay - 7);
        ctx.bezierCurveTo(ax + 6, ay - 1, ax + 5, ay + 4, ax, ay + 5);
        ctx.bezierCurveTo(ax - 5, ay + 4, ax - 6, ay - 1, ax, ay - 7);
        ctx.fill();
        if (ancestralKa) {
          // O núcleo escuro e as duas centelhas distinguem a forma ancestral
          // sem aumentar a área permanente ocupada pelo HUD.
          ctx.fillStyle = '#248dff';
          ctx.shadowColor = '#66dcff';
          ctx.beginPath();
          ctx.moveTo(ax, ay - 3);
          ctx.bezierCurveTo(ax + 3, ay, ax + 2, ay + 3, ax, ay + 4);
          ctx.bezierCurveTo(ax - 2, ay + 3, ax - 3, ay, ax, ay - 3);
          ctx.fill();
          ctx.fillStyle = '#a9f5ff';
          ctx.beginPath();
          ctx.arc(ax - 5, ay - 7, 1.1, 0, Math.PI * 2);
          ctx.arc(ax + 5, ay - 9, 0.9, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (wind) {
        ctx.fillStyle = '#bdf0ea';
        ctx.shadowColor = '#a2e8c9';
        ctx.beginPath();
        ctx.arc(ax, ay, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      let labelColor = '#a2e8c9';
      let labelText = 'Fū — Amuleto do Vento';
      if (sui) {
        labelColor = '#8fc8e8';
        labelText = 'Sui — Amuleto da Água';
      } else if (ka) {
        labelColor = ancestralKa ? '#85dcff' : '#e8a878';
        labelText = ancestralKa
          ? 'Ka Ancestral — Amuleto de Fogo Ancestral'
          : 'Ka — Amuleto de Fogo';
      }
      ctx.fillStyle = labelColor;
      ctx.font = ancestralKa ? '600 8.5px "Segoe UI", sans-serif' : '9px "Segoe UI", sans-serif';
      ctx.fillText(labelText, 274, ancestralKa ? 64 : 69);
      const canSwapAmulet = (Game.amulets.sui && Game.amulets.ka) || Game.amulets.wind;
      if (ancestralKa) {
        ctx.fillStyle = '#718eae';
        ctx.font = '8px "Segoe UI", sans-serif';
        ctx.fillText(`Incinerar: golpes marcam${canSwapAmulet ? ' · E trocar' : ''}`, 274, 76);
      } else if (canSwapAmulet) {
        ctx.fillStyle = '#7386a8';
        ctx.fillText('· E trocar', 380, 69);
      }
    }

    // ── karma: escuridão ⟷ luz ──
    this.drawKarma(ctx, 12, 96, 226);

    // ── katana empunhada ──
    if (Game.hasDarkKatana) {
      const dark = Game.wielded === 'dark';
      ctx.fillStyle = 'rgba(5,8,18,0.78)';
      ctx.fillRect(244, 96, 62, 18);
      ctx.strokeStyle = dark ? 'rgba(170,110,255,0.5)' : 'rgba(255,214,130,0.5)';
      ctx.strokeRect(244, 96, 62, 18);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.shadowBlur = 6;
      ctx.shadowColor = dark ? '#b98fff' : '#ffd678';
      ctx.fillStyle = dark ? '#c9a6ff' : '#ffe4a0';
      ctx.font = '700 12px serif';
      ctx.fillText(dark ? '闇' : '光', 256, 106);
      ctx.restore();
      ctx.fillStyle = '#7386a8';
      ctx.font = '9px "Segoe UI", sans-serif';
      ctx.fillText('Q trocar', 282, 106);
    }
    ctx.restore();
    if (window.WindKingdom && World.current === 'vento') WindKingdom.drawHud(ctx);
    this.drawOverlays(ctx);
  },

  drawKarma(ctx, kx, ky, kw) {
    const total = Enemies.total;
    const karma = Game.purified - Game.absorbed; // -total .. +total
    ctx.save();
      ctx.fillStyle = 'rgba(5,8,18,0.78)';
    ctx.fillRect(kx, ky, kw, 18);
    ctx.strokeStyle = 'rgba(140,150,190,0.25)';
    ctx.strokeRect(kx, ky, kw, 18);
    // trilho gradiente
    const bx = kx + 22, bw = kw - 44, by = ky + 6, bh = 6;
    const g = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    g.addColorStop(0, 'rgba(122,79,208,0.85)');
    g.addColorStop(0.5, 'rgba(20,26,44,0.9)');
    g.addColorStop(1, 'rgba(255,214,120,0.85)');
    ctx.fillStyle = g;
    ctx.fillRect(bx, by, bw, bh);
    // glifos
    ctx.font = '10px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#a98fe0';
    ctx.fillText('闇', kx + 11, ky + 10);
    ctx.fillStyle = '#ffd678';
    ctx.fillText('光', kx + kw - 11, ky + 10);
    // marcador
    const frac = U.clamp(karma / total, -1, 1);
    const mx = bx + bw / 2 + frac * (bw / 2 - 3);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const mcol = frac > 0.02 ? '#ffe4a0' : frac < -0.02 ? '#c9a6ff' : '#dfe8ff';
    ctx.shadowColor = mcol; ctx.shadowBlur = 7;
    ctx.fillStyle = mcol;
    ctx.beginPath();
    ctx.moveTo(mx, by - 3); ctx.lineTo(mx + 4, by + bh / 2); ctx.lineTo(mx, by + bh + 3); ctx.lineTo(mx - 4, by + bh / 2);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.restore();
  },

  drawOverlays(ctx) {
    // ── banner de zona ──
    if (this.bannerData) {
      const b = this.bannerData;
      let a = 1;
      if (b.t < 30) a = b.t / 30;
      else if (b.t > b.dur - 45) a = (b.dur - b.t) / 45;
      ctx.save();
      ctx.globalAlpha = a * 0.14;
      ctx.fillStyle = '#ffe9b0';
      ctx.font = '100px serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(b.kanji, 480, 160);
      // Uma placa discreta impede que troncos, lua ou partículas disputem
      // contraste com a descoberta de uma zona nova.
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(3,6,14,0.56)';
      ctx.fillRect(290, 124, 380, 88);
      ctx.strokeStyle = 'rgba(255,214,130,0.22)';
      ctx.strokeRect(290, 124, 380, 88);
      ctx.fillStyle = '#f4e6c4';
      ctx.font = '600 30px "Yu Mincho", "Segoe UI", serif';
      ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 8;
      ctx.fillText(b.name, 480, 158);
      // filetes decorativos
      ctx.strokeStyle = 'rgba(255,214,130,0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(320, 182); ctx.lineTo(640, 182); ctx.stroke();
      if (b.sub) {
        ctx.font = '14px "Segoe UI", sans-serif';
        ctx.fillStyle = '#c8b890';
        ctx.fillText(b.sub, 480, 200);
      }
      ctx.restore();
    }

    // ── avisos ──
    this.toasts.forEach((t, i) => {
      let a = 1;
      if (t.t < 12) a = t.t / 12;
      else if (t.t > t.dur - 30) a = (t.dur - t.t) / 30;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.font = '13px "Segoe UI", sans-serif';
      const w = ctx.measureText(t.txt).width + 28;
      const x = 480 - w / 2, y = 236 + i * 30;
      ctx.fillStyle = 'rgba(6,10,22,0.88)';
      ctx.fillRect(x, y, w, 24);
      ctx.strokeStyle = 'rgba(255,214,130,0.25)';
      ctx.strokeRect(x, y, w, 24);
      ctx.fillStyle = t.color;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(t.txt, 480, y + 12);
      ctx.restore();
    });
  }
};
