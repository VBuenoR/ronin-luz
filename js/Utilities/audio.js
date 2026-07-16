'use strict';
// ─── Áudio 100% sintetizado (WebAudio) ───────────────────────────────
const Sfx = {
  ctx: null, master: null,
  musicElement: null,
  musicSource: null,
  musicFilter: null,
  musicGain: null,
  musicDirect: false,
  musicDirectTarget: 0,
  musicWanted: null,
  windGain: null,
  windTarget: -1,
  leafTimer: 540,
  musicPath: 'assets/audio/tidebound-shogun-ruins.mp3',
  currentMusicPath: 'assets/audio/tidebound-shogun-ruins.mp3',
  musicLevel: 0.10,
  sfxVolume: 0.8,
  musicVolume: 0.8,
  lastMusicVolume: 0.8,
  sfxGain: null,

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.22;
      this.master.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVolume;
      this.sfxGain.connect(this.master);

      this.startAmbient();
      this.startMusic();
    } catch (e) { this.ctx = null; }
  },

  now() { return this.ctx ? this.ctx.currentTime : 0; },

  tone({ f = 440, f2 = null, dur = 0.15, type = 'sine', vol = 0.5, delay = 0 } = {}) {
    if (!this.ctx) return;
    const t = this.now() + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(1, f2), t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.sfxGain || this.master);
    o.start(t); o.stop(t + dur + 0.05);
  },

  noise({ dur = 0.2, vol = 0.3, fc = 1200, q = 1, delay = 0, type = 'bandpass', fc2 = null } = {}) {
    if (!this.ctx) return;
    const t = this.now() + delay;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const fl = this.ctx.createBiquadFilter();
    fl.type = type; fl.frequency.setValueAtTime(fc, t); fl.Q.value = q;
    if (fc2) fl.frequency.exponentialRampToValueAtTime(Math.max(40, fc2), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(fl); fl.connect(g); g.connect(this.sfxGain || this.master);
    src.start(t);
  },

  // vento suave contínuo de fundo
  startAmbient() {
    if (!this.ctx) return;
    const sr = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, sr * 2, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const fl = this.ctx.createBiquadFilter();
    fl.type = 'lowpass'; fl.frequency.value = 300;
    const g = this.ctx.createGain(); g.gain.value = 0;
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = 0.08;
    const lg = this.ctx.createGain(); lg.gain.value = 130;
    lfo.connect(lg); lg.connect(fl.frequency);
    src.connect(fl); fl.connect(g); g.connect(this.sfxGain || this.master);
    src.start(); lfo.start();
    this.windGain = g;
  },

  // Música licenciada do menu e do primeiro reino. O elemento permanece em
  // loop silencioso fora da floresta para retomar sem corte ao atravessar o portal.
  startMusic() {
    if (!this.ctx || this.musicElement) return;
    const audio = new Audio();
    audio.src = new URL(this.musicPath, document.baseURI).href;
    audio.loop = true;
    audio.preload = 'auto';
    audio.playsInline = true;

    this.musicElement = audio;
    this.musicDirect = location.protocol === 'file:';

    if (this.musicDirect) {
      // MediaElementSource pode ser bloqueado em file://. A saída direta mantém
      // loop, volume e fades sem depender da política de origem do WebAudio.
      audio.volume = 0;
      this.musicDirectTarget = 0;
    } else {
      audio.volume = 1;
      const source = this.ctx.createMediaElementSource(audio);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 7600;
      filter.Q.value = 0.35;
      const gain = this.ctx.createGain();
      gain.gain.value = 0;

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      this.musicSource = source;
      this.musicFilter = filter;
      this.musicGain = gain;
    }
    // Força a primeira atualização pós-gesto a programar o fade correto.
    this.musicWanted = null;
    audio.play().catch(() => {});
  },

  updateMix(state, realm, player) {
    const menu = state === 'title' || state === 'intro';
    const firstRealm = realm === 'floresta' && (state === 'explore' || state === 'battle');
    const fireRealm = realm === 'fogo' && (state === 'explore' || state === 'battle');
    const wantsMusic = menu || firstRealm || fireRealm;

    let desiredPath = 'assets/audio/tidebound-shogun-ruins.mp3';
    if (fireRealm) {
      desiredPath = 'assets/audio/Molten Shrine March.mp3';
    }

    if (wantsMusic && this.currentMusicPath !== desiredPath) {
      this.currentMusicPath = desiredPath;
      if (this.musicElement) {
        this.musicElement.pause();
        this.musicElement.src = new URL(desiredPath, document.baseURI).href;
        this.musicElement.load();
        if (this.musicDirect) {
          this.musicElement.volume = 0;
        } else if (this.musicGain) {
          this.musicGain.gain.setValueAtTime(0.0001, this.now());
          this.lastMusicVolume = -1; // Força re-agendamento do volume no WebAudio
        }
        this.musicElement.play().catch(() => {});
      }
    }

    if (this.musicDirect && this.musicElement) {
      if (wantsMusic !== this.musicWanted) {
        this.musicWanted = wantsMusic;
        this.musicDirectTarget = wantsMusic ? this.musicLevel * this.musicVolume : 0;
        if (wantsMusic && this.musicElement.paused) this.musicElement.play().catch(() => {});
      }
      this.musicDirectTarget = wantsMusic ? this.musicLevel * this.musicVolume : 0;
      // Fade independente para file://, estável no passo fixo de 60 fps.
      const current = this.musicElement.volume;
      const rate = this.musicDirectTarget > current ? 0.025 : 0.06;
      const next = current + (this.musicDirectTarget - current) * rate;
      this.musicElement.volume = Math.abs(next - this.musicDirectTarget) < 0.0001
        ? this.musicDirectTarget : next;
    } else if (this.ctx && this.musicGain && (wantsMusic !== this.musicWanted || this.lastMusicVolume !== this.musicVolume)) {
      this.musicWanted = wantsMusic;
      this.lastMusicVolume = this.musicVolume;
      const now = this.now();
      const gain = this.musicGain.gain;
      gain.cancelScheduledValues(now);
      gain.setValueAtTime(gain.value, now);
      gain.setTargetAtTime(wantsMusic ? this.musicLevel * this.musicVolume : 0.0001, now, wantsMusic ? 0.72 : 0.46);
      if (wantsMusic && this.musicElement && this.musicElement.paused) {
        this.musicElement.play().catch(() => {});
      }
    } else if (!this.ctx) {
      this.musicWanted = wantsMusic;
    }

    if (!this.ctx || !this.windGain) return;
    const surfaceForest = realm === 'floresta' && player && player.y < 1500;
    let wind = 0.025;
    if (state === 'title') wind = 0.058;
    else if (state === 'intro') wind = 0.068;
    else if (surfaceForest && state === 'explore') wind = 0.085;
    else if (realm === 'floresta') wind = 0.048;

    if (Math.abs(wind - this.windTarget) > 0.001) {
      this.windTarget = wind;
      const now = this.now();
      this.windGain.gain.cancelScheduledValues(now);
      this.windGain.gain.setTargetAtTime(wind, now, 0.8);
    }

    // Folhas espaçadas mantêm o ambiente perceptível sem formar ruído contínuo.
    if (surfaceForest && state === 'explore') {
      this.leafTimer--;
      if (this.leafTimer <= 0) {
        this.leafRustle();
        this.leafTimer = 420 + Math.floor(Math.random() * 480);
      }
    } else {
      this.leafTimer = Math.max(this.leafTimer, 240);
    }
  },

  leafRustle() {
    this.noise({ dur: 0.78, vol: 0.052, fc: 760, fc2: 2350, type: 'bandpass', q: 0.58 });
    this.noise({ dur: 0.42, vol: 0.024, fc: 2800, fc2: 1100, type: 'bandpass', q: 0.8, delay: 0.12 });
  },

  // ── efeitos ──
  jump()      { this.tone({ f: 260, f2: 520, dur: 0.12, type: 'square', vol: 0.16 }); },
  wallJump()  { this.tone({ f: 320, f2: 620, dur: 0.12, type: 'square', vol: 0.16 }); },
  dash()      { this.noise({ dur: 0.18, vol: 0.3, fc: 2400, fc2: 500, type: 'bandpass', q: 0.8 }); this.tone({ f: 700, f2: 180, dur: 0.16, type: 'sawtooth', vol: 0.1 }); },
  slash()     { this.noise({ dur: 0.13, vol: 0.35, fc: 3800, fc2: 900, q: 1.2 }); },
  hit(crit)   {
    this.noise({ dur: 0.14, vol: 0.4, fc: 900, fc2: 200, q: 1 });
    this.tone({ f: crit ? 190 : 150, f2: 60, dur: 0.16, type: 'square', vol: 0.28 });
    if (crit) { this.tone({ f: 1200, f2: 2200, dur: 0.18, type: 'sine', vol: 0.2, delay: 0.02 }); }
  },
  hurt()      { this.tone({ f: 220, f2: 70, dur: 0.25, type: 'sawtooth', vol: 0.26 }); this.noise({ dur: 0.15, vol: 0.2, fc: 500, fc2: 150 }); },
  splash()    { this.noise({ dur: 0.3, vol: 0.32, fc: 1500, fc2: 400, type: 'bandpass', q: 0.6 }); },
  enemyMagic(){ this.noise({ dur: 0.35, vol: 0.3, fc: 600, fc2: 2400, q: 2 }); this.tone({ f: 300, f2: 90, dur: 0.35, type: 'sine', vol: 0.2 }); },
  defend()    { this.tone({ f: 520, dur: 0.2, type: 'triangle', vol: 0.2 }); this.tone({ f: 780, dur: 0.24, type: 'sine', vol: 0.12, delay: 0.05 }); },
  holyGuard() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone({
      f, dur: 0.46, type: i === 3 ? 'sine' : 'triangle',
      vol: 0.105, delay: i * 0.045
    }));
    this.tone({ f: 196, f2: 294, dur: 0.52, type: 'sine', vol: 0.08 });
    this.noise({ dur: 0.32, vol: 0.065, fc: 2600, fc2: 5200, type: 'bandpass', q: 0.7 });
  },
  menuMove()  { this.tone({ f: 720, dur: 0.05, type: 'sine', vol: 0.12 }); },
  confirm()   { this.tone({ f: 660, dur: 0.07, type: 'sine', vol: 0.16 }); this.tone({ f: 990, dur: 0.1, type: 'sine', vol: 0.14, delay: 0.05 }); },
  deny()      { this.tone({ f: 200, f2: 140, dur: 0.14, type: 'square', vol: 0.14 }); },
  flee()      { this.noise({ dur: 0.3, vol: 0.22, fc: 2000, fc2: 600 }); },
  purify() {
    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((f, i) => this.tone({ f, dur: 0.6, type: 'sine', vol: 0.16, delay: i * 0.1 }));
    this.noise({ dur: 1.2, vol: 0.08, fc: 5000, q: 0.5, delay: 0.2 });
  },
  levelup() {
    [392, 523, 659, 784].forEach((f, i) => this.tone({ f, dur: 0.22, type: 'triangle', vol: 0.18, delay: i * 0.09 }));
  },
  victory() {
    [523, 523, 659, 784].forEach((f, i) => this.tone({ f, dur: 0.18, type: 'square', vol: 0.1, delay: i * 0.12 }));
    this.tone({ f: 1047, dur: 0.5, type: 'triangle', vol: 0.15, delay: 0.48 });
  },
  defeat()    { [400, 320, 240, 150].forEach((f, i) => this.tone({ f, dur: 0.4, type: 'sawtooth', vol: 0.12, delay: i * 0.22 })); },
  pickup()    { this.tone({ f: 900, f2: 1500, dur: 0.14, type: 'sine', vol: 0.18 }); },
  gate()      { this.noise({ dur: 1.0, vol: 0.3, fc: 120, fc2: 60, type: 'lowpass' }); this.tone({ f: 60, f2: 45, dur: 1.0, type: 'sawtooth', vol: 0.18 }); },
  amulet() {
    [330, 440, 554, 659, 880].forEach((f, i) => this.tone({ f, dur: 0.5, type: 'sine', vol: 0.15, delay: i * 0.13 }));
    this.noise({ dur: 1.4, vol: 0.06, fc: 4000, q: 0.4, delay: 0.3 });
  },
  tsunami()   { this.noise({ dur: 1.1, vol: 0.45, fc: 300, fc2: 1800, type: 'lowpass' }); this.tone({ f: 90, f2: 40, dur: 1.0, type: 'sawtooth', vol: 0.2 }); },
  charge()    { this.tone({ f: 100, f2: 240, dur: 0.8, type: 'sawtooth', vol: 0.12 }); this.noise({ dur: 0.8, vol: 0.12, fc: 400, fc2: 900 }); },
  checkpoint(){ this.tone({ f: 587, dur: 0.3, type: 'sine', vol: 0.14 }); this.tone({ f: 880, dur: 0.4, type: 'sine', vol: 0.12, delay: 0.12 }); },
  waterMagic(){
    this.noise({ dur: 0.58, vol: 0.38, fc: 620, fc2: 3200, q: 1.7 });
    this.tone({ f: 680, f2: 170, dur: 0.52, type: 'sine', vol: 0.21 });
    this.tone({ f: 105, f2: 48, dur: 0.48, type: 'triangle', vol: 0.15 });
    this.tone({ f: 1280, f2: 420, dur: 0.16, type: 'sine', vol: 0.08 });
  },
  mare() {
    this.noise({ dur: 0.7, vol: 0.42, fc: 240, fc2: 1600, type: 'lowpass' });
    this.tone({ f: 110, f2: 55, dur: 0.6, type: 'sawtooth', vol: 0.18 });
    this.tone({ f: 660, f2: 220, dur: 0.4, type: 'sine', vol: 0.12, delay: 0.1 });
  },
  absorb() {
    [392, 311, 233, 155].forEach((f, i) => this.tone({ f, dur: 0.35, type: 'triangle', vol: 0.14, delay: i * 0.09 }));
    this.tone({ f: 55, f2: 38, dur: 0.9, type: 'sawtooth', vol: 0.12 });
    this.noise({ dur: 0.8, vol: 0.1, fc: 300, fc2: 90, type: 'lowpass' });
  },
  darkCharge() {
    this.tone({ f: 170, f2: 690, dur: 0.11, type: 'triangle', vol: 0.11 });
    this.tone({ f: 76, f2: 118, dur: 0.14, type: 'sine', vol: 0.13 });
    this.noise({ dur: 0.1, vol: 0.08, fc: 380, fc2: 1100, type: 'bandpass', q: 1.4 });
  },
  darkBolt() {
    this.noise({ dur: 0.24, vol: 0.29, fc: 3600, fc2: 520, type: 'bandpass', q: 0.82 });
    this.tone({ f: 940, f2: 190, dur: 0.22, type: 'sawtooth', vol: 0.1 });
    this.tone({ f: 128, f2: 42, dur: 0.3, type: 'triangle', vol: 0.17 });
  },
  mist() {
    this.noise({ dur: 0.9, vol: 0.16, fc: 900, fc2: 300, type: 'lowpass' });
    this.tone({ f: 660, f2: 440, dur: 0.7, type: 'sine', vol: 0.07 });
  },
  fire() {
    this.noise({ dur: 0.42, vol: 0.34, fc: 3200, fc2: 620, type: 'bandpass', q: 0.78 });
    this.noise({ dur: 0.2, vol: 0.2, fc: 680, fc2: 180, type: 'lowpass', q: 0.7 });
    this.tone({ f: 210, f2: 62, dur: 0.38, type: 'sawtooth', vol: 0.16 });
    this.tone({ f: 860, f2: 310, dur: 0.2, type: 'triangle', vol: 0.08, delay: 0.025 });
  },
  equip() {
    this.tone({ f: 440, dur: 0.12, type: 'triangle', vol: 0.16 });
    this.tone({ f: 660, dur: 0.18, type: 'sine', vol: 0.14, delay: 0.08 });
  },
  lakeSerpentTelegraph() {
    this.tone({ f: 72, f2: 188, dur: 0.86, type: 'sine', vol: 0.105 });
    this.tone({ f: 146, f2: 286, dur: 0.72, type: 'triangle', vol: 0.055, delay: 0.08 });
    this.noise({ dur: 0.82, vol: 0.07, fc: 260, fc2: 980, type: 'bandpass', q: 2.1 });
  },
  lakeSerpentLunge() {
    this.noise({ dur: 0.22, vol: 0.3, fc: 3300, fc2: 430, type: 'bandpass', q: 0.72 });
    this.tone({ f: 540, f2: 68, dur: 0.24, type: 'sawtooth', vol: 0.1 });
  },
  lakeSerpentHit() {
    this.noise({ dur: 0.34, vol: 0.36, fc: 1350, fc2: 260, type: 'lowpass', q: 0.65 });
    this.tone({ f: 118, f2: 42, dur: 0.3, type: 'sawtooth', vol: 0.17 });
  },
  lakeSerpentSplash() {
    this.noise({ dur: 0.4, vol: 0.3, fc: 1700, fc2: 240, type: 'bandpass', q: 0.55 });
  },
  doubleJump() {
    this.noise({ dur: 0.15, vol: 0.22, fc: 2500, fc2: 300, type: 'bandpass', q: 0.8 });
    this.tone({ f: 480, f2: 880, dur: 0.14, type: 'sine', vol: 0.12 });
  },
  windMagic() {
    this.noise({ dur: 0.65, vol: 0.35, fc: 3000, fc2: 400, type: 'bandpass', q: 0.7 });
    this.tone({ f: 880, f2: 220, dur: 0.6, type: 'sine', vol: 0.22 });
  },
  darkTake() {
    [220, 208, 165, 110, 82].forEach((f, i) => this.tone({ f, dur: 0.7, type: 'triangle', vol: 0.14, delay: i * 0.16 }));
    this.tone({ f: 41, dur: 2.2, type: 'sine', vol: 0.16, delay: 0.3 });
    this.noise({ dur: 1.6, vol: 0.07, fc: 200, fc2: 60, type: 'lowpass', delay: 0.4 });
  },

  setSfxVolume(v) {
    this.sfxVolume = Math.max(0, Math.min(1, v));
    if (this.sfxGain) {
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.now());
    }
  },

  setMusicVolume(v) {
    this.musicVolume = Math.max(0, Math.min(1, v));
  }
};
