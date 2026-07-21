# PROMPT — Reino do Vento: Sprites, Ataques, VFX e Status

> Cole este prompt inteiro numa sessão nova. Ele é autocontido: descreve a engine,
> o que já existe, o que falta e o que deve ser construído, com as assinaturas
> reais das APIs do projeto.

---

## 1. Contexto do projeto

**Jogo:** *Rōnin de Luz* — metroidvania 2D com combate RPG por turnos. Você é um samurai
feito de luz. HTML5 Canvas + WebGL, **sem build, sem dependências**. Tudo é desenhado
proceduralmente por código (não há spritesheets, não há imagens).

**Pasta:** `C:\Users\João\Desktop\testingflable and gemini`
**Rodar:** servidor estático na porta 5174 (`.claude/launch.json` → config `ronin-gemini`).

**Arquitetura de renderização (híbrida):**
- A cena é desenhada num canvas 2D offscreen 960×540 (`ctx` em `main.js`).
- Esse canvas é enviado para um pipeline WebGL de pós-processamento
  (`js/PostProcessing/PostProcessor.js` + `js/Shaders/Shaders.js`): Bloom, HeatDistortion,
  ChromaticAberration, Fog, ColorGrading, FilmGrain, Vignette. Há fallback 2D automático.
- A **UI é um canvas separado** (`#game-ui`) desenhado por cima, **sem** pós-processamento —
  texto e barras nunca borram. Por isso `Battle.draw()` (cena) e `Battle.drawUI()` (interface)
  são separados.
- Presets de VFX por zona em `js/Configs/vfx_configs.js` (já existe preset `wind`).

**Arquivos relevantes:**
```
js/WindKingdom.js          ~131KB — TODO o Reino do Vento (mapa, clima, decoração, sprites de campo)
js/battle.js               ~90KB  — motor de combate por turnos (begin/update/draw/drawUI/enemyTurn)
js/enemies.js              — TIERS (stats), FieldEnemy (IA de campo), EnemyVFX (partículas de combate)
js/Graphics/Sprites.js     — sprites de BATALHA: drawElementalSamurai / drawWaterSamurai / drawFireSamurai / drawLightSamurai
js/Graphics/VFXSystem.js   — VFX modular do jogador: VFX.register('water'|'fire'|'dark'|'light'|'wind')
js/Graphics/BattleAtmosphere.js — atmosfera da arena ("pintura respirando")
js/Graphics/Particles.js   — pool de partículas (Particles.spawn/burst/draw)
js/main.js                 — loop de passo fixo 60fps, câmera, estados, exploração
```

---

## 2. O que JÁ existe do Reino do Vento (NÃO refazer)

### 2.1 Mundo e clima — `js/WindKingdom.js`
Um módulo grande e auto-instalável (faz *wrapping* de `World.init`, `World.solidList`,
`World.drawBackground`, `World.palette`, `World.drawWorld`, `Lighting.draw`,
`Player.prototype.update`, `FieldEnemy.prototype.draw`). **Preserve esse padrão de wrapping.**

Já implementado e funcionando:
- **Mapa `'vento'`** registrado em `World.maps.vento` — império suspenso, vertical, com
  ruínas, torres, correntes escaláveis, pontes partidas, moinhos, estátuas, sinos.
- **Ciclo de ventania** em tempo (segundos): `phase` = `calm → warn → gust`
  (`CALM_MIN/CALM_MAX`, `WARN`, `GUST`), com `windPower()` (0..1, ataque e decaimento suaves),
  `windZones[]` (direção + força), `zoneAt(x,y)`, `sheltered(p, dir)` (abrigo atrás de sólidos),
  `flipWind(mill)` (moinhos giram a direção do vento).
- **Sinais telegrafados:** bandeiras mudam de direção, nuvens aceleram, linhas de vento,
  poeira/folhas carregadas, setas na borda da tela, aviso "VENTANIA SE APROXIMANDO", som crescente.
- **Parkour:** plataformas móveis (`movers`, algumas `gust: true` — só se movem na rajada),
  `updrafts` (coluna de vento), plataformas fantasma, correntes escaláveis.
- **Colecionáveis/segredos:** `windAmulet` (Fū), `compass`, `phoenixFeathers` (planar).
- **Portal de retorno** para a floresta e `travel(target)`.
- **Sprites de CAMPO:** `WindKingdom.drawWindSamurai(ctx,x,y,s,tier,o)` e
  `WindKingdom.drawStormSpirit(ctx,x,y,s,tier,o)` — usados **apenas** no wrapper de
  `FieldEnemy.prototype.draw` (fim do arquivo).

### 2.2 Stats já registrados — `WindKingdom.install()`
```js
TIERS[8]  = { name:'Espírito do Vento',      short:'o Espírito do Vento', hp:60,  soco:10, mare:20, xp:55,  kanji:'鳥', element:'vento', fly:true, dodge:0.3 };
TIERS[12] = { name:'Espírito da Tempestade', short:'a Tempestade',        hp:85,  soco:12, mare:26, xp:70,  kanji:'雷', element:'vento', fly:true, storm:true };
TIERS[13] = { name:'Rei do Vento',           short:'o Rei do Vento',      hp:260, soco:14, mare:24, xp:200, kanji:'嵐', element:'vento', boss:true, dodge:0.22 };
```
Inimigos já instanciados no mapa `'vento'` (3× tier 8, 2× tier 12, 1× tier 13 chefe).

### 2.3 Batalha — o que já está pronto
- `Battle.begin()` define `this.env = 'wind'` quando `fieldEnemy.map === 'vento'`.
- `drawBg()` já tem cores e um ramo `env === 'wind'`; `vfx_configs.js` já tem preset `wind`.
- Falas de entrada do vento já existem ("Os céus inteiros giram — o Rei do Vento desce…").
- `VFX.register('wind', …)` já existe (é a magia **Tornado** do jogador, do amuleto Fū).
- Campos `this.playerParaT = 0` e `this.playerTrapped = 0` já foram criados em `begin()`
  (**declarados, mas nada os usa ainda**).

---

## 3. OS GAPS (o que está quebrado/faltando) — a razão deste prompt

1. **Sprites de batalha do vento não existem.** `js/battle.js:1840`:
   ```js
   const drawEnemyFn = this.E.element === 'fogo' ? drawFireSamurai : drawWaterSamurai;
   ```
   → Os três inimigos de vento aparecem em combate como **samurais de ÁGUA**.
   Os sprites de vento existem só no campo, dentro de `WindKingdom.js`.

2. **Nenhum ataque de vento.** `Battle.ensureScript()` não tem ramo para `element === 'vento'`:
   - O **Rei do Vento** cai no script genérico `['soco','mare','defend','charge','tsunami']`
     → executa **TSUNAMI** com fala de água.
   - **Espírito do Vento** e **Tempestade** têm `fly: true` → herdam o script da *Vespa de Magma*
     (`['multi','multi','multi','fatigue']`) com falas de brasas/fogo.
   - Nenhum dos ataques do design (Corte do Vendaval, Investida Aérea, Tornado, Prisão de Vento,
     Tempestade Suprema, Tempestade Paralisante) existe.

3. **Telegráficos sem vocabulário de vento.** O mapa `info` (em `drawUI`) só tem variantes
   água/fogo → inimigos de vento mostram "MARÉ — DEFENDA" / "TSUNAMI — DEFENDA".

4. **Paralisia não existe.** `playerParaT` está declarado e nunca lido.

5. **`EnemyVFX.style()`** não conhece vento → partículas de ambiente/hit/guard/cast saem
   na paleta ciano de água.

6. **`ult` errado para o chefe do vento.** Em `begin()`:
   `const scaledUlt = Math.round((fieldEnemy.tier === 10 ? 31 : 26) * scaleDmg);`
   → o Rei do Vento (tier 13) recebe 26 (valor do tsunami de água).

7. **Sem dados de habilidade** nos tiers 8/12/13 (só hp/soco/mare/xp).

---

## 4. A TAREFA

Implemente, **de forma modular e sem quebrar os outros dois reinos**, três frentes:

### FRENTE A — Sprites de BATALHA (novos, distintos dos de campo)

> No projeto, sprite de campo ≠ sprite de batalha. Campo: escala ~1.05–2.4, poses
> `idle`/`walk`, silhueta pequena e legível a distância. Batalha: escala `eScale()`
> (chefe 3.4), poses ricas — `idle`, `walk`, `attack`, `defend`, `magic`, `charge`, `hurt` —
> com detalhe, flash de dano, aura de reivindicação e dissolve.

Crie os sprites de batalha do vento seguindo o contrato de `drawElementalSamurai`
(`js/Graphics/Sprites.js`):

```js
drawXSamurai(ctx, x, y, s, tier, o)
// o = { t, pose, facing, alpha, flash, aura, auraCol, armT }
// (x,y) = pés · escala já aplicada via s · voadores usam hover interno
```

Requisitos:
- **Espírito do Vento (tier 8)** — pássaro-samurai elegante: falcão + garça + corvo.
  Penas brancas e azuladas, armadura leve de samurai, **katana feita do próprio vento**
  (lâmina translúcida, espiralada). Postura nobre; asas abrem no ataque, recolhem na defesa.
- **Espírito da Tempestade (tier 12)** — mais monstruoso: corpo de nuvens escuras,
  relâmpagos internos, núcleo de energia azul. Sem forma humanoide fixa; agregado de nuvens
  pulsando. Na `charge`, uma **esfera elétrica** cresce visivelmente (é o telegráfico da
  Tempestade Paralisante).
- **Rei do Vento (tier 13)** — versão majestosa e corrompida do pássaro-samurai: maior,
  coroa/penacho dourado envelhecido, capa esfarrapada, dois ventos orbitando.
  Precisa de um **estado visual de 2ª fase** (`o.stormPhase`): céu escurece, olhos elétricos,
  aura de tempestade.
- Os três devem ler em **silhueta preta 100%** e se distinguir entre si.
- **Reaproveite a linguagem**: aura de reivindicação (`o.aura`/`o.auraCol`), `o.flash`,
  `o.alpha` (dissolve) — igual aos outros elementos, senão purificar/absorver quebram visualmente.

**Wire obrigatório em `js/battle.js`** (o gap nº 1) — troque o despacho por algo como:
```js
const drawEnemyFn = this.E.element === 'vento'
    ? (this.E.storm ? drawStormBattleSprite : drawWindBattleSprite)
  : this.E.element === 'fogo' ? drawFireSamurai
  : drawWaterSamurai;
```
Exponha os novos sprites em `window.` (padrão do projeto: `window.drawWaterSamurai = …`).

### FRENTE B — Ataques, IA e status

Adicione um ramo `element === 'vento'` em `Battle.ensureScript()` e as novas ações em
`Battle.enemyTurn()`. **Padrão do motor:** cada ação empurra passos na fila com
`this.push({ dur, msg, on, upd })` e termina em `this.afterEnemy()`.

Dano ao jogador: `this.hitPlayer(base, kind, big)` — `kind` ∈ `'agua'|'fogo'|'fisico'`.
**Adicione `'vento'`** como kind (cor, floater, e a interação com as barragens:
hoje água↔fogo se anulam; defina o comportamento do vento — sugestão: vento **não** é
anulado por nenhuma barragem, mas a Defesa da Luz (75%) funciona normalmente).

#### Espírito do Vento (tier 8) — pune posicionamento
| Ação | Efeito | Telegráfico |
|---|---|---|
| `corte_aereo` | mergulha, corta e **recua imediatamente** (2 golpes rápidos) | `連 RAJADA — DEFENDA` |
| `rajada` | sopro que **afasta**: o próximo ataque físico do jogador erra 50% (1 rodada) | `風 RAJADA — USE MAGIA` |
| `esquiva` | recua no ar: **ataques físicos do jogador erram** naquele turno (usa `dodge: 0.3`) | `翔 ESQUIVA — MAGIA ACERTA` |
| `defend` | guarda com as asas | `守 DEFESA — DANO REDUZIDO` |

Script sugerido: `['corte_aereo','esquiva','rajada','defend']` embaralhado em 2–3 padrões.

#### Espírito da Tempestade (tier 12) — controle e paralisia
| Ação | Efeito | Telegráfico |
|---|---|---|
| `raio` | dano elétrico direto | `雷 RAIO — DEFENDA` |
| `explosao` | explosão elétrica em área, dano médio | `爆 EXPLOSÃO — DEFENDA` |
| `charge_orb` | cria a esfera elétrica (não causa dano; é o aviso) | `球 CARGA — DEFENDA` |
| `paralisante` | **Tempestade Paralisante**: raio concentrado; se acertar, **chance de Paralisia** | `痺 PARALISANTE — DEFENDA` |

**Paralisia** (use o `this.playerParaT` já declarado; dura **2 rodadas**):
- Traduza os efeitos do design (movimento reduzido, dash indisponível, ataque mais lento)
  para a gramática de turnos:
  - **Dash indisponível** → a opção **Fugir** fica bloqueada.
  - **Velocidade de ataque reduzida** → `Atacar` custa **+2 EST** (4 em vez de 2)
    e perde o crítico de 50% (crítico só via Força das Trevas).
  - **Movimento reduzido** → sem esquiva; o jogador não pode Defender **e** conjurar no mesmo turno
    (ou: a Defesa reduz só 25% em vez de 50%).
- Defender **durante** o telegráfico `痺` deve reduzir a chance de paralisia (recompense a leitura).
- Mostre o contador de rodadas na tela (padrão do 霧 da névoa, em `Battle.draw`) e um
  aviso curto no `drawUI`.

#### Rei do Vento (tier 13) — o maior teste
Implemente os 5 ataques do design, com **2 fases**:

| Ação | Efeito | Telegráfico |
|---|---|---|
| `vendaval` | Corte do Vendaval: lâminas de vento rápidas (2 cortes) | `斬 VENDAVAL — DEFENDA` |
| `investida` | Investida Aérea: **desaparece**, reaparece acima do jogador, mergulha | `翔 INVESTIDA — DEFENDA` |
| `tornado` | Tornados atravessam a arena: dano + empurrão | `旋 TORNADO — DEFENDA` |
| `prisao` | Prisão de Vento: correntes circulares prendem o jogador | `牢 PRISÃO — ESCAPE` |
| `suprema` | **Tempestade Suprema** (2ª fase, ≤35% vida): céu escurece, vários tornados | `嵐 SUPREMA — DEFENDA` |

- **Prisão de Vento**: o jogador deve escapar. Traduza para turnos: enquanto preso
  (`playerTrapped`), o menu vira **`[Escapar, Magia]`**; `Escapar` tem chance (ex. 60%,
  +20% se tiver estamina cheia); enquanto preso, sofre dano leve por rodada.
- **2ª fase (`stormPhase`)**: ao cair ≤35%, uma sequência cinematográfica —
  céu escurece, raios, ventos aceleram; a partir daí os scripts ficam mais densos
  (ex.: `['tornado','vendaval','suprema','investida','prisao']`) e o `ult` sobe.
- Corrija o `scaledUlt`: dê ao tier 13 um valor próprio (sugestão base **34**, aplicando
  `scaleDmg`), já que hoje ele herda 26 (tsunami de água).
- O Rei **não fica parado**: use `this.anim.ex` / `Game.cam` (zoom/offset) para vendê-lo
  se movendo pela arena; a `investida` deve sumir e reaparecer (jogue com `o.alpha`).

**Regra de ouro (do `ART_DIRECTION_PASS_01.md`):** o telegráfico **não** altera dano,
probabilidade ou progressão — ele só torna visível a estratégia que o sistema já exige.
Todo golpe pesado deve ser anunciado **antes** do turno inimigo, com kanji + rótulo curto.

### FRENTE C — VFX, status e paleta

1. **`EnemyVFX.style(enemy)`** (`js/enemies.js`): adicione o ramo `vento`.
   Paleta do reino: **branco, cinza, azul-claro, dourado envelhecido, verde musgo**.
   Sugestão: `core:'rgba(240,248,255,0.96)'`, `accent:'rgba(150,200,245,0.92)'`,
   `soft:'rgba(200,225,245,0.45)'`. A Tempestade (tier 12) merece variante elétrica
   mais escura/azulada.
2. **VFX dos ataques**: use o vocabulário existente —
   `EnemyVFX.attack/cast/guard/charge/hit(enemy, x, y, …)` e `Particles.spawn/burst`.
   Se criar um perfil novo no `VFXSystem`, siga `VFX.register(name, recipe)` com as fases
   `prepare/cast/impact` e **pooling** (o sistema já é pool-based; não aloque por frame).
3. **Efeitos de tela** (na cena, `Battle.draw`, nunca na UI):
   - tornados atravessando a arena (silhueta espiral, empurrão visual);
   - lâminas de vento (linhas finas rápidas);
   - relâmpagos (flash curto de 1–2 frames + veias);
   - na Tempestade Suprema: escurecer o céu via `BattleAtmosphere.setDarkness(…)` e vários
     tornados simultâneos.
4. **Ajuste de modelos/escala**: `eScale()` hoje é
   `this.E.isBoss ? 3.4 : 1.75 + Math.min(this.E.tier, 6) * 0.15` → tiers 8/12 caem no teto
   (2.65). Verifique se a proporção fica boa para os corpos de vento; ajuste se necessário
   **sem** alterar a escala dos reinos existentes.

---

## 5. Contratos de API que você DEVE usar (assinaturas reais)

```js
// fila de passos do combate (tudo é encadeado assim)
this.push({ dur: 40, msg: 'texto', on: () => {…}, upd: (k) => {…} });

// dano no jogador · kind: 'agua'|'fogo'|'fisico' (+ 'vento' a criar) · big = golpe pesado
this.hitPlayer(base, kind, big);

// número/status flutuante
this.floater(x, y, txt, color, big);

// posições fixas da arena
this.PX, this.PY   // Rōnin
this.EX, this.EY   // inimigo
this.eScale()      // escala do sprite inimigo

// partículas (pool — nunca crie arrays por frame)
Particles.spawn({ x, y, vx, vy, life, size, color, type, grav, drag, layer });
Particles.burst(x, y, n, () => ({ … }));
// type: 'orb'|'wisp'|'spark'|'drop'|'ring'|'leaf'|'firefly'|'foam'|'mist'…

// VFX do inimigo
EnemyVFX.attack(enemy, x, y, tx, ty, travel, heavy);
EnemyVFX.cast(enemy, x, y, tx, ty, travel, heavy);
EnemyVFX.guard(enemy, x, y);  EnemyVFX.charge(enemy, x, y);
EnemyVFX.hit(enemy, x, y, heavy);  EnemyVFX.fatigue(enemy, x, y);

// câmera / impacto
Game.cam.zoom · Game.cam.targetZoom · Game.cam.targetOffsetX/Y · Game.freezeFrames
this.shake · this.shakeX · this.shakeY

// atmosfera da arena
BattleAtmosphere.setDarkness(0..1);  BattleAtmosphere.impactFlash();

// áudio 100% sintetizado (WebAudio) — crie os sons do vento em js/Utilities/audio.js
Sfx.tone({ f, f2, dur, type, vol, delay });
Sfx.noise({ dur, vol, fc, fc2, type, q, delay });
```

---

## 6. Regras inegociáveis

- **Não quebrar os reinos da Água e do Fogo.** Todo `if` novo deve ser aditivo.
- **Preserve o padrão de wrapping** do `WindKingdom.js` (o módulo se auto-instala sobre
  `World`/`Player`/`FieldEnemy`) — há edições concorrentes nesta pasta; código isolado sobrevive.
- **Tempo em segundos** para animações contínuas (o `WindKingdom` já usa acumulador próprio).
  O combate usa fila de passos com `dur` em frames (60fps) — mantenha o padrão do arquivo.
- **UI nunca na cena**: texto/barras/telegráficos vão no canvas de UI (`Battle.drawUI`).
  Efeitos de vento/relâmpago vão na cena (`Battle.draw`).
- **Nada de spritesheets ou imagens** — tudo procedural em Canvas 2D.
- **Performance**: pooling, sem alocação por frame, sem `shift/splice` em loops quentes.
- **Legibilidade tática acima do espetáculo**: o efeito nunca pode cobrir a barra de vida
  do inimigo nem o telegráfico; pico de brilho ≤ 4 frames.
- **Sem tutorial**: o jogo ensina pelo telegráfico e pela leitura do ambiente.
- Textos do jogo em **português**; comentários no código em português, explicando o *porquê*.

---

## 7. Critérios de aceite (verifique antes de entregar)

1. `node --check` passa em todos os arquivos alterados.
2. Em combate no Reino do Vento, os três inimigos aparecem com **sprites próprios de vento**
   (nenhum samurai de água/fogo na tela).
3. Cada um dos três executa **apenas ataques de vento**, com falas coerentes
   (zero menção a maré/tsunami/brasas).
4. Todo golpe pesado mostra kanji + rótulo antes do turno inimigo.
5. **Paralisia** e **Prisão de Vento** alteram o menu/custos de fato e mostram as rodadas restantes.
6. O Rei do Vento entra em **2ª fase** ≤35% de vida, com mudança visível de céu e script.
7. Purificar/Absorver continuam funcionando nos inimigos de vento (limiar 20%; chefe 15%),
   com a aura de reivindicação na cor da katana empunhada.
8. Sem erros no console; a batalha desenha `draw()` + `drawUI()` por muitos frames sem exceção.

**Como verificar sem depender do preview** (o painel embutido congela o loop rAF):
abra `http://localhost:5174` e rode no console/eval algo como:
```js
const B = window.GAME.Battle, E = window.GAME.Enemies, G = window.GAME.Game;
const foe = E.list.find(e => e.map === 'vento' && e.tier === 13); // Rei do Vento
B.begin(foe, 'player'); G.state = 'battle';
for (let i = 0; i < 400 && B.q.length; i++) B.update();
const off = document.createElement('canvas'); off.width = 960; off.height = 540;
B.draw(off.getContext('2d'), 60); B.drawUI(off.getContext('2d'), 60);   // não pode lançar
```
