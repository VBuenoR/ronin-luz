# 光 Rōnin de Luz

Um metroidvania 2D com combate RPG por turnos. Você é um samurai renegado feito de luz,
atravessando uma floresta afogada onde espíritos d'água vestem armaduras de guerreiros caídos.
Purifique-os, devore-os — ou apenas disperse-os em chuva — até alcançar o trono do Shōgun Afogado.
A floresta lembrará da sua escolha.

## Como jogar

Abra `index.html` em qualquer navegador moderno (duplo clique funciona).
Sem dependências, sem build — HTML5 Canvas e WebAudio puros.

## Controles

| Tecla | Ação |
|---|---|
| ← → / A D | mover |
| Espaço / Z | pular (e confirmar nos menus) |
| Shift / C | dash (8 direções, atravessa inimigos) |
| X / J | golpe de katana — inicia confronto **com vantagem** |
| ↑ ↓ | escalar paredes / nadar / navegar menus |
| ↓ + Espaço | descer de plataformas |
| ↓ | empunhar a Katana da Escuridão (perto dela) |
| Q | trocar de katana — no mapa e no combate (ação livre) |
| E | equipar/alternar amuleto (Sui / Ka / Fū) — **só fora de combate** |
| Espaço (no ar) | salto duplo (explosão cinemática de vento) — **exige Amuleto de Vento (Fū)** |

Na água: ↑↓ nadam, Espaço dá braçada (perto da superfície, salta para fora), o dash funciona submerso.

## O confronto (por turnos)

- **斬 Atacar** — 5 de dano base (cresce com nível e karma), 50% de crítico (dano ×2). Custa 2 EST.
- **守 Defender** — reduz o próximo dano pela metade e recupera **2 EST e 3 PM**. Defender é o que
  carrega suas magias — o ciclo é: leia a intenção, defenda no golpe pesado, gaste o PM acumulado.
- **術 Magia** — forte e cara: **盾 Defesa da Luz** desde o início;
  Purificar (7 PM); Absorver (7 PM); Rajada Sombria (5 PM); e as magias do amuleto equipado (6 PM cada):
  - **Sui (Água)**: Barragem de Água (dano + escudo) e Pulso de Água (perfura a defesa de fogo).
  - **Ka (Fogo)**: Barragem de Fogo (dano + escudo) e Incinerar (perfura e crita contra água).
  - **Fū (Vento)**: Tornado (perfura a defesa de espíritos de água).
- **逃 Fugir** — 65% de chance. Não funciona contra o chefe.

### As magias evoluem com o seu caminho

- **Caminho da luz (resiliência)**: cada purificação fortalece o sustento — toda magia de dano
  **cura +1 PV a cada 2 purificações** ao ser conjurar, e a **盾 Defesa da Luz** (6 PM, exige a
  Katana de Luz) bloqueia **75%** do próximo dano — sem fraqueza elemental — e cura **4 + ⌊purificações × 0,75⌋** PV.
- **Caminho da escuridão (dano)**: empunhar a Katana da Escuridão concede **+3 de dano mágico**, e cada absorção soma **+4 de dano** a todas as magias ofensivas.
  Rajada Sombria: 8 + mAtk; Barragens: 14 + mAtk; Pulso/Incinerar/Tornado: 16 + mAtk.

### A Fúria da Maré — defenda ou morra

Todo espírito tem dois golpes: o **soco de maré** (fraco) e a **Invocação da Maré** (12–20 de dano,
o suficiente para arrancar metade da sua vida — ou toda ela). O ícone acima do inimigo revela a
próxima intenção: **潮 pulsando é o aviso**. Defenda nesse turno ou pague o preço.
Os espíritos mantêm posturas legíveis: quem ataca, ataca duas vezes e então defende;
quem defende, defende duas vezes e então ataca.

### Reivindicando espíritos (≤20% de vida · chefes: ≤15%)

Com o inimigo **a 20% de vida ou menos** (o entalhe na barra), tanto **Purificar** quanto
**Absorver** são garantidos — **chefes resistem até 15%**. Abaixo de 50%, a chance é de 5%.
Custam 5 PM. Golpes contra um inimigo defendendo causam metade do dano — perfeito para aparar
a vida dele até a janela sem matá-lo.

**A escuridão consome**: espíritos absorvidos são apagados e **não voltam a assombrar o mapa**, restando apenas como brasas violetas. Purificados descansam para sempre como vaga-lumes dourados.
Chefes e inimigos comuns não retornam após purificados ou absorvidos.

## As duas katanas e o karma

| | 浄 Purificar (Katana de Luz) | 闇 Absorver (Katana da Escuridão) |
|---|---|---|
| Recompensa por espírito | **+3 PV máximos** (e cura) | **+4 de dano mágico** (+3 base ao empunhar) |
| Bônus de dano físico | +1 a cada **3** purificações | **+2** a cada **2** absorções |
| Extra | XP ×1,5, +2 essências, +PV +PM | XP ×1,5, +2 essências, +6 PM; a 1ª absorção desperta a **呪 Rajada Sombria**; também tem a magia **暗 Força das Trevas** (4 PM, crítico garantido nos próximos 2 turnos) |

**Racional do balanceamento** (16 espíritos no total): os exemplos originais (+5 PV / +2 dano por
purificação) dariam +22 de dano num jogo de dano base 5 — o chefe morreria em 5 golpes. Escalonei
pelos totais: o caminho da luz rende no máximo **+33 PV máx e +3 de dano** (identidade: resiliência —
sobreviver à maré); o da escuridão rende no máximo **+5 de dano físico e +22 de dano mágico**
(identidade: cañón de vidro — mata rápido, morre fácil, e a Rajada Sombria cresce a cada espírito
devorado). As magias dos amuletos também herdam o bônus mágico.

**A katana na mão importa**: Purificar exige a Katana de Luz empunhada; Absorver e Rajada Sombria
exigem a da Escuridão. **Q troca a qualquer momento** — inclusive no meio do combate, sem gastar o
turno. A aura que pulsa no inimigo enfraquecido segue a lâmina: **dourada** = pronto para purificar,
**violeta** = pronto para devorar (o entalhe na barra de vida também muda de cor).

**Corrupção**: cada espírito absorvido toma um pouco do seu corpo — o dourado da luz vai cedendo ao
violeta, fagulhas sombrias exalam de você, e com a escuridão dominante até os olhos ardem roxos.
É pura estética (o karma é quem julga), mas a floresta vê o que você está virando.

A **barra de karma** (闇 ⟷ 光) na HUD pesa cada espírito: purificar move para a luz, absorver para
a escuridão, dispersar em chuva não move nada. Com 16 espíritos, são 16 passos entre os extremos —
o epílogo muda conforme onde você parou.

## Os amuletos — um por vez

Equipe **antes** do combate (E); dentro da batalha não há troca. Cada um desbloqueia duas magias
(barreiras 14 / projéteis 16 de dano base + bônus de absorção, 6 PM):

| | 水 Sui — Amuleto da Água (Reino da Água) | 火 Ka — Amuleto de Fogo (Reino do Fogo) |
|---|---|---|
| Barreira | **Barragem de Água** — golpeia e bloqueia metade do próximo dano. *Fraca contra fogo* (só 25%). | **Barragem de Fogo** — círculo de chamas, bloqueia metade. *Fraco contra água* (só 25%). |
| Projétil | **Pulso de Água** — *perfura* a defesa de espíritos de fogo. | **Incinerar** — *perfura* a defesa de espíritos de água. |

A escolha importa: contra o Reino do Fogo, Sui dá ofensa perfurante mas defesa arriscada;
Ka dá barreira confiável mas sem perfuração — e vice-versa no Reino da Água.

## A jornada — um mundo, dois reinos

O mundo é aberto: da floresta você desce ao lago, e das **Profundezas Sem Sol** dois caminhos se
abrem — a Katana da Escuridão no fundo, e ao lado dela, **um túnel na parede oeste** que leva à
**Caverna Incandescente**: o Reino do Fogo, com piscinas de lava, espinhos de obsidiana e três
castas de espíritos de fogo, um pouco mais fortes que os d'água:

- **Vespas de Magma** (voadoras) — rajadas de 3 socos consecutivos, 3 de dano cada (ícone 連).
  Duas posturas: **3 rajadas seguidas e fadiga** (ícone 疲 — ela perde o turno e recebe dano ×1.5)
  ou **1 rajada e recuo defensivo**. *Defenda nas rajadas, castigue na exaustão*;
- **Oni de Obsidiana** (chão) — soco de brasas e ERUPÇÃO, no mesmo padrão A-A-D dos d'água;
- **Kagutsuchi, o Shōgun das Cinzas** — o chefe. Sua CHUVA DE METEOROS (26 de dano!) exige defesa.

**O despertar**: a Voz da Aurora te revive como espírito da luz. Mas logo no início da floresta,
num **templo abandonado**, uma pequena serpente de olhos roxos oferece outro caminho — *"esqueça
as mentiras que o seu Deus disse a você"* — e a **Katana da Escuridão**, num diálogo de
**Aceitar ou Negar**. Negue, e ela espera. Todos voltam.

**Os amuletos não pertencem aos chefes — pertencem ao terreno.**
- O **Sui** afundou: das profundezas do lago, uma passagem leva ao **Salão Afogado**, um labirinto
  submerso de defletores e **jatos termais** — gêiseres que avisam com bolhas e então explodem em
  colunas d'água que empurram e queimam. O amuleto repousa no fundo, ao lado de um respiradouro.
- O **Ka** arde num altar no alto do Trono das Cinzas: ponte de plataformas **sobre a cabeça do
  Kagutsuchi** + escalada em zigue-zague com espinhos.

**Suijin também afundou**: o Shōgun Afogado agora espera numa arena submersa no extremo leste do
Salão Afogado, depois de todos os jatos. O velho trono na superfície ficou para sentinelas novas.
E a antiga escalada sobre o lago agora sobe até as **Copas Sussurrantes** — plataformas entre as
árvores onde pairam os **Yūrei da Névoa**: espíritos de chapéu de palha que exalam uma névoa que
faz seus **ataques errarem 90% por 2 rodadas** (magias nunca erram — a névoa é o motivo de
existir a sua mana).

O portão do lago exige 3 essências. São **23 espíritos** pesando a balança do karma, e o
**portal da aurora só acende quando Suijin cair** — algo nas profundezas prende a floresta,
e não é um amuleto.

## Estrutura

```
index.html          casca mínima
js/utils.js         matemática, RNG determinístico
js/audio.js         SFX e ambiente 100% sintetizados (WebAudio)
js/input.js         teclado com buffer de borda
js/particles.js     partículas (fagulhas, gotas, vaga-lumes, bolhas...)
js/world.js         geometria, colisão, zonas, gruta submersa, caverna de lava, decoração
js/player.js        física metroidvania + nado + desenho do samurai de luz
js/enemies.js       espíritos d'água e de fogo (terrestres, nadadores, voadores), IA, tiers
js/battle.js        máquina de estados do combate por turnos
js/hud.js           barras, karma, banners de zona, avisos
js/main.js          loop de passo fixo, câmera, transições, telas
```
