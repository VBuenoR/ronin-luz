'use strict';

/**
 * A GRUTA SUBMERSA — clareza de leitura na descida para a água (floresta).
 *
 * A colisão do lago → gruta → Salão Afogado já funciona, mas era pintada com
 * sólidos genéricos: debaixo da névoa azul, parede sólida, vão e água aberta
 * tinham o mesmo aspecto. Este módulo NÃO toca na colisão — só desenha por cima,
 * de forma diegética, para o caminho se contar sozinho:
 *
 *   ① a grade de colunas no topo → feixes de luz marcam onde mergulhar;
 *   ② o vão leste da gruta (y1800–1980) → moldura de algas + cáustica do salão;
 *   ③ a passagem oeste (abaixo de y1990) → moldura de algas + luz;
 *   · paredes sólidas ganham aresta crua (leem como bloqueio);
 *   · uma correnteza de bolhas flui pela rota; flora acende a trilha segura;
 *   · os defletores do salão mostram cáustica só no canal livre (sob/sobre/sob).
 *
 * Módulo auto-instalável por wrapping. Ativo apenas na floresta, na região da
 * água (x 5050–7400, y 1200–2440).
 */
const SunkenGrotto = {

  X0: 5050, X1: 7400, Y0: 1200, Y1: 2440,

  active(cam) {
    return World.current === 'floresta'
      && this.X1 - cam.x > -200 && this.X0 - cam.x < 1160;
  },

  // colunas da "grade" no topo do lago (onde se mergulha)
  columns: [
    { x: 5360, w: 70 }, { x: 5520, w: 70 }, { x: 5660, w: 70 }
  ],
  // vãos de mergulho na superfície (entre a margem e as colunas)
  dropGaps: [
    { x: 5430, w: 90, wide: true },   // margem-col1... na verdade col1→col2
    { x: 5590, w: 70, wide: true }    // col2→col3
  ],
  LAKE: { x: 5330, top: 1290, w: 480, bottom: 2240 },

  // paredes sólidas que precisam ler como rocha maciça
  walls: [
    { x: 5250, y: 1440, w: 80, h: 550 },    // parede oeste da gruta
    { x: 5810, y: 1540, w: 110, h: 260 },   // parede leste acima
    { x: 5810, y: 1980, w: 110, h: 260 },   // parede leste abaixo
    { x: 5250, y: 2140, w: 670, h: 120 },   // fundo da gruta
    { x: 6180, y: 1710, w: 80, h: 320, baffle: 'under' },  // defletor 1: passa por baixo
    { x: 6480, y: 1980, w: 80, h: 360, baffle: 'over' },   // defletor 2: passa por cima
    { x: 6780, y: 1710, w: 80, h: 330, baffle: 'under' }   // defletor 3: passa por baixo
  ],
  ledges: [
    { x: 5330, y: 1620, w: 170 }, { x: 5640, y: 1800, w: 170 }, { x: 5330, y: 1980, w: 190 }
  ],
  // as bocas de passagem (moldura + luz)
  gates: [
    { id: 'east', x: 5810, y: 1800, w: 110, h: 180, dir: 'east' },   // ② saída para o salão
    { id: 'west', x: 5250, y: 1990, w: 80,  h: 150, dir: 'down' }    // ③ passagem oeste/baixo
  ],

  // rota da correnteza (o olho segue as bolhas)
  currentPath: [
    { x: 5475, y: 1330 }, { x: 5600, y: 1500 }, { x: 5590, y: 1720 }, { x: 5640, y: 1900 },
    { x: 5865, y: 1890 }, { x: 6050, y: 2010 }, { x: 6210, y: 2210 }, { x: 6360, y: 2000 },
    { x: 6520, y: 1810 }, { x: 6660, y: 2010 }, { x: 6810, y: 2210 }, { x: 6980, y: 2110 },
    { x: 7180, y: 2200 }
  ],

  // ═══════════════════ CAMADA 1 — ESTRUTURA (sob a luz) ═══════════════════
  drawStructure(ctx, cam, frames) {
    if (!this.active(cam)) return;
    ctx.save();
    ctx.translate(-cam.x, -cam.y);

    // paredes sólidas: aresta crua para lerem como rocha maciça
    for (const w of this.walls) {
      // rim superior claro + sombra interna: dá volume e "peso"
      ctx.fillStyle = 'rgba(126,150,172,0.5)';
      ctx.fillRect(w.x, w.y, w.w, 4);
      ctx.strokeStyle = 'rgba(8,16,26,0.7)';
      ctx.lineWidth = 2;
      ctx.strokeRect(w.x + 1, w.y + 1, w.w - 2, w.h - 2);
      // veios de rocha verticais (textura sólida)
      ctx.strokeStyle = 'rgba(12,22,34,0.4)';
      ctx.lineWidth = 1;
      const n = Math.max(1, Math.floor(w.w / 26));
      for (let i = 1; i < n; i++) {
        const vx = w.x + i * (w.w / n);
        ctx.beginPath();
        ctx.moveTo(vx, w.y + 6);
        ctx.lineTo(vx + (WorldHashS(vx, w.y) - 0.5) * 8, w.y + w.h - 6);
        ctx.stroke();
      }
    }

    // molduras das bocas de passagem: batentes de rocha lascada
    for (const g of this.gates) {
      ctx.strokeStyle = 'rgba(70,96,108,0.85)';
      ctx.lineWidth = 5;
      if (g.dir === 'east') {
        // batentes em cima e embaixo do vão (parede leste partida)
        ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(g.x + g.w, g.y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(g.x, g.y + g.h); ctx.lineTo(g.x + g.w, g.y + g.h); ctx.stroke();
      } else {
        // moldura lateral (parede oeste termina aqui)
        ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(g.x, g.y + g.h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(g.x + g.w, g.y); ctx.lineTo(g.x + g.w, g.y + g.h); ctx.stroke();
      }
    }

    // flora bioluminescente (base, sem glow) forrando a trilha segura
    for (const l of this.ledges) this._floraBase(ctx, l.x + 12, l.y, frames);
    for (const l of this.ledges) this._floraBase(ctx, l.x + l.w - 12, l.y, frames);
    // tufos nas bocas de passagem (marcam a saída)
    this._floraBase(ctx, 5810, 1800, frames);
    this._floraBase(ctx, 5810, 1980, frames);
    this._floraBase(ctx, 5330, 1990, frames);

    ctx.restore();
  },

  _floraBase(ctx, x, y, frames) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = 'rgba(40,74,66,0.9)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const sway = Math.sin(frames * 0.03 + x + i) * 4;
      ctx.beginPath();
      ctx.moveTo((i - 1) * 5, 0);
      ctx.quadraticCurveTo((i - 1) * 5 + sway * 0.5, -12, (i - 1) * 5 + sway, -22 - i * 3);
      ctx.stroke();
    }
    ctx.restore();
  },

  // ═══════════════════ CAMADA 2 — LUZ/CÁUSTICA (sobre a luz) ═══════════════════
  drawGlow(ctx, cam, frames) {
    if (!this.active(cam)) return;
    ctx.save();
    ctx.translate(-cam.x, -cam.y);
    ctx.globalCompositeOperation = 'lighter';

    // ── ① feixes de luz descendo entre as colunas: "mergulhe aqui" ──
    for (const gap of this.dropGaps) {
      const cx = gap.x + gap.w / 2;
      const sway = Math.sin(frames * 0.03 + cx) * 6;
      const g = ctx.createLinearGradient(0, this.LAKE.top, 0, this.LAKE.top + 460);
      g.addColorStop(0, `rgba(200,235,255,${gap.wide ? 0.22 : 0.12})`);
      g.addColorStop(1, 'rgba(200,235,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(cx - gap.w * 0.4, this.LAKE.top);
      ctx.lineTo(cx + gap.w * 0.4, this.LAKE.top);
      ctx.lineTo(cx + 8 + sway, this.LAKE.top + 460);
      ctx.lineTo(cx - 8 + sway, this.LAKE.top + 460);
      ctx.closePath(); ctx.fill();
    }
    // brilho de convite na superfície dos vãos
    for (const gap of this.dropGaps) {
      const cx = gap.x + gap.w / 2;
      const pulse = 0.5 + 0.5 * Math.sin(frames * 0.06 + cx);
      const r = ctx.createRadialGradient(cx, this.LAKE.top, 2, cx, this.LAKE.top, 48);
      r.addColorStop(0, `rgba(150,220,255,${0.18 + 0.12 * pulse})`);
      r.addColorStop(1, 'rgba(150,220,255,0)');
      ctx.fillStyle = r;
      ctx.beginPath(); ctx.arc(cx, this.LAKE.top, 48, 0, 7); ctx.fill();
    }

    // ── ②③ cáustica atravessando as bocas de passagem ──
    for (const gate of this.gates) {
      const pulse = 0.5 + 0.5 * Math.sin(frames * 0.05 + gate.x);
      if (gate.dir === 'east') {
        // luz do salão jorra para oeste, para dentro da gruta
        const g = ctx.createLinearGradient(gate.x + gate.w, 0, gate.x - 60, 0);
        g.addColorStop(0, `rgba(150,225,255,${0.22 + 0.1 * pulse})`);
        g.addColorStop(1, 'rgba(150,225,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(gate.x - 60, gate.y + 6, gate.w + 60, gate.h - 12);
      } else {
        // luz desce pela boca oeste
        const g = ctx.createLinearGradient(0, gate.y, 0, gate.y + gate.h + 40);
        g.addColorStop(0, `rgba(150,225,255,${0.20 + 0.1 * pulse})`);
        g.addColorStop(1, 'rgba(150,225,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(gate.x + 4, gate.y, gate.w - 8, gate.h + 40);
      }
      // contorno de algas acesas emoldurando a abertura
      ctx.strokeStyle = `rgba(120,240,200,${0.45 + 0.25 * pulse})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(gate.x + 2, gate.y + 2, gate.w - 4, gate.h - 4);
    }

    // ── defletores do salão: cáustica só no canal LIVRE (sob/sobre/sob) ──
    for (const w of this.walls) {
      if (!w.baffle) continue;
      const pulse = 0.5 + 0.5 * Math.sin(frames * 0.045 + w.x);
      let cy, ch;
      if (w.baffle === 'under') { cy = w.y + w.h; ch = 2340 - (w.y + w.h); }  // canal embaixo
      else { cy = 1700; ch = w.y - 1700; }                                    // canal em cima
      if (ch <= 0) continue;
      const g = ctx.createLinearGradient(0, cy, 0, cy + ch);
      const c0 = `rgba(150,225,255,${0.16 + 0.08 * pulse})`;
      if (w.baffle === 'under') { g.addColorStop(0, 'rgba(150,225,255,0)'); g.addColorStop(1, c0); }
      else { g.addColorStop(0, c0); g.addColorStop(1, 'rgba(150,225,255,0)'); }
      ctx.fillStyle = g;
      ctx.fillRect(w.x - 14, cy, w.w + 28, ch);
    }

    // ── flora bioluminescente acesa na trilha ──
    for (const l of this.ledges) {
      for (const fx of [l.x + 12, l.x + l.w - 12]) {
        const pulse = 0.5 + 0.5 * Math.sin(frames * 0.07 + fx);
        const r = ctx.createRadialGradient(fx, l.y - 16, 1, fx, l.y - 16, 22);
        r.addColorStop(0, `rgba(120,240,200,${0.20 + 0.14 * pulse})`);
        r.addColorStop(1, 'rgba(120,240,200,0)');
        ctx.fillStyle = r;
        ctx.beginPath(); ctx.arc(fx, l.y - 16, 22, 0, 7); ctx.fill();
      }
    }

    ctx.restore();
  },

  // ═══════════════════ correnteza de bolhas (guia diegético) ═══════════════════
  update(G) {
    if (World.current !== 'floresta') return;
    // só borbulha quando a câmera está na região da água (custo baixo)
    if (this.X1 - G.cam.x < -300 || this.X0 - G.cam.x > 1260) return;
    const P = this.currentPath;
    // 1–2 bolhas por quadro, num segmento aleatório, fluindo para o próximo ponto
    const n = Math.random() < 0.6 ? 2 : 1;
    for (let k = 0; k < n; k++) {
      const i = Math.floor(Math.random() * (P.length - 1));
      const a = P[i], b = P[i + 1];
      const t = Math.random();
      const px = a.x + (b.x - a.x) * t, py = a.y + (b.y - a.y) * t;
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      Particles.spawn({
        x: px + U.rand(-10, 10), y: py + U.rand(-10, 10),
        vx: (dx / len) * 0.5 + U.rand(-0.1, 0.1),
        vy: (dy / len) * 0.5 - 0.25,          // leve empuxo para cima
        life: 60, size: U.rand(1.2, 2.4),
        color: 'rgba(180,235,255,0.6)', type: 'orb', drag: 0.99
      });
    }
  }
};

function WorldHashS(x, y) {
  let h = (Math.floor(x) * 374761393 + Math.floor(y) * 668265263) | 0;
  h = (h ^ (h >> 13)) * 1274126177 | 0;
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
}

window.SunkenGrotto = SunkenGrotto;

// ───────────────────── instalação por wrapping ─────────────────────
(function () {
  const SG = SunkenGrotto;

  // estrutura: após os sólidos base (contraste da rocha, molduras, flora base)
  const _dw = World.drawWorld;
  World.drawWorld = function (ctx, cam, frames) {
    _dw.call(this, ctx, cam, frames);
    SG.drawStructure(ctx, cam, frames);
  };

  // luz/cáustica/glow: no passe de frente, depois do Lighting (brilho real)
  const _fg = World.drawForeground;
  World.drawForeground = function (ctx, cam, frames, player) {
    _fg.call(this, ctx, cam, frames, player);
    SG.drawGlow(ctx, cam, frames);
  };

  // correnteza de bolhas
  const _exp = Game.exploreUpdate;
  Game.exploreUpdate = function () {
    _exp.call(this);
    if (this.state === 'explore') SG.update(this);
  };
})();
