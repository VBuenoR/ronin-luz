'use strict';

/**
 * FORTALEZA DO REINO DO VENTO — redesenho arquitetônico completo.
 *
 * A fortaleza deixa de ser um empilhado de plataformas e passa a ser UM castelo
 * colossal em ruínas, erguido sobre uma montanha suspensa acima das nuvens:
 *
 *   BASE (y~2180)  Portão despedaçado · Salão de Recepção (o portal mora aqui)
 *   y~2020         Salão Principal
 *   y~1840         Antigo Arsenal (oeste) · Salão dos Cavaleiros
 *   y~1660         Biblioteca em ruínas · Galeria alta
 *   y~1490         Capela do Vento · Quartos da guarda
 *   y~1360         Terraço da Torre Central (o moinho)
 *   y~260          TRONO DOS CÉUS — templo de um deus
 *
 * O esqueleto de jogabilidade (níveis, rotas, checkpoints, penas, inimigos) é
 * preservado; o que muda é a LEITURA: cada piso vira corredor, muralha, salão,
 * sacada, escadaria ou galeria — e a silhueta ganha torre central dominante.
 *
 * Módulo auto-instalável por wrapping, para sobreviver a edições paralelas.
 */
const WindFortress = {

  // ─────────────────────── região e paleta ───────────────────────
  X0: 4020, X1: 5960,           // vãos da fortaleza
  BASE_Y: 2180, DECK_Y: 1360,   // base e terraço da torre
  THRONE: { x: 4250, y: 260, w: 1740 },

  // pedra clara em cima (mais sagrada), escura embaixo (mais soterrada)
  stone(y, shade) {
    const k = U.clamp((this.BASE_Y - y) / (this.BASE_Y - 200), 0, 1);
    const base = U.mixRGB([74, 82, 92], [186, 196, 204], k);
    const c = U.mixRGB([12, 14, 18], base, shade);
    return U.rgb(c);
  },

  inFortress(s) {
    return s.x + s.w > this.X0 - 40 && s.x < this.X1 + 40 && s.y > 200;
  },

  // ─────────────────────── geometria nova ────────────────────────
  /**
   * Acrescenta os pavimentos da Torre Central e a estrutura do Trono dos Céus.
   * Os pisos originais continuam existindo — agora com função arquitetônica.
   */
  install() {
    const S = WindKingdom.map.solids;
    const add = (o) => { if (!S.some(p => p.id === o.id)) S.push(o); };

    // ── Torre Central: pavimentos internos e passarelas de manutenção ──
    add({ x: 4830, y: 1180, w: 190, h: 22, id: 'millFloor1' });
    add({ x: 4700, y: 1020, w: 150, h: 20, id: 'millCatwalkW' });
    add({ x: 5010, y: 1020, w: 150, h: 20, id: 'millCatwalkE' });
    add({ x: 4840, y: 880, w: 170, h: 20, id: 'millFloor2' });

    // ── Trono dos Céus: escadaria colossal e altar ──
    const T = this.THRONE;
    add({ x: T.x - 150, y: T.y + 118, w: 150, h: 26, id: 'throneStepW1' });
    add({ x: T.x - 96, y: T.y + 68, w: 96, h: 26, id: 'throneStepW2' });
    add({ x: T.x + T.w, y: T.y + 118, w: 150, h: 26, id: 'throneStepE1' });
    add({ x: T.x + T.w, y: T.y + 68, w: 96, h: 26, id: 'throneStepE2' });
    add({ x: T.x + T.w / 2 - 130, y: T.y - 92, w: 260, h: 30, id: 'throneDais' });

    this.ready = true;
  },

  // ═══════════════════════ CAMADA 1 — SILHUETA ═══════════════════
  /**
   * O castelo visto de longe: uma montanha suspensa encimada por um castelo
   * colossal, com torre central dominando tudo. Substitui o backdrop antigo.
   */
  drawBackdrop(ctx, cam, frames) {
    if (this.X1 - cam.x < -200 || this.X0 - cam.x > 1160) return;
    ctx.save();
    ctx.translate(-cam.x, -cam.y);

    // ── a montanha suspensa que sustenta tudo ──
    const rock = ctx.createLinearGradient(0, this.BASE_Y, 0, this.BASE_Y + 620);
    rock.addColorStop(0, '#3d4652');
    rock.addColorStop(0.5, '#2b333d');
    rock.addColorStop(1, '#151a22');
    ctx.fillStyle = rock;
    ctx.beginPath();
    ctx.moveTo(this.X0 - 30, this.BASE_Y + 40);
    ctx.lineTo(this.X1 + 30, this.BASE_Y + 40);
    ctx.lineTo(this.X1 - 110, this.BASE_Y + 330);
    ctx.lineTo(this.X1 - 300, this.BASE_Y + 470);
    ctx.lineTo(4980, this.BASE_Y + 640);   // a ponta da montanha
    ctx.lineTo(4700, this.BASE_Y + 430);
    ctx.lineTo(this.X0 + 190, this.BASE_Y + 360);
    ctx.closePath();
    ctx.fill();
    // veios de rocha
    ctx.strokeStyle = 'rgba(20,24,30,0.5)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 5; i++) {
      const vx = this.X0 + 260 + i * 300;
      ctx.beginPath();
      ctx.moveTo(vx, this.BASE_Y + 50);
      ctx.lineTo(vx - 40 - i * 12, this.BASE_Y + 240 + i * 30);
      ctx.lineTo(vx - 10 - i * 6, this.BASE_Y + 420);
      ctx.stroke();
    }
    // raízes/correntes que prendem a montanha
    ctx.strokeStyle = 'rgba(58,52,44,0.7)';
    ctx.lineWidth = 6;
    for (let i = 0; i < 3; i++) {
      const cx2 = 4400 + i * 520;
      ctx.beginPath();
      ctx.moveTo(cx2, this.BASE_Y + 200);
      ctx.quadraticCurveTo(cx2 - 30, this.BASE_Y + 480, cx2 + 20, this.BASE_Y + 700);
      ctx.stroke();
    }

    // ── corpo do castelo ao fundo (massa em ruínas) ──
    const wall = ctx.createLinearGradient(0, this.DECK_Y - 60, 0, this.BASE_Y);
    wall.addColorStop(0, '#6d7683');
    wall.addColorStop(0.45, '#4d5764');
    wall.addColorStop(1, '#2b333e');
    ctx.fillStyle = wall;
    ctx.beginPath();
    ctx.moveTo(this.X0 + 10, this.BASE_Y);
    // muralha oeste subindo em degraus quebrados
    ctx.lineTo(this.X0 + 10, 1900);
    ctx.lineTo(this.X0 + 70, 1900);
    ctx.lineTo(this.X0 + 70, 1700);
    ctx.lineTo(this.X0 + 150, 1660);
    ctx.lineTo(this.X0 + 150, 1470);
    ctx.lineTo(this.X0 + 240, 1470);
    ctx.lineTo(this.X0 + 240, 1330);
    // topo recortado (telhados desabados)
    ctx.lineTo(4460, 1330);
    ctx.lineTo(4500, 1250);
    ctx.lineTo(4560, 1300);
    ctx.lineTo(4640, 1230);
    ctx.lineTo(4700, 1300);
    ctx.lineTo(4780, 1240);
    ctx.lineTo(4820, 1310);
    ctx.lineTo(5080, 1310);
    ctx.lineTo(5140, 1235);
    ctx.lineTo(5220, 1290);
    ctx.lineTo(5300, 1225);
    ctx.lineTo(5360, 1300);
    ctx.lineTo(5560, 1300);
    ctx.lineTo(5560, 1420);
    ctx.lineTo(5700, 1420);
    ctx.lineTo(5700, 1560);
    ctx.lineTo(5790, 1600);
    ctx.lineTo(5790, 1860);
    ctx.lineTo(5880, 1900);
    ctx.lineTo(5880, this.BASE_Y);
    ctx.closePath();
    ctx.fill();

    // torres laterais quebradas (silhueta forte)
    const tower = (x, top, w, broken) => {
      ctx.fillStyle = '#5a6472';
      ctx.fillRect(x, top, w, this.BASE_Y - top);
      // ameias
      ctx.fillStyle = '#68727f';
      for (let i = 0; i < Math.floor(w / 22); i++) {
        const h = broken && i % 3 === 1 ? 6 : 14;
        ctx.fillRect(x + 6 + i * 22, top - h, 12, h);
      }
      // topo desabado
      if (broken) {
        ctx.fillStyle = '#4a5361';
        ctx.beginPath();
        ctx.moveTo(x, top); ctx.lineTo(x + w * 0.6, top - 18); ctx.lineTo(x + w, top + 8);
        ctx.closePath(); ctx.fill();
      }
    };
    tower(this.X0 + 30, 1560, 92, true);
    tower(5680, 1500, 104, true);
    tower(4380, 1420, 76, false);

    // arcos góticos vazados no fundo (galeria profunda)
    ctx.fillStyle = 'rgba(18,22,29,0.72)';
    for (let i = 0; i < 7; i++) {
      const ax = 4320 + i * 190, ay = 1980;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax, ay - 60);
      ctx.quadraticCurveTo(ax + 26, ay - 104, ax + 52, ay - 60);
      ctx.lineTo(ax + 52, ay);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  },

  // ═══════════════════════ CAMADA 2 — O CASTELO ══════════════════
  /**
   * O corpo do castelo desenhado como UMA construção: o portão, os salões,
   * as sacadas e as galerias nascem dos próprios pisos jogáveis.
   */
  drawBody(ctx, cam, frames) {
    if (this.X1 - cam.x < -200 || this.X0 - cam.x > 1160) return;
    const t = this.t = (WindKingdom.t || 0);
    ctx.save();
    ctx.translate(-cam.x, -cam.y);

    this.drawGate(ctx, frames);
    this.drawHalls(ctx, frames);
    this.drawMillTower(ctx, frames);

    ctx.restore();
  },

  /** BASE — portão despedaçado, escadaria monumental, estátuas dos reis */
  drawGate(ctx, frames) {
    const gy = this.BASE_Y;

    // muralha espessa da base, com pedras faltando
    ctx.fillStyle = this.stone(gy, 0.55);
    ctx.fillRect(this.X0 + 20, gy - 250, 190, 250);
    ctx.fillRect(5560, gy - 250, 190, 250);
    // blocos ausentes (buracos)
    ctx.fillStyle = 'rgba(10,12,16,0.75)';
    for (let i = 0; i < 6; i++) {
      ctx.fillRect(this.X0 + 40 + (i % 3) * 58, gy - 210 + Math.floor(i / 3) * 70, 26, 20);
      ctx.fillRect(5590 + (i % 3) * 58, gy - 190 + Math.floor(i / 3) * 62, 24, 18);
    }

    // ── O PORTÃO: arco colossal partido (o portal mora dentro dele) ──
    const px = 4270, aw = 210;
    ctx.fillStyle = this.stone(gy - 150, 0.68);
    // jambas
    ctx.fillRect(px - aw / 2 - 46, gy - 300, 46, 300);
    ctx.fillRect(px + aw / 2, gy - 300, 46, 300);
    // arco superior (metade desabada)
    ctx.beginPath();
    ctx.moveTo(px - aw / 2 - 46, gy - 300);
    ctx.quadraticCurveTo(px - 40, gy - 400, px + 6, gy - 372);
    ctx.lineTo(px + 20, gy - 330);
    ctx.lineTo(px + aw / 2, gy - 300);
    ctx.lineTo(px + aw / 2, gy - 286);
    ctx.lineTo(px - aw / 2 - 46, gy - 286);
    ctx.closePath();
    ctx.fill();
    // aduela quebrada caída no chão
    ctx.save();
    ctx.translate(px + 128, gy - 16);
    ctx.rotate(0.38);
    ctx.fillStyle = this.stone(gy, 0.5);
    ctx.fillRect(-40, -14, 80, 28);
    ctx.restore();
    // escuridão do vão + brasão partido na chave do arco
    ctx.fillStyle = 'rgba(8,10,14,0.55)';
    ctx.fillRect(px - aw / 2, gy - 286, aw, 286);
    ctx.strokeStyle = 'rgba(176,150,86,0.5)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(px - 20, gy - 344); ctx.lineTo(px, gy - 366); ctx.lineTo(px + 18, gy - 348);
    ctx.stroke();

    // restos da porta principal: vigas de carvalho e ferragens
    ctx.strokeStyle = 'rgba(58,44,32,0.9)';
    ctx.lineWidth = 9;
    for (let i = 0; i < 3; i++) {
      const dx = px - 70 + i * 52;
      ctx.beginPath();
      ctx.moveTo(dx, gy);
      ctx.lineTo(dx + (i - 1) * 10, gy - 150 - i * 18);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(92,72,50,0.8)';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(px - 78, gy - 96); ctx.lineTo(px + 40, gy - 110); ctx.stroke();

    // ── escadaria monumental subindo para o salão ──
    ctx.fillStyle = this.stone(gy, 0.6);
    for (let i = 0; i < 7; i++) {
      ctx.fillRect(4500 + i * 8, gy - 12 - i * 12, 240 - i * 10, 12);
    }
    // corrimão/balaustrada partida
    ctx.fillStyle = this.stone(gy, 0.72);
    ctx.fillRect(4496, gy - 96, 12, 96);
    ctx.fillRect(4720, gy - 60, 12, 60);

    // ── correntes gigantes enferrujadas ──
    ctx.strokeStyle = 'rgba(96,70,48,0.85)';
    ctx.lineWidth = 5;
    for (const cx2 of [4180, 5480]) {
      for (let i = 0; i < 12; i++) {
        const yy = gy - 250 + i * 20;
        const sway = Math.sin(this.t * 0.5 + i * 0.4) * 3;
        ctx.beginPath();
        ctx.ellipse(cx2 + sway, yy, 5, 9, 0, 0, 7);
        ctx.stroke();
      }
    }

    // ── estátuas destruídas dos antigos reis, ladeando o portão ──
    this.drawBrokenKing(ctx, 4110, gy, 1);
    this.drawBrokenKing(ctx, 4470, gy, -1);

    // pedras desmoronadas espalhadas
    ctx.fillStyle = this.stone(gy, 0.45);
    for (let i = 0; i < 14; i++) {
      const rx = 4060 + WindKingdom._hash(i * 31, 7) * 1600;
      const ry = gy - 6 - WindKingdom._hash(i * 17, 3) * 10;
      const rw = 10 + WindKingdom._hash(i * 13, 5) * 22;
      ctx.save();
      ctx.translate(rx, ry);
      ctx.rotate((WindKingdom._hash(i * 7, 11) - 0.5) * 0.8);
      ctx.fillRect(-rw / 2, -6, rw, 12);
      ctx.restore();
    }
  },

  /** estátua de rei antigo, quebrada na altura do peito */
  drawBrokenKing(ctx, x, gy, facing) {
    ctx.save();
    ctx.translate(x, gy);
    ctx.scale(facing, 1);
    // pedestal
    ctx.fillStyle = this.stone(gy, 0.7);
    ctx.fillRect(-30, -26, 60, 26);
    ctx.fillRect(-24, -34, 48, 10);
    // pernas e manto
    ctx.fillStyle = this.stone(gy, 0.62);
    ctx.beginPath();
    ctx.moveTo(-20, -34);
    ctx.lineTo(-14, -110);
    ctx.lineTo(16, -110);
    ctx.lineTo(22, -34);
    ctx.closePath(); ctx.fill();
    // torso partido em diagonal
    ctx.beginPath();
    ctx.moveTo(-14, -110);
    ctx.lineTo(-10, -150);
    ctx.lineTo(14, -136);
    ctx.lineTo(16, -110);
    ctx.closePath(); ctx.fill();
    // braço caído no chão
    ctx.save();
    ctx.translate(38, -8);
    ctx.rotate(0.5);
    ctx.fillRect(-6, -22, 12, 44);
    ctx.restore();
    // musgo na base
    ctx.fillStyle = 'rgba(92,124,84,0.45)';
    ctx.fillRect(-30, -30, 60, 5);
    ctx.restore();
  },

  /**
   * Os salões: cada piso jogável recebe teto, arcos, colunas e janelas,
   * virando um cômodo real do castelo.
   */
  drawHalls(ctx, frames) {
    const rooms = [
      { x: 4310, y: 2020, w: 450, name: 'salão principal', arches: 4, ceil: 150 },
      { x: 4800, y: 1840, w: 520, name: 'salão dos cavaleiros', arches: 5, ceil: 145 },
      { x: 4050, y: 1840, w: 280, name: 'arsenal', arches: 2, ceil: 130 },
      { x: 4420, y: 1660, w: 490, name: 'biblioteca', arches: 4, ceil: 140 },
      { x: 5320, y: 1690, w: 430, name: 'sacada leste', arches: 3, ceil: 120 },
      { x: 4950, y: 1490, w: 410, name: 'capela do vento', arches: 3, ceil: 130 }
    ];

    for (const r of rooms) {
      // parede de fundo do cômodo (mais escura, dá profundidade)
      ctx.fillStyle = 'rgba(26,31,39,0.82)';
      ctx.fillRect(r.x, r.y - r.ceil, r.w, r.ceil);

      // arcadas góticas ao fundo — a alma da arquitetura
      const aw = r.w / r.arches;
      for (let i = 0; i < r.arches; i++) {
        const ax = r.x + i * aw + 8, awi = aw - 16;
        const ah = r.ceil - 26;
        // vão do arco
        ctx.fillStyle = 'rgba(14,18,24,0.9)';
        ctx.beginPath();
        ctx.moveTo(ax, r.y);
        ctx.lineTo(ax, r.y - ah + awi / 2);
        ctx.quadraticCurveTo(ax + awi / 2, r.y - ah - awi * 0.18, ax + awi, r.y - ah + awi / 2);
        ctx.lineTo(ax + awi, r.y);
        ctx.closePath();
        ctx.fill();
        // aro do arco
        ctx.strokeStyle = this.stone(r.y, 0.55);
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(ax, r.y);
        ctx.lineTo(ax, r.y - ah + awi / 2);
        ctx.quadraticCurveTo(ax + awi / 2, r.y - ah - awi * 0.18, ax + awi, r.y - ah + awi / 2);
        ctx.lineTo(ax + awi, r.y);
        ctx.stroke();
        // luz do céu entrando pelo vão
        const glow = ctx.createLinearGradient(0, r.y - ah, 0, r.y);
        glow.addColorStop(0, 'rgba(196,220,238,0.18)');
        glow.addColorStop(1, 'rgba(196,220,238,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(ax, r.y - ah, awi, ah);
      }

      // colunas entre os arcos, algumas rachadas
      for (let i = 0; i <= r.arches; i++) {
        const cx2 = r.x + i * aw;
        ctx.fillStyle = this.stone(r.y, 0.66);
        ctx.fillRect(cx2 - 6, r.y - r.ceil, 12, r.ceil);
        // capitel
        ctx.fillRect(cx2 - 11, r.y - r.ceil, 22, 9);
        // rachadura
        if (WindKingdom._hash(r.x + i * 13, r.y) > 0.55) {
          ctx.strokeStyle = 'rgba(16,18,24,0.7)';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(cx2 - 2, r.y - r.ceil + 20);
          ctx.lineTo(cx2 + 3, r.y - r.ceil * 0.6);
          ctx.lineTo(cx2 - 1, r.y - 16);
          ctx.stroke();
        }
      }

      // teto/viga: parcialmente destruído
      ctx.fillStyle = this.stone(r.y - r.ceil, 0.6);
      const gapAt = Math.floor(WindKingdom._hash(r.x, r.y) * r.arches);
      for (let i = 0; i < r.arches; i++) {
        if (i === gapAt) continue;  // buraco no teto
        ctx.fillRect(r.x + i * aw, r.y - r.ceil - 10, aw, 10);
      }
      // vigas expostas onde o teto caiu
      ctx.strokeStyle = 'rgba(64,48,34,0.85)';
      ctx.lineWidth = 4;
      for (let b = 0; b < 3; b++) {
        const bx = r.x + gapAt * aw + 10 + b * (aw / 3);
        ctx.beginPath();
        ctx.moveTo(bx, r.y - r.ceil - 8);
        ctx.lineTo(bx + 8, r.y - r.ceil + 14);
        ctx.stroke();
      }

      // hera e musgo agarrados na pedra
      ctx.strokeStyle = 'rgba(88,122,80,0.5)';
      ctx.lineWidth = 1.6;
      for (let iv = 0; iv < 4; iv++) {
        const ivx = r.x + 20 + WindKingdom._hash(r.x + iv * 29, r.y) * (r.w - 40);
        const len = 20 + WindKingdom._hash(r.x + iv * 41, r.y + 3) * 40;
        const sway = Math.sin(frames * 0.03 + ivx) * (2 + WindKingdom.windPower() * 7);
        ctx.beginPath();
        ctx.moveTo(ivx, r.y - r.ceil);
        ctx.quadraticCurveTo(ivx + sway, r.y - r.ceil + len * 0.6, ivx + sway * 1.4, r.y - r.ceil + len);
        ctx.stroke();
      }
    }

    // ── mobiliário narrativo por cômodo ──
    // Arsenal: lanças e um suporte de armas tombado
    ctx.strokeStyle = 'rgba(70,62,52,0.9)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 5; i++) {
      const sx2 = 4090 + i * 44;
      ctx.save();
      ctx.translate(sx2, 1840);
      ctx.rotate(-0.3 + i * 0.14);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -60); ctx.stroke();
      ctx.fillStyle = 'rgba(150,152,158,0.8)';
      ctx.beginPath();
      ctx.moveTo(-3, -60); ctx.lineTo(0, -74); ctx.lineTo(3, -60);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    // Biblioteca: estantes tombadas e páginas ao vento
    for (let i = 0; i < 4; i++) {
      const bx = 4450 + i * 118;
      ctx.fillStyle = 'rgba(58,44,32,0.9)';
      ctx.save();
      ctx.translate(bx, 1660);
      ctx.rotate(i % 2 ? 0.06 : -0.05);
      ctx.fillRect(-22, -86, 44, 86);
      // prateleiras e livros
      ctx.fillStyle = 'rgba(30,24,18,0.9)';
      for (let sh = 0; sh < 3; sh++) ctx.fillRect(-20, -78 + sh * 26, 40, 4);
      for (let bk = 0; bk < 9; bk++) {
        ctx.fillStyle = `rgba(${110 + (bk % 3) * 26},${70 + (bk % 4) * 12},${54},0.9)`;
        ctx.fillRect(-18 + (bk % 5) * 8, -74 + Math.floor(bk / 5) * 26, 6, 18);
      }
      ctx.restore();
    }
    // páginas soltas voando
    ctx.fillStyle = 'rgba(226,220,200,0.7)';
    for (let i = 0; i < 5; i++) {
      const ph = (this.t * 22 + i * 90) % 420;
      const pxx = 4460 + ph;
      const pyy = 1640 - Math.sin(ph * 0.02) * 26;
      ctx.save();
      ctx.translate(pxx, pyy);
      ctx.rotate(ph * 0.02);
      ctx.fillRect(-4, -3, 8, 6);
      ctx.restore();
    }

    // Salão dos Cavaleiros: armaduras vazias em nichos
    for (let i = 0; i < 4; i++) {
      const kx = 4850 + i * 128;
      ctx.fillStyle = 'rgba(46,52,62,0.9)';
      ctx.fillRect(kx - 9, 1840 - 56, 18, 56);
      ctx.beginPath(); ctx.arc(kx, 1840 - 62, 8, 0, 7); ctx.fill();
      // lança apoiada
      ctx.strokeStyle = 'rgba(70,62,52,0.85)';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(kx + 12, 1840); ctx.lineTo(kx + 16, 1840 - 74); ctx.stroke();
    }

    // Capela do Vento: altar e vitral partido
    ctx.fillStyle = this.stone(1490, 0.68);
    ctx.fillRect(5120, 1490 - 34, 70, 34);
    ctx.fillStyle = 'rgba(176,150,86,0.55)';
    ctx.fillRect(5138, 1490 - 46, 34, 12);
    // vitral quebrado atrás do altar
    const vg = ctx.createLinearGradient(5100, 1400, 5210, 1490);
    vg.addColorStop(0, 'rgba(150,200,235,0.5)');
    vg.addColorStop(1, 'rgba(200,170,110,0.3)');
    ctx.fillStyle = vg;
    ctx.beginPath();
    ctx.moveTo(5104, 1490 - 40);
    ctx.lineTo(5104, 1490 - 104);
    ctx.quadraticCurveTo(5155, 1490 - 148, 5206, 1490 - 104);
    ctx.lineTo(5206, 1490 - 40);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(24,28,36,0.85)';
    ctx.lineWidth = 2;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(5104 + i * 26, 1490 - 40);
      ctx.lineTo(5104 + i * 26, 1490 - 128);
      ctx.stroke();
    }
    // cacos faltando
    ctx.fillStyle = 'rgba(10,14,20,0.9)';
    ctx.fillRect(5126, 1490 - 96, 20, 24);
    ctx.fillRect(5172, 1490 - 72, 16, 20);

    // ninhos nas quinas altas
    for (const [nx, ny] of [[4930, 1490], [5330, 1690], [4430, 1660]]) {
      ctx.fillStyle = 'rgba(96,80,52,0.8)';
      ctx.beginPath();
      ctx.ellipse(nx, ny - 6, 14, 6, 0, 0, 7);
      ctx.fill();
      ctx.strokeStyle = 'rgba(72,60,40,0.9)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(nx - 12 + i * 6, ny - 10);
        ctx.lineTo(nx - 8 + i * 6, ny - 3);
        ctx.stroke();
      }
    }
  },

  // ═══════════════════ CAMADA 3 — TORRE CENTRAL ══════════════════
  /**
   * O moinho deixa de ser um objeto pousado e vira a Torre Central do Reino:
   * vários pavimentos, janelas enormes, engrenagens, eixo e pás colossais.
   */
  drawMillTower(ctx, frames) {
    const bx = 4900, by = this.DECK_Y;   // base da torre no terraço
    const topY = 760;                    // topo da torre
    const power = WindKingdom.windPower();

    // corpo tronco-cônico
    ctx.beginPath();
    ctx.moveTo(bx - 150, by);
    ctx.lineTo(bx - 86, topY);
    ctx.lineTo(bx + 86, topY);
    ctx.lineTo(bx + 150, by);
    ctx.closePath();
    const tg = ctx.createLinearGradient(bx - 150, 0, bx + 150, 0);
    tg.addColorStop(0, '#3f4854');
    tg.addColorStop(0.42, '#6b7480');
    tg.addColorStop(1, '#39424e');
    ctx.fillStyle = tg;
    ctx.fill();

    // faixas de pavimento + janelas enormes
    const floors = [
      { y: 1180, w: 132 }, { y: 1020, w: 118 }, { y: 880, w: 104 }, { y: 800, w: 94 }
    ];
    for (const f of floors) {
      ctx.fillStyle = this.stone(f.y, 0.5);
      ctx.fillRect(bx - f.w, f.y, f.w * 2, 10);
      // janelas em arco, grandes
      for (const side of [-1, 1]) {
        const wx = bx + side * (f.w * 0.5) - 16;
        ctx.fillStyle = 'rgba(12,16,22,0.9)';
        ctx.beginPath();
        ctx.moveTo(wx, f.y - 6);
        ctx.lineTo(wx, f.y - 52);
        ctx.quadraticCurveTo(wx + 16, f.y - 74, wx + 32, f.y - 52);
        ctx.lineTo(wx + 32, f.y - 6);
        ctx.closePath(); ctx.fill();
        // céu visto por dentro
        const sg = ctx.createLinearGradient(0, f.y - 70, 0, f.y - 6);
        sg.addColorStop(0, 'rgba(190,216,236,0.3)');
        sg.addColorStop(1, 'rgba(190,216,236,0)');
        ctx.fillStyle = sg;
        ctx.fillRect(wx, f.y - 70, 32, 64);
      }
    }

    // rachaduras no fuste
    ctx.strokeStyle = 'rgba(18,22,28,0.6)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      let cy2 = 1300 - i * 120, cx2 = bx - 60 + i * 40;
      ctx.beginPath();
      ctx.moveTo(cx2, cy2);
      for (let s = 0; s < 4; s++) {
        cx2 += (WindKingdom._hash(i * 7, s) - 0.5) * 30;
        cy2 -= 30;
        ctx.lineTo(cx2, cy2);
      }
      ctx.stroke();
    }

    // ── engrenagens gigantes expostas (o mecanismo do reino) ──
    const gear = (gx, gy, r, teeth, speed, dir) => {
      ctx.save();
      ctx.translate(gx, gy);
      ctx.rotate(this.t * speed * dir * (0.2 + power * 1.6));
      ctx.strokeStyle = 'rgba(126,104,66,0.9)';
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke();
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.42, 0, 7); ctx.stroke();
      for (let i = 0; i < teeth; i++) {
        const a = (i / teeth) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        ctx.lineTo(Math.cos(a) * (r + 9), Math.sin(a) * (r + 9));
        ctx.stroke();
      }
      // raios
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.42);
        ctx.lineTo(Math.cos(a) * r * 0.94, Math.sin(a) * r * 0.94);
        ctx.stroke();
      }
      ctx.restore();
    };
    gear(bx - 54, 1246, 40, 12, 0.5, 1);
    gear(bx + 30, 1210, 26, 9, 0.8, -1);
    gear(bx - 10, 1120, 20, 8, 1.1, 1);

    // eixo mecânico central subindo até o rotor
    ctx.strokeStyle = 'rgba(96,80,52,0.9)';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(bx, 1246);
    ctx.lineTo(bx, topY + 30);
    ctx.stroke();

    // passarelas de manutenção com vigas de madeira
    for (const [wx, wy, ww] of [[4700, 1020, 150], [5010, 1020, 150], [4830, 1180, 190], [4840, 880, 170]]) {
      ctx.fillStyle = 'rgba(64,48,34,0.95)';
      ctx.fillRect(wx, wy, ww, 6);
      ctx.strokeStyle = 'rgba(48,36,26,0.9)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        const sx2 = wx + 14 + i * (ww / 3);
        ctx.beginPath();
        ctx.moveTo(sx2, wy + 6);
        ctx.lineTo(sx2 + (i - 1) * 8, wy + 26);
        ctx.stroke();
      }
      // guarda-corpo quebrado
      ctx.strokeStyle = 'rgba(70,58,42,0.8)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        if (i === 2) continue;
        ctx.beginPath();
        ctx.moveTo(wx + 8 + i * (ww / 4), wy);
        ctx.lineTo(wx + 8 + i * (ww / 4), wy - 18);
        ctx.stroke();
      }
    }

    // ── coroa da torre e as pás colossais ──
    ctx.fillStyle = this.stone(topY, 0.62);
    ctx.fillRect(bx - 96, topY - 16, 192, 22);
    // telhado cônico meio arrancado
    ctx.fillStyle = this.stone(topY, 0.7);
    ctx.beginPath();
    ctx.moveTo(bx - 96, topY - 16);
    ctx.lineTo(bx - 20, topY - 96);
    ctx.lineTo(bx + 40, topY - 60);
    ctx.lineTo(bx + 96, topY - 16);
    ctx.closePath();
    ctx.fill();

    const ang = this.t * (0.22 + power * 1.5);
    ctx.save();
    ctx.translate(bx, topY + 30);
    // cubo do rotor
    ctx.fillStyle = 'rgba(108,88,58,0.95)';
    ctx.beginPath(); ctx.arc(0, 0, 16, 0, 7); ctx.fill();
    for (let b = 0; b < 4; b++) {
      const a = ang + b * Math.PI / 2;
      const len = b === 2 ? 90 : 230;      // uma pá quebrada pela metade
      ctx.save();
      ctx.rotate(a);
      // longarina
      ctx.strokeStyle = 'rgba(88,72,48,0.95)';
      ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();
      // vela de pano rasgada
      const sail = ctx.createLinearGradient(0, 0, len, 0);
      sail.addColorStop(0, 'rgba(206,196,164,0.85)');
      sail.addColorStop(1, 'rgba(206,196,164,0.35)');
      ctx.fillStyle = sail;
      ctx.beginPath();
      ctx.moveTo(26, -6);
      ctx.lineTo(len - 10, -30);
      ctx.lineTo(len - 10, 6);
      ctx.lineTo(26, 20);
      ctx.closePath();
      ctx.fill();
      // rasgos
      ctx.strokeStyle = 'rgba(30,34,42,0.4)';
      ctx.lineWidth = 1.4;
      for (let r = 0; r < 3; r++) {
        const rx = 60 + r * (len / 4);
        ctx.beginPath(); ctx.moveTo(rx, -18); ctx.lineTo(rx + 8, 10); ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
  },

  // ═══════════════ CAMADA 4 — TRONO DOS CÉUS ═════════════════════
  /**
   * O templo do Deus do Vento: plataforma circular esculpida, escadaria
   * colossal, colunas gigantescas, restos de cúpula, trono colossal, asas
   * esculpidas e fragmentos suspensos pela magia do vento.
   */
  drawThrone(ctx, cam, frames) {
    const T = this.THRONE;
    if (T.x + T.w - cam.x < -300 || T.x - cam.x > 1260) return;
    const cx = T.x + T.w / 2, gy = T.y;
    const power = WindKingdom.windPower();
    ctx.save();
    ctx.translate(-cam.x, -cam.y);

    // ── fragmentos suspensos pela magia do vento (atrás) ──
    for (let i = 0; i < 9; i++) {
      const fx = T.x - 60 + WindKingdom._hash(i * 23, 5) * (T.w + 120);
      const fy = gy - 120 - WindKingdom._hash(i * 17, 9) * 300;
      const fw = 16 + WindKingdom._hash(i * 11, 3) * 40;
      const bob = Math.sin(this.t * 0.5 + i) * 6;
      ctx.save();
      ctx.translate(fx, fy + bob);
      ctx.rotate(Math.sin(this.t * 0.2 + i) * 0.2);
      ctx.fillStyle = this.stone(fy, 0.72);
      ctx.fillRect(-fw / 2, -8, fw, 16);
      ctx.restore();
      // energia ancestral ligando o fragmento ao templo
      ctx.strokeStyle = `rgba(200,228,246,${0.10 + 0.06 * Math.sin(this.t * 2 + i)})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(fx, fy + bob + 8);
      ctx.lineTo(fx + Math.sin(i) * 20, gy - 20);
      ctx.stroke();
    }

    // ── restos da cúpula colossal ──
    ctx.strokeStyle = this.stone(gy - 300, 0.66);
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.arc(cx, gy - 40, 430, Math.PI * 1.06, Math.PI * 1.34);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, gy - 40, 430, Math.PI * 1.66, Math.PI * 1.94);
    ctx.stroke();
    // nervuras caindo da cúpula
    ctx.lineWidth = 7;
    for (const a of [1.12, 1.26, 1.72, 1.88]) {
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(Math.PI * a) * 430, gy - 40 + Math.sin(Math.PI * a) * 430);
      ctx.lineTo(cx + Math.cos(Math.PI * a) * 350, gy - 40 + Math.sin(Math.PI * a) * 350);
      ctx.stroke();
    }

    // ── colunas gigantescas com arcos monumentais ──
    const colX = [T.x + 130, T.x + 470, T.x + T.w - 470, T.x + T.w - 130];
    for (let i = 0; i < colX.length; i++) {
      const x = colX[i];
      const broken = i === 3;
      const top = broken ? gy - 210 : gy - 340;
      // fuste canelado
      const cg = ctx.createLinearGradient(x - 28, 0, x + 28, 0);
      cg.addColorStop(0, '#7c8794');
      cg.addColorStop(0.4, '#b8c2cc');
      cg.addColorStop(1, '#6e7885');
      ctx.fillStyle = cg;
      ctx.fillRect(x - 28, top, 56, gy - top);
      ctx.strokeStyle = 'rgba(60,68,78,0.35)';
      ctx.lineWidth = 1.4;
      for (let f = 0; f < 5; f++) {
        ctx.beginPath();
        ctx.moveTo(x - 20 + f * 10, top);
        ctx.lineTo(x - 20 + f * 10, gy);
        ctx.stroke();
      }
      // base e capitel
      ctx.fillStyle = this.stone(gy, 0.74);
      ctx.fillRect(x - 38, gy - 22, 76, 22);
      if (!broken) {
        ctx.fillRect(x - 40, top - 18, 80, 18);
        // volutas
        ctx.beginPath();
        ctx.arc(x - 28, top - 18, 10, 0, 7);
        ctx.arc(x + 28, top - 18, 10, 0, 7);
        ctx.fill();
      } else {
        // quebra diagonal
        ctx.fillStyle = this.stone(top, 0.6);
        ctx.beginPath();
        ctx.moveTo(x - 28, top);
        ctx.lineTo(x + 28, top + 22);
        ctx.lineTo(x + 28, top);
        ctx.closePath(); ctx.fill();
      }
      // arco monumental entre colunas inteiras
      if (i < colX.length - 1 && !(i === 2)) {
        const nx = colX[i + 1];
        ctx.strokeStyle = this.stone(gy - 300, 0.62);
        ctx.lineWidth = 22;
        ctx.beginPath();
        ctx.moveTo(x, top - 10);
        ctx.quadraticCurveTo((x + nx) / 2, top - 130, nx, top - 10);
        ctx.stroke();
      }
    }

    // ── piso esculpido: plataforma circular com símbolos ancestrais ──
    const floor = ctx.createLinearGradient(0, gy, 0, gy + 120);
    floor.addColorStop(0, '#c6cfd8');
    floor.addColorStop(1, '#79838f');
    ctx.fillStyle = floor;
    ctx.fillRect(T.x, gy, T.w, 120);
    // anéis concêntricos gravados
    ctx.strokeStyle = 'rgba(120,132,146,0.7)';
    ctx.lineWidth = 2;
    for (let r = 90; r < 900; r += 120) {
      ctx.beginPath();
      ctx.ellipse(cx, gy + 6, r, 12, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // símbolos ancestrais do vento, brilhando fraco
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const pulse = 0.5 + 0.5 * Math.sin(this.t * 0.8);
    ctx.strokeStyle = `rgba(190,224,244,${0.22 + 0.18 * pulse})`;
    ctx.lineWidth = 3;
    for (let i = 0; i < 5; i++) {
      const sx2 = T.x + 220 + i * 320;
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 3; a += 0.16) {
        const r = 3 + a * 3.4;
        const px2 = sx2 + Math.cos(a) * r;
        const py2 = gy + 22 + Math.sin(a) * r * 0.42;
        a === 0 ? ctx.moveTo(px2, py2) : ctx.lineTo(px2, py2);
      }
      ctx.stroke();
    }
    ctx.restore();

    // ── escadaria colossal até o altar ──
    ctx.fillStyle = this.stone(gy, 0.78);
    for (let i = 0; i < 5; i++) {
      const w = 300 - i * 34;
      ctx.fillRect(cx - w / 2, gy - 18 - i * 18, w, 18);
    }

    // ── altar monumental + trono colossal ──
    const ty = gy - 92;
    ctx.fillStyle = this.stone(ty, 0.8);
    ctx.fillRect(cx - 130, ty, 260, 30);       // dais
    // assento
    ctx.fillStyle = this.stone(ty, 0.7);
    ctx.fillRect(cx - 74, ty - 56, 148, 56);
    // espaldar colossal (obelisco)
    ctx.beginPath();
    ctx.moveTo(cx - 62, ty - 56);
    ctx.lineTo(cx - 42, ty - 300);
    ctx.lineTo(cx + 42, ty - 300);
    ctx.lineTo(cx + 62, ty - 56);
    ctx.closePath();
    const bg2 = ctx.createLinearGradient(cx - 62, 0, cx + 62, 0);
    bg2.addColorStop(0, '#8b95a2');
    bg2.addColorStop(0.45, '#ccd5dd');
    bg2.addColorStop(1, '#7e8894');
    ctx.fillStyle = bg2;
    ctx.fill();
    // topo do espaldar quebrado
    ctx.fillStyle = 'rgba(18,22,28,0.25)';
    ctx.beginPath();
    ctx.moveTo(cx - 42, ty - 300);
    ctx.lineTo(cx + 10, ty - 276);
    ctx.lineTo(cx + 42, ty - 300);
    ctx.closePath(); ctx.fill();

    // ── ENORMES ASAS ESCULPIDAS abraçando o trono ──
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(cx + side * 60, ty - 190);
      ctx.scale(side, 1);
      ctx.fillStyle = 'rgba(198,208,218,0.95)';
      for (let f = 0; f < 6; f++) {
        const len = 150 - f * 14;
        ctx.save();
        ctx.rotate(-0.5 + f * 0.16);
        ctx.beginPath();
        ctx.ellipse(len * 0.5, 0, len * 0.5, 11 - f, 0, 0, 7);
        ctx.fill();
        ctx.restore();
      }
      // pena quebrada
      ctx.fillStyle = 'rgba(120,130,142,0.6)';
      ctx.save();
      ctx.rotate(0.5);
      ctx.fillRect(60, -4, 40, 8);
      ctx.restore();
      ctx.restore();
    }

    // ── estátuas dos antigos reis ladeando a escadaria ──
    for (const side of [-1, 1]) {
      const sx2 = cx + side * 420;
      ctx.fillStyle = this.stone(gy, 0.82);
      ctx.fillRect(sx2 - 34, gy - 30, 68, 30);
      ctx.save();
      ctx.translate(sx2, gy - 30);
      ctx.scale(side, 1);
      // corpo alto e hierático
      ctx.beginPath();
      ctx.moveTo(-22, 0);
      ctx.lineTo(-16, -150);
      ctx.lineTo(18, -150);
      ctx.lineTo(24, 0);
      ctx.closePath(); ctx.fill();
      // cabeça e coroa
      ctx.beginPath(); ctx.arc(2, -166, 15, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(176,150,86,0.9)';
      ctx.beginPath();
      ctx.moveTo(-12, -178); ctx.lineTo(-8, -196); ctx.lineTo(-2, -180);
      ctx.lineTo(3, -200); ctx.lineTo(8, -180); ctx.lineTo(14, -194); ctx.lineTo(16, -176);
      ctx.closePath(); ctx.fill();
      // braços segurando uma lâmina de pedra apontada ao chão
      ctx.fillStyle = this.stone(gy, 0.82);
      ctx.fillRect(14, -140, 8, 96);
      ctx.restore();
    }

    // ── esculturas dos espíritos do vento nas laterais ──
    for (const side of [-1, 1]) {
      const sx2 = cx + side * 700;
      ctx.save();
      ctx.translate(sx2, gy - 20);
      ctx.scale(side, 1);
      ctx.fillStyle = 'rgba(176,188,200,0.9)';
      // corpo de pássaro estilizado
      ctx.beginPath();
      ctx.ellipse(0, -40, 16, 30, 0, 0, 7);
      ctx.fill();
      // asas abertas
      for (const wsd of [-1, 1]) {
        ctx.save();
        ctx.scale(wsd, 1);
        ctx.rotate(-0.6);
        ctx.beginPath();
        ctx.ellipse(30, -40, 34, 8, 0, 0, 7);
        ctx.fill();
        ctx.restore();
      }
      // cabeça e bico
      ctx.beginPath(); ctx.arc(4, -76, 9, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(176,150,86,0.9)';
      ctx.beginPath();
      ctx.moveTo(11, -78); ctx.lineTo(24, -74); ctx.lineTo(11, -70);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    // ── vitrais destruídos entre as colunas ──
    for (let i = 0; i < 2; i++) {
      const vx = T.x + 300 + i * 940, vy = gy - 250;
      const vg2 = ctx.createLinearGradient(vx, vy, vx, vy + 180);
      vg2.addColorStop(0, 'rgba(150,200,235,0.45)');
      vg2.addColorStop(1, 'rgba(210,175,110,0.25)');
      ctx.fillStyle = vg2;
      ctx.beginPath();
      ctx.moveTo(vx - 50, vy + 180);
      ctx.lineTo(vx - 50, vy + 50);
      ctx.quadraticCurveTo(vx, vy - 20, vx + 50, vy + 50);
      ctx.lineTo(vx + 50, vy + 180);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(30,36,46,0.8)';
      ctx.lineWidth = 3;
      ctx.stroke();
      // vidros faltando
      ctx.fillStyle = 'rgba(140,180,214,0.15)';
      ctx.fillRect(vx - 40, vy + 70, 30, 40);
      ctx.fillRect(vx + 8, vy + 120, 26, 34);
    }

    // ── correntes gigantes e bandeiras reais rasgadas ──
    ctx.strokeStyle = 'rgba(92,80,60,0.8)';
    ctx.lineWidth = 6;
    for (const chx of [T.x + 60, T.x + T.w - 60]) {
      for (let i = 0; i < 10; i++) {
        const yy = gy - 340 + i * 26;
        const sway = Math.sin(this.t * 0.6 + i * 0.5) * (2 + power * 8);
        ctx.beginPath();
        ctx.ellipse(chx + sway, yy, 6, 11, 0, 0, 7);
        ctx.stroke();
      }
    }
    for (const bnx of [T.x + 250, T.x + T.w - 250]) {
      const wav = Math.sin(this.t * 1.6) * (6 + power * 20);
      ctx.fillStyle = 'rgba(150,120,70,0.85)';
      ctx.beginPath();
      ctx.moveTo(bnx, gy - 330);
      ctx.lineTo(bnx + 54, gy - 330);
      ctx.quadraticCurveTo(bnx + 54 + wav, gy - 250, bnx + 40 + wav, gy - 180);
      ctx.lineTo(bnx + 20, gy - 200);   // rasgo
      ctx.lineTo(bnx + 10 + wav * 0.5, gy - 160);
      ctx.quadraticCurveTo(bnx - 4, gy - 250, bnx, gy - 330);
      ctx.closePath();
      ctx.fill();
    }

    // ── energia ancestral no ar do templo ──
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 14; i++) {
      const ex = T.x + ((i * 173 + this.t * 20) % T.w);
      const ey = gy - 40 - ((i * 97 + this.t * 26) % 300);
      ctx.fillStyle = `rgba(206,232,248,${0.18 + 0.2 * Math.sin(this.t * 2 + i)})`;
      ctx.beginPath(); ctx.arc(ex, ey, 1.6 + (i % 3) * 0.7, 0, 7); ctx.fill();
    }
    // halo divino descendo sobre o trono
    const halo = ctx.createLinearGradient(cx, gy - 380, cx, gy);
    halo.addColorStop(0, 'rgba(224,240,252,0.16)');
    halo.addColorStop(1, 'rgba(224,240,252,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(cx - 160, gy - 380, 320, 380);
    ctx.restore();

    ctx.restore();
  },

  t: 0
};

window.WindFortress = WindFortress;

// ───────────────────── instalação por wrapping ─────────────────────
(function () {
  const _install = WindKingdom.install;
  WindKingdom.install = function () {
    _install.call(this);
    WindFortress.install();
  };

  // o backdrop antigo dá lugar à montanha + castelo colossal
  WindKingdom.drawFortressBackdrop = function (ctx, cam, frames) {
    WindFortress.t = WindKingdom.t;
    WindFortress.drawBackdrop(ctx, cam, frames);
  };

  // a decoração genérica não deve competir com a arquitetura desenhada à mão:
  // dentro da fortaleza, o castelo é uma peça só.
  const _arch = WindKingdom.drawArchitecture;
  WindKingdom.drawArchitecture = function (ctx, cam, frames) {
    const all = this.map.solids;
    const outside = all.filter(s => !WindFortress.inFortress(s));
    this.map.solids = outside;          // decora só o que está fora do castelo
    _arch.call(this, ctx, cam, frames);
    this.map.solids = all;

    // e então o castelo, como uma construção única
    WindFortress.t = this.t;
    WindFortress.drawBody(ctx, cam, frames);
    WindFortress.drawThrone(ctx, cam, frames);
  };
})();
