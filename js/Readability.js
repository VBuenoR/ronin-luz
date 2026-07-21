'use strict';

/**
 * LEGIBILIDADE E AVISOS — qualidade de vida global.
 *
 * 1) Mensagens de batalha duram o tempo de LEITURA: cada passo com texto
 *    ganha um piso de duração proporcional ao tamanho da frase (~25 chars/s),
 *    e ENTER/Z/ESPAÇO pula a mensagem atual quando o jogador já leu.
 *
 * 2) Todo torii mostra o aviso flutuante «Meditar (↑)» quando o Rōnin passa
 *    à sua frente (e «Despertar (↑)» durante a meditação).
 *
 * Módulo auto-instalável por wrapping — não edita battle.js/main.js.
 */
const Readability = {

  // piso de duração p/ mensagens: 40 frames + 1.5/char, teto de 300 (5s)
  msgFloor(msg, dur) {
    return Math.min(300, Math.max(dur || 0, 40 + Math.round(msg.length * 1.5)));
  },

  drawToriiPrompts(ctx, cam, frames) {
    const G = Game;
    if (!G || G.state !== 'explore' || G.dialog || G.wipe) return;
    if (window.AncientGarden && AncientGarden.cut) return;
    const p = G.player;
    if (!p || !p.onGround) return;
    for (const c of World.checkpoints) {
      if (Math.abs(p.x - c.x) >= 42 || Math.abs(p.y - c.y) >= 70) continue;
      const txt = p.meditating ? 'Despertar (↑)' : 'Meditar (↑)';
      const x = c.x - cam.x, y = c.y - 128 - cam.y;
      const bob = Math.sin(frames * 0.1) * 3;
      ctx.save();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '600 12px "Segoe UI", sans-serif';
      const w = ctx.measureText(txt).width + 16;
      ctx.fillStyle = 'rgba(8,12,20,0.72)';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x - w / 2, y - 10 + bob, w, 20, 6);
      else ctx.rect(x - w / 2, y - 10 + bob, w, 20);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,236,190,0.95)';
      ctx.fillText(txt, x, y + bob);
      ctx.restore();
      break;
    }
  }
};

window.Readability = Readability;

(function () {
  // 1a) piso de leitura em toda mensagem enfileirada
  const _push = Battle.push;
  Battle.push = function (step) {
    if (step && step.msg && step.dur) step.dur = Readability.msgFloor(step.msg, step.dur);
    return _push.call(this, step);
  };

  // 1b) confirmar pula a mensagem atual (após um mínimo de exibição)
  const _bu = Battle.update;
  Battle.update = function () {
    _bu.call(this);
    const c = this.q && this.q[0];
    if (c && c.started && c.msg && !this.menu.open
        && c.t > 26 && c.t < c.dur - 1 && Input.pressed('confirm')) {
      c.t = c.dur - 1;      // conclui no próximo tique, sem pular o callback
    }
  };

  // 2) aviso de meditação em todos os torii
  const _fg = World.drawForeground;
  World.drawForeground = function (ctx, cam, frames, player) {
    _fg.call(this, ctx, cam, frames, player);
    Readability.drawToriiPrompts(ctx, cam, frames);
  };
})();
