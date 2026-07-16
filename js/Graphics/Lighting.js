'use strict';

/**
 * Sistema de Iluminação, Shadow Mask e Luzes Indiretas para Rōnin de Luz.
 * Gerencia a penumbra ambiental, recortes de oclusão e glows coloridos aditivos.
 */
const Lighting = {
  lightCanvas: null,
  lightCtx: null,
  cutoutStamp: null,
  activeCam: null,
  activeGlow: null,

  floraCutout(light, screenX, screenY, radius, intensity) {
    Lighting.drawCutout(screenX, screenY, radius, intensity);
  },

  serpentCutout(worldX, worldY, radius, intensity) {
    const cam = Lighting.activeCam;
    if (!cam) return;
    const x = worldX - cam.x;
    const y = worldY - cam.y;
    if (x + radius < -40 || x - radius > 1000 || y + radius < -40 || y - radius > 580) return;
    Lighting.drawCutout(x, y, radius, intensity);
  },

  serpentGlow(worldX, worldY, cutoutRadius, cutoutIntensity, rgb, radius, alpha) {
    const cam = Lighting.activeCam;
    const drawGlow = Lighting.activeGlow;
    if (!cam || !drawGlow) return;
    const x = worldX - cam.x;
    const y = worldY - cam.y;
    if (x + radius < -40 || x - radius > 1000 || y + radius < -40 || y - radius > 580) return;
    drawGlow(x, y, radius, `rgba(${rgb},${alpha})`);
  },

  init() {
    this.lightCanvas = document.createElement('canvas');
    this.lightCanvas.width = 960;
    this.lightCanvas.height = 540;
    this.lightCtx = this.lightCanvas.getContext('2d');
    this.cutoutStamp = document.createElement('canvas');
    this.cutoutStamp.width = this.cutoutStamp.height = 256;
    const stampCtx = this.cutoutStamp.getContext('2d');
    const stamp = stampCtx.createRadialGradient(128, 128, 0, 128, 128, 128);
    stamp.addColorStop(0, 'rgba(0,0,0,1)');
    stamp.addColorStop(1, 'rgba(0,0,0,0)');
    stampCtx.fillStyle = stamp;
    stampCtx.fillRect(0, 0, 256, 256);
  },

  /**
   * Obtém a cor da penumbra (reduzida para revelar detalhes sem perder o clima)
   */
  getAmbientColor(pal) {
    if (World.current === 'fogo') {
      return 'rgba(16, 5, 6, 0.52)'; // Penumbra quente mais clara (charcoal vulcânico)
    }
    // Se o jogador estiver nas profundezas subaquáticas
    if (Game.player && Game.player.y > 1450) {
      return 'rgba(2, 8, 22, 0.58)';
    }
    // Zonas de superfície da floresta (toma a cor do céu e escurece moderadamente)
    const r = Math.round(pal.skyT[0] * 0.45);
    const g = Math.round(pal.skyT[1] * 0.45);
    const b = Math.round(pal.skyT[2] * 0.45);
    return `rgba(${r}, ${g}, ${b}, 0.58)`; // Revela o background e o terreno perfeitamente
  },

  /**
   * Desenha um círculo de luz suave usando a operação 'destination-out' no lightCtx
   */
  drawCutout(x, y, radius, intensity) {
    const gl = this.lightCtx;
    if (!gl || !this.cutoutStamp || radius <= 0 || intensity <= 0) return;
    gl.save();
    gl.globalAlpha = intensity;
    gl.drawImage(this.cutoutStamp, x - radius, y - radius, radius * 2, radius * 2);
    gl.restore();
  },

  /**
   * Desenha a máscara de sombras e seus recortes de luz dinâmicos
   */
  draw(destCtx, cam, frames) {
    const gl = this.lightCtx;
    if (!gl) return;
    this.activeCam = cam;

    const pal = World.palette(cam.x + 480, cam.y + 270);
    const ambientColor = this.getAmbientColor(pal);

    // 1. Limpa e preenche o buffer com a penumbra da zona
    gl.setTransform(1, 0, 0, 1, 0, 0);
    gl.clearRect(0, 0, 960, 540);
    gl.fillStyle = ambientColor;
    gl.fillRect(0, 0, 960, 540);

    // 2. Define a operação de recorte (destination-out remove a penumbra onde há luz)
    gl.globalCompositeOperation = 'destination-out';

    // A. Luz do Jogador
    const p = Game.player;
    let pLightRadius = 120;
    let pyOffset = -18;
    if (p) {
      const swimming = p.pose() === 'swim';
      pLightRadius = (swimming ? 145 : 120) + Math.sin(frames * 0.08) * 6;
      pyOffset = swimming ? -12 : -18;
      this.drawCutout(p.x - cam.x, p.y - cam.y + pyOffset, pLightRadius, swimming ? 0.9 : 0.95);
    }

    // B. Luz dos Inimigos ativos
    for (const e of Enemies.list) {
      if (e.map === World.current && !e.dead) {
        const eLightRadius = e.isBoss ? 170 : 65 + Math.sin(frames * 0.06 + e.x) * 4;
        this.drawCutout(e.x - cam.x, e.y - cam.y - e.h / 2, eLightRadius, e.isBoss ? 0.85 : 0.75);
      }
    }

    // C. Lanternas de Pedra (apenas na floresta)
    if (World.current === 'floresta') {
      for (const ln of World.lanterns) {
        const lx = ln.x - cam.x, ly = ln.y - cam.y - 37;
        if (lx > -60 && lx < 1020) {
          const lRadius = 75 + Math.sin(frames * 0.1 + ln.x) * 3;
          this.drawCutout(lx, ly, lRadius, 0.9);
        }
      }
    }

    // D. Tochas (apenas no Reino do Fogo)
    for (const tc of World.torches) {
      const tx = tc.x - cam.x, ty = tc.y - cam.y - 34;
      if (tx > -60 && tx < 1020) {
        const tRadius = 85 + Math.sin(frames * 0.12 + tc.x) * 4;
        this.drawCutout(tx, ty, tRadius, 0.9);
      }
    }

    // E. Checkpoints / Toriis (apenas se acesos/lit)
    World.checkpoints.forEach((cp) => {
      const lit = Game.checkpoint && Game.checkpoint.map === World.current
        && Game.checkpoint.x === cp.x && Game.checkpoint.y === cp.y;
      if (lit) {
        const cx = cp.x - cam.x, cy = cp.y - cam.y - 40;
        if (cx > -120 && cx < 1080) {
          this.drawCutout(cx, cy, 140, 0.8);
        }
      }
    });

    // F. Itens coletáveis (Lótus / Cristais no mapa)
    for (const pk of World.pickups) {
      if (!pk.taken) {
        const px = pk.x - cam.x, py = pk.y - cam.y - 10;
        if (px > -40 && px < 1000) {
          this.drawCutout(px, py, 45, 0.8);
        }
      }
    }

    // G. Portais (Reinos e Santuário)
    if (World.current === 'floresta') {
      const pfx = World.firePortal.floresta.x - cam.x, pfy = World.firePortal.floresta.y - cam.y - 52;
      this.drawCutout(pfx, pfy, 90, 0.8);
      const pwx = World.windPortal.x - cam.x, pwy = World.windPortal.y - cam.y - 52;
      this.drawCutout(pwx, pwy, 60, 0.35);
      const pax = World.portal.x - cam.x, pay = World.portal.y - cam.y - 64;
      this.drawCutout(pax, pay, 120, Game.bossDefeated ? 0.9 : 0.4);
    } else {
      const pfx = World.firePortal.fogo.x - cam.x, pfy = World.firePortal.fogo.y - cam.y - 52;
      this.drawCutout(pfx, pfy, 90, 0.8);
    }

    // H. Altar de Fogo
    if (World.current === 'fogo' && !World.fireAltar.taken) {
      const ax = World.fireAltar.x - cam.x, ay = World.fireAltar.y - cam.y - 52;
      this.drawCutout(ax, ay, 80, 0.85);
    }

    // I. Amuleta Sui
    const am = World.amulet;
    if (World.current === 'floresta' && am.spawned && !am.taken) {
      const ax = am.x - cam.x, ay = am.y - cam.y - 40;
      this.drawCutout(ax, ay, 80, 0.85);
    }

    // J. Katana da Escuridão
    const dk = World.darkKatana;
    if (!dk.taken) {
      const kx = dk.x - cam.x, ky = dk.y - cam.y - 30;
      this.drawCutout(kx, ky, 80, 0.7);
    }

    // K. Cogumelos Brilhantes (shrooms)
    for (const sh of World.shrooms) {
      const sx = sh.x - cam.x, sy = sh.y - cam.y - sh.r;
      if (sx > -20 && sx < 980) {
        this.drawCutout(sx, sy, 25, 0.6);
      }
    }

    // Pontos-guia orgânicos: cada ilha revela somente sua vizinhança.
    if (typeof BioluminescentFloraSystem !== 'undefined') {
      BioluminescentFloraSystem.forEachVisibleLight(cam, frames, this.floraCutout);
    }

    // Olhos e listras mantêm o predador legível sob a superfície.
    if (typeof LakeSerpentSystem !== 'undefined') {
      LakeSerpentSystem.forEachLight(this.serpentCutout);
    }

    // A lua remove suavemente parte da penumbra ao seu redor. Isso preserva
    // a noite, mas faz o astro pertencer ao mesmo espaço iluminado do cenário.
    if (World.current === 'floresta' && cam.y <= 900 && World.moonScreenPosition) {
      const moon = World.moonScreenPosition(cam);
      const moonBreath = 0.31 + Math.sin(frames * 0.0038) * 0.025;
      this.drawCutout(moon.x, moon.y, 215, moonBreath);
    }

    // L. Lava (iluminação vertical ascendente)
    for (const lv of World.lavas) {
      const lx = lv.x - cam.x, ly = lv.y - cam.y;
      if (lx + lv.w > -40 && lx < 1000) {
        const lavaGrad = gl.createLinearGradient(0, ly, 0, ly - 70);
        lavaGrad.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
        lavaGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        gl.fillStyle = lavaGrad;
        gl.fillRect(lx, ly - 70, lv.w, 70);
        gl.fillStyle = 'rgba(0, 0, 0, 1)';
        gl.fillRect(lx, ly, lv.w, lv.h);
      }
    }

    // 3. Restaura operação padrão e desenha a máscara final no canvas do jogo
    gl.globalCompositeOperation = 'source-over';
    destCtx.drawImage(this.lightCanvas, 0, 0);

    // ─── 3.5 Iluminação Indireta Colorida (Light Glow Overlays) ───
    destCtx.save();
    destCtx.globalCompositeOperation = 'lighter';

    const drawGlow = (x, y, radius, colorStart, colorEnd = 'rgba(0,0,0,0)') => {
      const grad = destCtx.createRadialGradient(x, y, 0, x, y, radius);
      grad.addColorStop(0, colorStart);
      grad.addColorStop(1, colorEnd);
      destCtx.fillStyle = grad;
      destCtx.beginPath();
      destCtx.arc(x, y, radius, 0, Math.PI * 2);
      destCtx.fill();
    };
    this.activeGlow = drawGlow;

    if (typeof LakeSerpentSystem !== 'undefined') {
      LakeSerpentSystem.forEachLight(this.serpentGlow);
    }

    // Glow do jogador (Dourado se Luz, Violeta se Corrompido)
    if (p) {
      const isDark = Game.wielded === 'dark';
      const col = isDark ? 'rgba(150, 95, 255, 0.18)' : 'rgba(255, 214, 130, 0.18)';
      drawGlow(p.x - cam.x, p.y - cam.y + pyOffset, pLightRadius * 0.95, col);
    }

    // Glow dos inimigos
    for (const e of Enemies.list) {
      if (e.map === World.current && !e.dead) {
        const rad = e.isBoss ? 150 : 60;
        const col = e.element === 'fogo' ? 'rgba(255, 110, 30, 0.18)' : 'rgba(100, 220, 255, 0.16)';
        drawGlow(e.x - cam.x, e.y - cam.y - e.h / 2, rad, col);
      }
    }

    // Glow das Lanternas (Superfície)
    if (World.current === 'floresta') {
      for (const ln of World.lanterns) {
        const lx = ln.x - cam.x, ly = ln.y - cam.y - 37;
        if (lx > -60 && lx < 1020) {
          drawGlow(lx, ly, 70, 'rgba(255, 195, 90, 0.18)');
        }
      }
    }

    // Glow das Tochas (Cavernas de Fogo)
    for (const tc of World.torches) {
      const tx = tc.x - cam.x, ty = tc.y - cam.y - 34;
      if (tx > -60 && tx < 1020) {
        drawGlow(tx, ty, 80, 'rgba(255, 100, 30, 0.24)');
      }
    }

    // Glow dos Checkpoints
    World.checkpoints.forEach((cp) => {
      const lit = Game.checkpoint && Game.checkpoint.map === World.current
        && Game.checkpoint.x === cp.x && Game.checkpoint.y === cp.y;
      if (lit) {
        const cx = cp.x - cam.x, cy = cp.y - cam.y - 40;
        if (cx > -120 && cx < 1080) {
          drawGlow(cx, cy, 130, 'rgba(255, 214, 130, 0.20)');
        }
      }
    });

    // Glow dos Pickups (Lótus/Cristais)
    for (const pk of World.pickups) {
      if (!pk.taken) {
        const px = pk.x - cam.x, py = pk.y - cam.y - 10;
        if (px > -40 && px < 1000) {
          const col = pk.type === 'lotus' ? 'rgba(255, 214, 130, 0.16)' : 'rgba(120, 220, 255, 0.18)';
          drawGlow(px, py, 40, col);
        }
      }
    }

    // Glow da Katana Escura
    if (!dk.taken) {
      const kx = dk.x - cam.x, ky = dk.y - cam.y - 30;
      drawGlow(kx, ky, 75, 'rgba(150, 95, 255, 0.16)');
    }

    // Glow dos Cogumelos Brilhantes
    for (const sh of World.shrooms) {
      const sx = sh.x - cam.x, sy = sh.y - cam.y - sh.r;
      if (sx > -20 && sx < 980) {
        drawGlow(sx, sy, 22, 'rgba(100, 235, 255, 0.14)');
      }
    }

    // Glow das Lavas (Iluminação aditiva no chão e tetos das cavernas)
    for (const lv of World.lavas) {
      const lx = lv.x - cam.x, ly = lv.y - cam.y;
      if (lx + lv.w > -40 && lx < 1000) {
        const lavaGlow = destCtx.createLinearGradient(0, ly, 0, ly - 60);
        lavaGlow.addColorStop(0, 'rgba(255, 90, 20, 0.26)');
        lavaGlow.addColorStop(1, 'rgba(255, 90, 20, 0)');
        destCtx.fillStyle = lavaGlow;
        destCtx.fillRect(lx, ly - 60, lv.w, 60);
      }
    }

    destCtx.restore();
    this.activeGlow = null;
    this.activeCam = null;

    // 4. Compõe somente a luz ambiental difusa da lua.
    this.drawMoonlight(destCtx, cam, frames);
  },

  /**
   * Halo pós-penumbra e rebote no solo. As intensidades são
   * baixas para revelar volumes sem transformar a noite em dia.
   */
  drawMoonlight(ctx, cam, frames) {
    if (World.current !== 'floresta' || cam.y > 900 || !World.moonScreenPosition) return;

    const moon = World.moonScreenPosition(cam);
    const pulse = 0.94 + Math.sin(frames * 0.0038) * 0.06;
    const groundY = 430 - (cam.y - 870) * 0.04;
    const poolX = moon.x - 175;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const halo = ctx.createRadialGradient(moon.x, moon.y, 28, moon.x, moon.y, 205);
    halo.addColorStop(0, `rgba(228,240,255,${0.085 * pulse})`);
    halo.addColorStop(0.52, `rgba(177,211,242,${0.032 * pulse})`);
    halo.addColorStop(1, 'rgba(151,194,232,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(moon.x, moon.y, 205, 0, Math.PI * 2);
    ctx.fill();

    // Reacende somente o disco após a névoa e a máscara de sombra.
    const core = ctx.createRadialGradient(moon.x - 10, moon.y - 11, 2, moon.x, moon.y, 38);
    core.addColorStop(0, `rgba(255,255,246,${0.28 * pulse})`);
    core.addColorStop(0.64, `rgba(236,244,244,${0.20 * pulse})`);
    core.addColorStop(1, `rgba(188,215,232,${0.07 * pulse})`);
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(moon.x, moon.y, 38, 0, Math.PI * 2);
    ctx.fill();

    // Rebote elíptico suave sobre plataformas, raízes e pedras.
    ctx.translate(poolX, groundY);
    ctx.scale(1, 0.34);
    const bounce = ctx.createRadialGradient(0, 0, 8, 0, 0, 330);
    bounce.addColorStop(0, `rgba(190,220,247,${0.062 * pulse})`);
    bounce.addColorStop(0.48, `rgba(154,199,235,${0.025 * pulse})`);
    bounce.addColorStop(1, 'rgba(126,177,219,0)');
    ctx.fillStyle = bounce;
    ctx.beginPath();
    ctx.arc(0, 0, 330, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
};

// Vincula a variável global
window.Lighting = Lighting;
