'use strict';

/**
 * LEGIBILIDADE E AVISOS — qualidade de vida global.
 *
 * 1) O combate mantém o ritmo original. Cada fala entra integralmente num
 *    histórico rolável, reiniciado quando um novo confronto começa.
 *
 * 2) Todo torii mostra o aviso flutuante «Meditar (↑)» quando o Rōnin passa
 *    à sua frente (e «Despertar (↑)» durante a meditação).
 *
 * Módulo auto-instalável por wrapping — não edita battle.js/main.js.
 */
const Readability = {

  // Compatibilidade com módulos antigos que consultam este helper. Não alonga
  // mais animações ou turnos: o histórico preserva o texto para leitura.
  msgFloor(msg, dur) {
    return dur || 0;
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

const BattleLog = {
  root: null,
  messages: null,
  entries: [],
  lastText: '',

  init() {
    this.root = document.getElementById('battle-log');
    this.messages = document.getElementById('battle-log-messages');
    this.layout();
    addEventListener('resize', () => this.layout());
  },

  layout() {
    if (!this.root || typeof canvas === 'undefined') return;
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / 960, rect.height / 540);
    const left = rect.left + (rect.width - 960 * scale) / 2;
    const top = rect.top + (rect.height - 540 * scale) / 2;
    this.root.style.left = `${left + 22 * scale}px`;
    this.root.style.top = `${top + 18 * scale}px`;
    this.root.style.transform = `scale(${scale})`;
  },

  reset() {
    this.entries = [];
    this.lastText = '';
    if (this.messages) this.messages.replaceChildren();
  },

  add(text) {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    if (!clean || clean === this.lastText || !this.messages) return;
    this.lastText = clean;
    this.entries.push(clean);

    const row = document.createElement('div');
    row.className = 'battle-log__entry';
    const marker = document.createElement('span');
    marker.className = 'battle-log__marker';
    marker.textContent = '›';
    const copy = document.createElement('span');
    copy.textContent = clean;
    row.append(marker, copy);
    this.messages.append(row);
    this.messages.scrollTop = this.messages.scrollHeight;
  },

  capture(battle) {
    // Toda atribuição existente zera msgT; capturar no mesmo quadro inclui
    // mensagens diretas de módulos como a Forja sem registrar passos descartados.
    if (battle && battle.msg && battle.msgT === 0) this.add(battle.msg);
  },

  syncVisibility() {
    if (!this.root) return;
    const visible = Game.state === 'battle' && Battle.active;
    this.root.hidden = !visible;
  }
};

window.BattleLog = BattleLog;

(function () {
  BattleLog.init();

  // 1a) uma batalha nova sempre nasce com o histórico vazio
  const _begin = Battle.begin;
  Battle.begin = function (...args) {
    BattleLog.reset();
    const result = _begin.apply(this, args);
    BattleLog.syncVisibility();
    return result;
  };

  // 1b) registra a fala quando ela realmente começa, mantendo a duração nativa
  const _bu = Battle.update;
  Battle.update = function () {
    const result = _bu.call(this);
    BattleLog.capture(this);
    return result;
  };

  // 2) aviso de meditação em todos os torii
  const _fg = World.drawForeground;
  World.drawForeground = function (ctx, cam, frames, player) {
    _fg.call(this, ctx, cam, frames, player);
    Readability.drawToriiPrompts(ctx, cam, frames);
  };

  // O estado pode sair da batalha por vitória, fuga, derrota ou pausa.
  const _render = Game.render;
  Game.render = function () {
    const result = _render.call(this);
    BattleLog.syncVisibility();
    return result;
  };
})();
