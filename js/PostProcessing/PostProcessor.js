'use strict';

/**
 * Gerenciador de Pós-Processamento WebGL para Rōnin de Luz.
 * Implementa um pipeline modular de passes (URP/Godot style) rodando na GPU.
 */
const PostProcessor = {
  gl: null,
  canvasWebGL: null,
  width: 960,
  height: 540,
  quadVAO: null,
  quadBuffer: null,

  // Texturas e Framebuffers (Ping-Pong para múltiplos passes)
  fboA: null, texA: null,
  fboB: null, texB: null,
  
  // FBOs de baixa resolução para o Bloom (1/4 da resolução)
  fboBloomA: null, texBloomA: null,
  fboBloomB: null, texBloomB: null,

  // Cache de programas compilados
  programs: {},
  impactPulse: { active: false, t: 0, life: 0, x: 0.5, y: 0.5, direction: 1, strength: 0 },

  // Configurações e parâmetros em tempo real (podem ser alterados a qualquer frame)
  Config: {
    // Configurações Globais
    active: true,

    // Efeitos individuais
    Bloom: { active: true, threshold: 0.65, intensity: 1.4 },
    HeatDistortion: {
      active: false, speed: 3.5, strength: 0.003, frequency: 18.0,
      impactCenter: [0.5, 0.5], impactDirection: [1, 0],
      impactRadius: 0.16, impactStrength: 0, impactProgress: 1
    },
    WindAtmosphere: {
      active: false, strength: 0, direction: 1,
      cloudColor: [0.84, 0.9, 0.95], cloudOpacity: 0.08
    },
    WindMotion: { active: false, strength: 0, direction: 1 },
    ChromaticAberration: { active: true, offsetX: 0.0012, offsetY: 0.0 },
    ColorGrading: { active: true, brightness: 1.05, contrast: 1.05, saturation: 1.05, tint: [1.0, 1.0, 1.0] },
    FilmGrain: { active: true, amount: 0.035 },
    Vignette: { active: true, intensity: 0.38, smoothness: 0.68 },
    Fog: { active: false, color: [0.18, 0.32, 0.36], density: 0.22, startHeight: 0.35 }
  },

  // Ordem de execução padrão dos passes
  passesOrder: [
    'HeatDistortion',
    'WindAtmosphere',
    'WindMotion',
    'Bloom',
    'ChromaticAberration',
    'Fog',
    'ColorGrading',
    'FilmGrain',
    'Vignette'
  ],

  // Um único pulso reutilizado evita alocar buffers por impacto. O shader é
  // executado temporariamente mesmo em presets sem distorção térmica.
  triggerDistortion(x, y, direction, strength) {
    const pulse = this.impactPulse;
    pulse.active = true;
    pulse.t = 0;
    pulse.life = 6;
    pulse.x = Math.max(0, Math.min(1, x));
    pulse.y = Math.max(0, Math.min(1, y));
    pulse.direction = direction < 0 ? -1 : 1;
    pulse.strength = strength || 0.006;
    const cfg = this.Config.HeatDistortion;
    cfg.impactCenter[0] = pulse.x;
    cfg.impactCenter[1] = pulse.y;
    cfg.impactDirection[0] = pulse.direction;
    cfg.impactDirection[1] = 0;
    cfg.impactRadius = 0.16;
    cfg.impactStrength = pulse.strength;
    cfg.impactProgress = 0;
  },

  updateImpulses() {
    const pulse = this.impactPulse;
    const cfg = this.Config.HeatDistortion;
    if (!pulse.active) return;
    pulse.t++;
    const q = Math.min(1, pulse.t / pulse.life);
    cfg.impactProgress = q;
    cfg.impactStrength = pulse.strength * (1 - q) * (1 - q);
    if (pulse.t >= pulse.life) {
      pulse.active = false;
      cfg.impactStrength = 0;
      cfg.impactProgress = 1;
    }
  },

  /**
   * Inicializa o contexto WebGL e aloca recursos (GPU)
   */
  init(canvasWebGL) {
    this.canvasWebGL = canvasWebGL;
    
    // Tenta inicializar WebGL
    const gl = canvasWebGL.getContext('webgl', {
      alpha: false,
      depth: false,
      stencil: false,
      antialias: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false
    });

    if (!gl) {
      console.warn("WebGL não suportado pelo navegador. Fallback para renderizador 2D ativo.");
      return false;
    }

    this.gl = gl;
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); // Corrige a orientação vertical (eixo Y) do canvas 2D para o WebGL

    // Compila e armazena os shaders
    if (!this.compileAllShaders()) {
      return false;
    }

    // Cria o buffer do quad (-1 a 1 cobrindo a tela inteira)
    const vertices = new Float32Array([
      -1, -1,   1, -1,  -1,  1,
      -1,  1,   1, -1,   1,  1
    ]);
    this.quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // Cria e dimensiona os Framebuffers
    this.resize(this.width, this.height);

    console.log("Infraestrutura de pós-processamento WebGL inicializada com sucesso!");
    return true;
  },

  /**
   * Redimensiona as texturas e buffers da GPU de acordo com o canvas
   */
  resize(w, h) {
    const gl = this.gl;
    if (!gl) return;

    this.width = w;
    this.height = h;

    // Remove texturas antigas se existirem
    this.destroyTextures();

    // Aloca buffers de tamanho completo (Ping-Pong com NEAREST para nitidez pixel-art)
    this.texA = this.createTexture(w, h, false);
    this.fboA = this.createFramebuffer(this.texA);

    this.texB = this.createTexture(w, h, false);
    this.fboB = this.createFramebuffer(this.texB);

    // Aloca buffers de tamanho reduzido (1/4 da resolução) para o Bloom (com LINEAR para desfoque suave)
    const bw = Math.floor(w / 4);
    const bh = Math.floor(h / 4);
    this.texBloomA = this.createTexture(bw, bh, true);
    this.fboBloomA = this.createFramebuffer(this.texBloomA);

    this.texBloomB = this.createTexture(bw, bh, true);
    this.fboBloomB = this.createFramebuffer(this.texBloomB);
  },

  /**
   * Compila todos os programas a partir de window.Shaders
   */
  compileAllShaders() {
    const gl = this.gl;
    const S = window.Shaders;
    if (!S) {
      console.error("Biblioteca de Shaders não encontrada!");
      return false;
    }

    const compileShader = (src, type) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Erro ao compilar shader:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const linkProgram = (vsSrc, fsSrc) => {
      const vs = compileShader(vsSrc, gl.VERTEX_SHADER);
      const fs = compileShader(fsSrc, gl.FRAGMENT_SHADER);
      if (!vs || !fs) return null;

      const program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);

      // Limpa os shaders individuais para poupar memória da GPU após o link
      gl.detachShader(program, vs);
      gl.detachShader(program, fs);
      gl.deleteShader(vs);
      gl.deleteShader(fs);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("Erro ao vincular programa:", gl.getProgramInfoLog(program));
        return null;
      }
      return program;
    };

    // Compila os programas modulares
    const vs = S.VS;
    this.programs.passThrough = linkProgram(vs, S.PassThrough);
    this.programs.bright = linkProgram(vs, S.Bright);
    this.programs.blur = linkProgram(vs, S.Blur);
    this.programs.bloomComposite = linkProgram(vs, S.BloomComposite);
    this.programs.heatDistortion = linkProgram(vs, S.HeatDistortion);
    this.programs.windAtmosphere = linkProgram(vs, S.WindAtmosphere);
    this.programs.windMotion = linkProgram(vs, S.WindMotion);
    this.programs.chromaticAberration = linkProgram(vs, S.ChromaticAberration);
    this.programs.colorGrading = linkProgram(vs, S.ColorGrading);
    this.programs.filmGrain = linkProgram(vs, S.FilmGrain);
    this.programs.vignette = linkProgram(vs, S.Vignette);
    this.programs.fog = linkProgram(vs, S.Fog);

    // Verifica se todos foram compilados com sucesso
    for (const key in this.programs) {
      if (!this.programs[key]) {
        console.error(`Falha ao compilar shader pass: ${key}`);
        return false;
      }
    }
    return true;
  },

  /**
   * Cria uma textura WebGL de tamanho específico com filtro selecionável
   */
  createTexture(w, h, linear = false) {
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    
    // Configura filtros (NEAREST para manter a nitidez do pixel art, LINEAR para suavização do bloom)
    const filter = linear ? gl.LINEAR : gl.NEAREST;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    return tex;
  },

  /**
   * Vincula uma textura WebGL a um Framebuffer
   */
  createFramebuffer(tex) {
    const gl = this.gl;
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return fbo;
  },

  /**
   * Libera as texturas antigas da GPU
   */
  destroyTextures() {
    const gl = this.gl;
    if (!gl) return;
    if (this.fboA) gl.deleteFramebuffer(this.fboA);
    if (this.texA) gl.deleteTexture(this.texA);
    if (this.fboB) gl.deleteFramebuffer(this.fboB);
    if (this.texB) gl.deleteTexture(this.texB);
    if (this.fboBloomA) gl.deleteFramebuffer(this.fboBloomA);
    if (this.texBloomA) gl.deleteTexture(this.texBloomA);
    if (this.fboBloomB) gl.deleteFramebuffer(this.fboBloomB);
    if (this.texBloomB) gl.deleteTexture(this.texBloomB);
  },

  /**
   * Processa a imagem 2D aplicando a pipeline de shaders em sequência
   * @param {HTMLCanvasElement} canvas2d - O canvas onde o jogo 2D foi renderizado.
   * @param {number} frames - Contador de frames atual (u_time).
   * @param {number} [viewX] - Offset X para centramento (letterbox)
   * @param {number} [viewY] - Offset Y para centramento (letterbox)
   * @param {number} [viewW] - Largura escalada da tela de jogo
   * @param {number} [viewH] - Altura escalada da tela de jogo
   */
  process(canvas2d, frames, viewX, viewY, viewW, viewH) {
    const gl = this.gl;
    if (!gl || !this.Config.active) return;

    // 1. Carrega e atualiza a textura inicial (Upload do Canvas 2D para a GPU)
    gl.bindTexture(gl.TEXTURE_2D, this.texA);
    // Transfere o canvas como imagem de textura
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas2d);

    // Prepara o buffer de desenho
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);

    // Gerenciador de Ping-Pong
    let currentSrcTex = this.texA;
    let currentDestFbo = this.fboB;
    let currentDestTex = this.texB;

    const swapPingPong = () => {
      // Inverte leitura e escrita para o próximo pass
      const tempTex = currentSrcTex;
      currentSrcTex = currentDestTex;
      currentDestTex = tempTex;
      currentDestFbo = (currentDestFbo === this.fboB) ? this.fboA : this.fboB;
    };

    // 2. Executa os Passes de Efeitos ordenadamente
    for (const passName of this.passesOrder) {
      const cfg = this.Config[passName];
      const impactActive = passName === 'HeatDistortion' && cfg && cfg.impactStrength > 0.00001;
      if (!cfg || (!cfg.active && !impactActive)) continue;

      if (passName === 'Bloom') {
        // O Bloom requer renderizações internas de downscale, blur e blend
        this.runBloomPass(currentSrcTex, currentDestFbo, currentDestTex, cfg);
        swapPingPong();
      } else {
        // Aplica o passe padrão no framebuffer ativo
        gl.bindFramebuffer(gl.FRAMEBUFFER, currentDestFbo);
        gl.viewport(0, 0, this.width, this.height);
        
        this.applyPassShader(passName, currentSrcTex, cfg, frames);
        swapPingPong();
      }
    }

    // 3. Composite Final: Desenha o resultado na tela (null framebuffer = tela do canvas principal)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    
    // Mantém a proporção de tela original através do letterbox / centramento
    if (viewW !== undefined && viewH !== undefined) {
      gl.viewport(viewX, viewY, viewW, viewH);
    } else {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    }

    const prog = this.programs.passThrough;
    gl.useProgram(prog);

    // Vincula a última textura renderizada no ping-pong
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, currentSrcTex);
    gl.uniform1i(gl.getUniformLocation(prog, 'u_image'), 0);

    const a_position = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(a_position);
    gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  },

  /**
   * Renderiza um shader de pass com seus respectivos uniforms
   */
  applyPassShader(name, srcTex, cfg, frames) {
    const gl = this.gl;
    let prog = null;

    // Configura os uniforms específicos de cada shader
    if (name === 'HeatDistortion') {
      prog = this.programs.heatDistortion;
      gl.useProgram(prog);
      gl.uniform1f(gl.getUniformLocation(prog, 'u_time'), frames * 0.01);
      gl.uniform1f(gl.getUniformLocation(prog, 'u_speed'), cfg.speed);
      gl.uniform1f(gl.getUniformLocation(prog, 'u_strength'), cfg.strength);
      gl.uniform1f(gl.getUniformLocation(prog, 'u_frequency'), cfg.frequency);
      gl.uniform2f(gl.getUniformLocation(prog, 'u_impactCenter'),
        cfg.impactCenter[0], cfg.impactCenter[1]);
      gl.uniform2f(gl.getUniformLocation(prog, 'u_impactDirection'),
        cfg.impactDirection[0], cfg.impactDirection[1]);
      gl.uniform1f(gl.getUniformLocation(prog, 'u_impactRadius'), cfg.impactRadius);
      gl.uniform1f(gl.getUniformLocation(prog, 'u_impactStrength'), cfg.impactStrength);
      gl.uniform1f(gl.getUniformLocation(prog, 'u_impactProgress'), cfg.impactProgress);

    } else if (name === 'WindAtmosphere') {
      prog = this.programs.windAtmosphere;
      gl.useProgram(prog);
      gl.uniform1f(gl.getUniformLocation(prog, 'u_time'), frames * 0.01);
      gl.uniform1f(gl.getUniformLocation(prog, 'u_strength'), cfg.strength);
      gl.uniform1f(gl.getUniformLocation(prog, 'u_direction'), cfg.direction);
      gl.uniform3fv(gl.getUniformLocation(prog, 'u_cloudColor'), cfg.cloudColor);
      gl.uniform1f(gl.getUniformLocation(prog, 'u_cloudOpacity'), cfg.cloudOpacity);

    } else if (name === 'WindMotion') {
      prog = this.programs.windMotion;
      gl.useProgram(prog);
      gl.uniform1f(gl.getUniformLocation(prog, 'u_time'), frames * 0.01);
      gl.uniform1f(gl.getUniformLocation(prog, 'u_strength'), cfg.strength);
      gl.uniform1f(gl.getUniformLocation(prog, 'u_direction'), cfg.direction);

    } else if (name === 'ChromaticAberration') {
      prog = this.programs.chromaticAberration;
      gl.useProgram(prog);
      gl.uniform2f(gl.getUniformLocation(prog, 'u_offset'), cfg.offsetX, cfg.offsetY);

    } else if (name === 'ColorGrading') {
      prog = this.programs.colorGrading;
      gl.useProgram(prog);
      gl.uniform1f(gl.getUniformLocation(prog, 'u_brightness'), cfg.brightness);
      gl.uniform1f(gl.getUniformLocation(prog, 'u_contrast'), cfg.contrast);
      gl.uniform1f(gl.getUniformLocation(prog, 'u_saturation'), cfg.saturation);
      gl.uniform3fv(gl.getUniformLocation(prog, 'u_tint'), cfg.tint);

    } else if (name === 'FilmGrain') {
      prog = this.programs.filmGrain;
      gl.useProgram(prog);
      gl.uniform1f(gl.getUniformLocation(prog, 'u_time'), frames);
      gl.uniform1f(gl.getUniformLocation(prog, 'u_amount'), cfg.amount);

    } else if (name === 'Vignette') {
      prog = this.programs.vignette;
      gl.useProgram(prog);
      gl.uniform1f(gl.getUniformLocation(prog, 'u_intensity'), cfg.intensity);
      gl.uniform1f(gl.getUniformLocation(prog, 'u_smoothness'), cfg.smoothness);

    } else if (name === 'Fog') {
      prog = this.programs.fog;
      gl.useProgram(prog);
      gl.uniform3fv(gl.getUniformLocation(prog, 'u_fogColor'), cfg.color);
      gl.uniform1f(gl.getUniformLocation(prog, 'u_density'), cfg.density);
      gl.uniform1f(gl.getUniformLocation(prog, 'u_startHeight'), cfg.startHeight);
    }

    if (!prog) return;

    // Vincula textura de entrada
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, srcTex);
    gl.uniform1i(gl.getUniformLocation(prog, 'u_image'), 0);

    // Atributos de vértice
    const a_position = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(a_position);
    gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  },

  /**
   * Pipeline de Bloom (Threshold → Horizontal Blur → Vertical Blur → Composite)
   * Usa downsampling para performance excelente
   */
  runBloomPass(srcTex, destFbo, destTex, cfg) {
    const gl = this.gl;
    const bw = Math.floor(this.width / 4);
    const bh = Math.floor(this.height / 4);

    // 1. Extração do Brilho (Downscale 1/4)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboBloomA);
    gl.viewport(0, 0, bw, bh);

    let prog = this.programs.bright;
    gl.useProgram(prog);
    gl.uniform1f(gl.getUniformLocation(prog, 'u_threshold'), cfg.threshold);
    
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, srcTex);
    gl.uniform1i(gl.getUniformLocation(prog, 'u_image'), 0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // 2. Desfoque Gaussiano Horizontal
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboBloomB);
    prog = this.programs.blur;
    gl.useProgram(prog);
    gl.uniform2f(gl.getUniformLocation(prog, 'u_resolution'), bw, bh);
    gl.uniform2f(gl.getUniformLocation(prog, 'u_dir'), 1.0, 0.0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texBloomA);
    gl.uniform1i(gl.getUniformLocation(prog, 'u_image'), 0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // 3. Desfoque Gaussiano Vertical
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboBloomA);
    gl.uniform2f(gl.getUniformLocation(prog, 'u_dir'), 0.0, 1.0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texBloomB);
    gl.uniform1i(gl.getUniformLocation(prog, 'u_image'), 0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // 4. Composite final (Soma o Bloom borrado à imagem original no framebuffer de destino)
    gl.bindFramebuffer(gl.FRAMEBUFFER, destFbo);
    gl.viewport(0, 0, this.width, this.height);

    prog = this.programs.bloomComposite;
    gl.useProgram(prog);
    gl.uniform1f(gl.getUniformLocation(prog, 'u_intensity'), cfg.intensity);

    // Textura Principal (0)
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, srcTex);
    gl.uniform1i(gl.getUniformLocation(prog, 'u_image'), 0);

    // Textura Bloom (1)
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.texBloomA);
    gl.uniform1i(gl.getUniformLocation(prog, 'u_bloom'), 1);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
};

// Vincula a variável global para acesso nos arquivos sem módulos ES6
window.PostProcessor = PostProcessor;
