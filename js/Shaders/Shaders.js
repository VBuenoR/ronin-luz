'use strict';

/**
 * Biblioteca de Shaders GLSL ES 1.00 para Rōnin de Luz.
 * Contém o Vertex Shader padrão e todos os Fragment Shaders modularizados.
 */
const Shaders = {
  // Vertex Shader padrão (quad que cobre a tela de -1 a 1)
  VS: `
    attribute vec2 a_position;
    varying vec2 v_texCoord;
    void main() {
      v_texCoord = a_position * 0.5 + 0.5;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `,

  // Pass-through simples (copia a textura)
  PassThrough: `
    precision mediump float;
    varying vec2 v_texCoord;
    uniform sampler2D u_image;
    void main() {
      gl_FragColor = texture2D(u_image, v_texCoord);
    }
  `,

  // Brightness Threshold (extrai pixels brilhantes para o Bloom)
  Bright: `
    precision mediump float;
    varying vec2 v_texCoord;
    uniform sampler2D u_image;
    uniform float u_threshold;
    void main() {
      vec4 color = texture2D(u_image, v_texCoord);
      // Calcula a luminância usando coeficientes padrão de percepção humana
      float brightness = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
      if (brightness > u_threshold) {
        gl_FragColor = vec4(color.rgb, 1.0);
      } else {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      }
    }
  `,

  // Gaussian Blur de 5 passos (H ou V com base no u_dir)
  Blur: `
    precision mediump float;
    varying vec2 v_texCoord;
    uniform sampler2D u_image;
    uniform vec2 u_resolution;
    uniform vec2 u_dir; // (1.0, 0.0) ou (0.0, 1.0)
    
    void main() {
      vec2 tc = v_texCoord;
      vec2 offset = u_dir / u_resolution;
      
      vec4 sum = vec4(0.0);
      sum += texture2D(u_image, tc - offset * 2.0) * 0.0613;
      sum += texture2D(u_image, tc - offset) * 0.2447;
      sum += texture2D(u_image, tc) * 0.3877;
      sum += texture2D(u_image, tc + offset) * 0.2447;
      sum += texture2D(u_image, tc + offset * 2.0) * 0.0613;
      
      gl_FragColor = vec4(sum.rgb, 1.0);
    }
  `,

  // Mescla o Bloom de volta na textura principal
  BloomComposite: `
    precision mediump float;
    varying vec2 v_texCoord;
    uniform sampler2D u_image;     // imagem original
    uniform sampler2D u_bloom;     // imagem borrada
    uniform float u_intensity;
    void main() {
      vec4 base = texture2D(u_image, v_texCoord);
      vec4 bloom = texture2D(u_bloom, v_texCoord);
      // Blending aditivo suave para manter fidelidade
      gl_FragColor = vec4(base.rgb + bloom.rgb * u_intensity, base.a);
    }
  `,

  // Distorção global de calor + pulso local de impacto.
  HeatDistortion: `
    precision mediump float;
    varying vec2 v_texCoord;
    uniform sampler2D u_image;
    uniform float u_time;
    uniform float u_speed;
    uniform float u_strength;
    uniform float u_frequency;
    uniform vec2 u_impactCenter;
    uniform vec2 u_impactDirection;
    uniform float u_impactRadius;
    uniform float u_impactStrength;
    uniform float u_impactProgress;
    void main() {
      float offset = sin(v_texCoord.y * u_frequency + u_time * u_speed) * u_strength;
      vec2 distortedCoord = vec2(v_texCoord.x + offset, v_texCoord.y + offset * 0.5);

      vec2 delta = v_texCoord - u_impactCenter;
      float distanceToImpact = length(delta);
      float localMask = 1.0 - smoothstep(u_impactRadius * 0.22, u_impactRadius, distanceToImpact);
      vec2 radial = normalize(delta + vec2(0.0001, 0.0001));
      float ripple = sin(distanceToImpact * 96.0 - u_impactProgress * 15.0);
      vec2 localOffset = radial * ripple * u_impactStrength * localMask;
      localOffset += u_impactDirection * ripple * u_impactStrength * localMask * 0.32;
      distortedCoord += localOffset;
      gl_FragColor = texture2D(u_image, distortedCoord);
    }
  `,

  // Aberração Cromática (separa canais RGB)
  ChromaticAberration: `
    precision mediump float;
    varying vec2 v_texCoord;
    uniform sampler2D u_image;
    uniform vec2 u_offset; // deslocamento em coordenadas UV
    void main() {
      float r = texture2D(u_image, v_texCoord + u_offset).r;
      float g = texture2D(u_image, v_texCoord).g;
      float b = texture2D(u_image, v_texCoord - u_offset).b;
      float a = texture2D(u_image, v_texCoord).a;
      gl_FragColor = vec4(r, g, b, a);
    }
  `,

  // Color Grading (ajuste de contraste, saturação, brilho e tonalização quente/fria)
  ColorGrading: `
    precision mediump float;
    varying vec2 v_texCoord;
    uniform sampler2D u_image;
    uniform float u_brightness; // padrão = 1.0
    uniform float u_contrast;   // padrão = 1.0
    uniform float u_saturation; // padrão = 1.0
    uniform vec3 u_tint;        // cor para tonalização (padrão = vec3(1.0))
    void main() {
      vec4 color = texture2D(u_image, v_texCoord);
      
      // Brilho
      vec3 brt = color.rgb * u_brightness;
      
      // Contraste
      vec3 avgLuminance = vec3(0.5);
      vec3 con = mix(avgLuminance, brt, u_contrast);
      
      // Saturação
      float gray = dot(con, vec3(0.2126, 0.7152, 0.0722));
      vec3 sat = mix(vec3(gray), con, u_saturation);
      
      // Tint (Tonalização)
      vec3 finalColor = sat * u_tint;
      
      gl_FragColor = vec4(finalColor, color.a);
    }
  `,

  // Film Grain (procedural dinâmico de baixo ruído)
  FilmGrain: `
    precision mediump float;
    varying vec2 v_texCoord;
    uniform sampler2D u_image;
    uniform float u_time;
    uniform float u_amount;
    
    // Função de ruído pseudo-aleatório rápido
    float rand(vec2 co) {
      return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec4 color = texture2D(u_image, v_texCoord);
      // Gera ruído baseado na posição e no tempo
      float noise = (rand(v_texCoord + vec2(u_time * 0.01, u_time * 0.02)) - 0.5) * u_amount;
      gl_FragColor = vec4(color.rgb + noise, color.a);
    }
  `,

  // Vignette (foco nas bordas sem esmagar a leitura da cena)
  Vignette: `
    precision mediump float;
    varying vec2 v_texCoord;
    uniform sampler2D u_image;
    uniform float u_intensity; // força do escurecimento, 0.0 a 1.0
    uniform float u_smoothness; // distância em que a borda termina de fechar
    void main() {
      vec4 color = texture2D(u_image, v_texCoord);
      // Calcula distância do centro UV (0.5, 0.5)
      vec2 uv = v_texCoord - vec2(0.5);
      float dist = length(uv);
      
      // A versão anterior usava smoothstep com bordas invertidas. Além de ser
      // indefinido em GLSL, ela levava a vinheta quase ao preto nas extremidades,
      // apagando HUD e silhuetas. Separamos alcance e força: o foco permanece,
      // mas a informação de jogo continua legível.
      float edge = smoothstep(u_smoothness - 0.35, u_smoothness, dist);
      float vig = 1.0 - edge * u_intensity;
      gl_FragColor = vec4(color.rgb * vig, color.a);
    }
  `,

  // Fog (Névoa de profundidade horizontal / vertical simulada)
  Fog: `
    precision mediump float;
    varying vec2 v_texCoord;
    uniform sampler2D u_image;
    uniform vec3 u_fogColor;
    uniform float u_density;
    uniform float u_startHeight; // 0.0 = base da tela, 1.0 = topo
    void main() {
      vec4 color = texture2D(u_image, v_texCoord);
      
      // A densidade cresce do topo para a base da tela (coordenada Y vai de 0 a 1)
      // v_texCoord.y = 0.0 é o topo no WebGL, 1.0 é a base
      float factor = smoothstep(u_startHeight, 1.0, v_texCoord.y) * u_density;
      
      vec3 finalColor = mix(color.rgb, u_fogColor, factor);
      gl_FragColor = vec4(finalColor, color.a);
    }
  `
};

// Vincula o Shaders à variável global (acessada pelos outros arquivos sem módulos ES6)
window.Shaders = Shaders;
