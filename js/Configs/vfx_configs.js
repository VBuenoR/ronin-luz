'use strict';

/**
 * Biblioteca de Configurações de VFX e Pós-Processamento.
 * Contém presets artísticos dinâmicos para cada zona / reino do jogo.
 */
const VFXConfigs = {
  activePreset: null,

  // Presets de pós-processamento por zona
  presets: {
    forest: {
      Bloom: { active: true, threshold: 0.8, intensity: 0.45 },
      HeatDistortion: { active: false },
      WindAtmosphere: { active: false },
      WindMotion: { active: false },
      ChromaticAberration: { active: true, offsetX: 0.001, offsetY: 0.0 },
      ColorGrading: { active: true, brightness: 1.02, contrast: 1.02, saturation: 1.05, tint: [1.0, 1.0, 1.0] },
      FilmGrain: { active: true, amount: 0.02 },
      Vignette: { active: true, intensity: 0.35, smoothness: 0.7 },
      Fog: { active: false }
    },
    abyss: {
      Bloom: { active: true, threshold: 0.76, intensity: 0.46 },
      HeatDistortion: { active: false },
      WindAtmosphere: { active: false },
      WindMotion: { active: false },
      ChromaticAberration: { active: true, offsetX: 0.0016, offsetY: 0.0008 }, // Mais dispersão debaixo d'água
      ColorGrading: { active: true, brightness: 1.03, contrast: 1.03, saturation: 0.94, tint: [0.88, 1.0, 1.12] },
      FilmGrain: { active: true, amount: 0.03 },
      Vignette: { active: true, intensity: 0.36, smoothness: 0.68 },
      Fog: { active: true, color: [0.03, 0.09, 0.2], density: 0.22, startHeight: 0.24 }
    },
    lava: {
      Bloom: { active: true, threshold: 0.75, intensity: 0.75 }, // Muito brilho no magma
      HeatDistortion: { active: true, speed: 3.2, strength: 0.0035, frequency: 18.0 }, // Ar ondulando por calor
      WindAtmosphere: { active: false },
      WindMotion: { active: false },
      ChromaticAberration: { active: true, offsetX: 0.0012, offsetY: 0.0 },
      ColorGrading: { active: true, brightness: 1.04, contrast: 1.06, saturation: 1.18, tint: [1.16, 0.94, 0.86] }, // Tom quente alaranjado
      FilmGrain: { active: true, amount: 0.04 }, // Mais ruído simulando cinzas/fumaça
      Vignette: { active: true, intensity: 0.42, smoothness: 0.66 },
      Fog: { active: true, color: [0.3, 0.12, 0.06], density: 0.28, startHeight: 0.32 } // Fumaça/poeira vulcânica
    },
    wind: {
      // Os dois passes extras so' rodam neste mapa e reutilizam os buffers existentes.
      Bloom: { active: true, threshold: 0.92, intensity: 0.20 },
      HeatDistortion: { active: false },
      WindAtmosphere: {
        active: true, strength: 0.18, direction: 1,
        cloudColor: [0.84, 0.9, 0.95], cloudOpacity: 0.075
      },
      WindMotion: { active: true, strength: 0.00035, direction: 1 },
      ChromaticAberration: { active: false, offsetX: 0.0, offsetY: 0.0 },
      ColorGrading: { active: true, brightness: 1.03, contrast: 0.98, saturation: 0.88, tint: [0.96, 1.02, 1.05] },
      FilmGrain: { active: true, amount: 0.012 },
      Vignette: { active: true, intensity: 0.22, smoothness: 0.74 },
      Fog: { active: true, color: [0.84, 0.9, 0.95], density: 0.09, startHeight: 0.28 }
    }
  },

  /**
   * Aplica dinamicamente as configurações de pós-processamento do preset de uma zona
   * @param {string} zone - Nome do preset ('forest', 'abyss', 'lava', 'wind')
   */
  applyPreset(zone) {
    const preset = this.presets[zone];
    if (!preset || !window.PostProcessor) return;
    if (this.activePreset === zone) return;

    const C = window.PostProcessor.Config;
    
    // Atualiza apenas os parâmetros do preset, mantendo a estrutura original
    for (const effect in preset) {
      if (C[effect]) {
        Object.assign(C[effect], preset[effect]);
      }
    }
    this.activePreset = zone;
  }
};

// Vincula a variável global
window.VFXConfigs = VFXConfigs;
