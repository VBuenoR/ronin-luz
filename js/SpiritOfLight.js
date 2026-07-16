'use strict';

/**
 * Recuperar Espírito — o conflito interno do protagonista.
 *
 * Ao morrer, parte da Essência Divina permanece no local e se manifesta como
 * o Espírito da Luz. Até recuperá-la, o Rōnin fica debilitado (metade da vida
 * máxima, sem Defesa da Luz, luz mais fraca). Aproximar-se da essência forma
 * uma arena espiritual: um confronto que não se vence destruindo, mas provando
 * equilíbrio entre força e compaixão.
 *
 * Este módulo cuida apenas do lado de CAMPO (estado, cicatriz, gatilho). O
 * confronto por turnos vive em battle.js (Espírito = inimigo especial).
 */
const SpiritOfLight = {

  // ─────────────────────────── penalidade ───────────────────────────

  /**
   * Chamado quando o jogador é derrotado numa batalha.
   * Aplica a penalidade (uma única vez) e (re)planta a essência no local da
   * derrota. Uma morte nova substitui a anterior — nunca há dois espíritos.
   */
  onDeath(map, x, y) {
    const p = Game.player;
    if (!Game.essenceLost) {
      // primeira perda: metade da vida máxima fica com o Espírito
      const penalty = Math.max(1, Math.floor(p.maxHp * 0.5));
      p.maxHp -= penalty;
      Game.hpPenalty = penalty;
      Game.essenceLost = true;
    }
    // vida do Espírito = 75% da vida máxima ORIGINAL (antes da penalidade)
    const originalMax = p.maxHp + Game.hpPenalty;
    Game.essence = {
      map, x, y,
      spiritHp: Math.max(12, Math.round(originalMax * 0.75)),
      t: Math.random() * 100,
      born: 0,
      armed: true   // gatilho re-arma só quando o jogador deixa o raio
    };
    if (p.hp > p.maxHp) p.hp = p.maxHp;
  },

  /**
   * Chamado ao recuar do confronto: desarma o gatilho para que o jogador
   * possa se afastar sem ser puxado de volta imediatamente.
   */
  disarm() {
    if (Game.essence) Game.essence.armed = false;
  },

  /**
   * Reúne a essência ao protagonista. Restaura tudo e apaga a cicatriz.
   */
  recover() {
    const p = Game.player;
    p.maxHp += Game.hpPenalty;
    Game.hpPenalty = 0;
    Game.essenceLost = false;
    Game.essence = null;
    p.hp = p.maxHp;
    p.mp = p.maxMp;
  },

  // ──────────────────────── campo: cicatriz ─────────────────────────

  /** Avança a animação da cicatriz e dispara o encontro por proximidade. */
  update() {
    const e = Game.essence;
    if (!e) return;
    e.t++;
    if (e.born < 60) e.born++;
    if (e.map !== World.current) return;

    // motas douradas subindo da cicatriz
    if (Math.random() < 0.25) {
      Particles.spawn({
        x: e.x + U.rand(-16, 16), y: e.y - U.rand(0, 40),
        vx: U.rand(-0.3, 0.3), vy: U.rand(-0.9, -0.3),
        life: 70, size: U.rand(1.4, 2.6),
        color: 'rgba(255,224,150,0.85)', type: 'wisp'
      });
    }

    // re-arma quando o jogador sai da zona (raio maior que o de gatilho)
    const p = Game.player;
    if (!e.armed && (Math.abs(p.x - e.x) > 70 || Math.abs(p.y - e.y) > 100)) {
      e.armed = true;
    }

    // gatilho do confronto (só se armado)
    if (e.armed && e.born >= 40 && !Game.wipe
        && Math.abs(p.x - e.x) < 40 && Math.abs(p.y - e.y) < 70) {
      Game.startSpiritBattle();
    }
  },

  /** Desenha a Cicatriz de Luz e o reflexo incompleto pairando sobre ela. */
  draw(ctx, cam, frames) {
    const e = Game.essence;
    if (!e || e.map !== World.current) return;
    const sx = e.x - cam.x, sy = e.y - cam.y;
    if (sx < -80 || sx > 1040 || sy < -120 || sy > 640) return;

    const rise = U.easeOut(U.clamp(e.born / 60, 0, 1));
    const pulse = 0.6 + 0.4 * Math.sin(frames * 0.05);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // fenda dourada no chão (a cicatriz)
    const scar = ctx.createRadialGradient(sx, sy, 2, sx, sy, 46 * rise);
    scar.addColorStop(0, `rgba(255,232,170,${0.5 * pulse * rise})`);
    scar.addColorStop(1, 'rgba(255,232,170,0)');
    ctx.fillStyle = scar;
    ctx.beginPath(); ctx.ellipse(sx, sy, 46 * rise, 12 * rise, 0, 0, 7); ctx.fill();

    // feixe vertical suave
    const beam = ctx.createLinearGradient(sx, sy, sx, sy - 90 * rise);
    beam.addColorStop(0, `rgba(255,236,180,${0.28 * rise})`);
    beam.addColorStop(1, 'rgba(255,236,180,0)');
    ctx.fillStyle = beam;
    ctx.fillRect(sx - 10, sy - 90 * rise, 20, 90 * rise);

    ctx.restore();

    // silhueta incompleta do Rōnin, pairando, semitransparente
    if (typeof drawLightSamurai === 'function') {
      ctx.save();
      ctx.globalAlpha = 0.5 * rise;
      const hover = sy - 40 * rise + Math.sin(frames * 0.04) * 3;
      drawLightSamurai(ctx, sx, hover, 1.0, {
        facing: -Game.player.facing, pose: 'idle', t: frames, spirit: true
      });
      ctx.restore();
    }

    // seta de convocação quando perto
    const p = Game.player;
    if (Math.abs(p.x - e.x) < 120 && Math.abs(p.y - e.y) < 110) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(255,236,180,${0.7 + 0.3 * Math.sin(frames * 0.12)})`;
      ctx.font = '700 12px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('魂', sx, sy - 96 * rise);
      ctx.restore();
    }
  }
};

window.SpiritOfLight = SpiritOfLight;
