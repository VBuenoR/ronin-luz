'use strict';
// ─── Teclado ─────────────────────────────────────────────────────────
const Input = {
  keys: {}, just: {},
  pointer: { x: 0, y: 0, just: false },
  map: {
    left:    ['ArrowLeft', 'KeyA', 'a', 'A'],
    right:   ['ArrowRight', 'KeyD', 'd', 'D'],
    up:      ['ArrowUp', 'KeyW', 'w', 'W'],
    downKey: ['ArrowDown', 'KeyS', 's', 'S'],
    jump:    ['Space', 'KeyZ', 'z', 'Z'],
    attack:  ['KeyX', 'KeyJ', 'x', 'X', 'j', 'J'],
    dash:    ['ShiftLeft', 'ShiftRight', 'KeyC', 'KeyL', 'c', 'C', 'l', 'L'],
    confirm: ['Enter', 'KeyZ', 'Space', 'z', 'Z'],
    back:    ['Escape', 'KeyX', 'x', 'X'],
    swap:    ['KeyQ', 'q', 'Q'],
    equip:   ['KeyE', 'e', 'E'],
    healSkill: ['KeyR', 'r', 'R'],
    developer: ['F9']
  },

  reset() {
    this.keys = {};
    this.just = {};
    this.pointer.just = false;
  },

  init() {
    addEventListener('pointerdown', e => {
      Sfx.init();
      if (e.button !== 0) return;
      this.pointer.x = e.clientX;
      this.pointer.y = e.clientY;
      this.pointer.just = true;
    });
    addEventListener('keydown', e => {
      const code = e.code;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'F9'].includes(code)) {
        e.preventDefault();
      }

      // Rastreamos APENAS e.code — é estável sob Shift/CapsLock/layout. Rastrear
      // e.key travava as teclas: com Shift segurado (dash), o keyup de uma letra
      // chega em maiúsculo ('D') enquanto o keydown foi minúsculo ('d'), então a
      // minúscula nunca era limpa e a direção ficava presa.
      const wasDown = !!this.keys[code];
      this.keys[code] = true;
      if (!e.repeat && !wasDown) this.just[code] = true;
      Sfx.init();
    });
    addEventListener('keyup', e => {
      this.keys[e.code] = false;
    });
    addEventListener('blur', () => this.reset());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.reset();
    });
  },

  is(name) { return (this.map[name] || []).some(c => this.keys[c]); },
  pressed(name) { return (this.map[name] || []).some(c => this.just[c]); },
  endFrame() {
    this.just = {};
    this.pointer.just = false;
  }
};

