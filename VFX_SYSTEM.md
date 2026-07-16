# Sistema modular de VFX

## Camadas

1. VFXSystem.js contem perfis de elemento e receitas de jogo. Ele nao desenha.
2. Particles.js simula particulas com pool e expoe a API legada spawn, burst, update e draw.
3. ParticleRenderer separa a renderizacao Canvas 2D em batches alfa e aditivos.
4. PostProcessor recebe somente pulsos locais para o shader WebGL; o bloom e os presets de zona continuam independentes.

## Reuso

VFX.profiles ja reserva rampas para water, fire, wind e light.
Uma escola nova deve registrar somente sua receita:

    VFX.register('vento', { cast(data) {}, impact(data) {}, barrier(data) {} });

As receitas devem apenas emitir descritores para Particles e, se necessario,
chamar VFX.distortion. Nenhuma receita deve desenhar diretamente no canvas.

## Agua

- Preparacao: lente e gotas convergentes em 15 frames.
- Disparo: 4 frames, com splash de boca de canhao e recuo do personagem.
- Voo: projeteis esticados, fitas duplas, fantasmas e oscilacao em S por 12 frames.
- Impacto: anel eliptico, espuma, gotas balisticas, poca, nevoa, squash do inimigo, hit-stop e distorcao local.
- Barragem: usa uma cortina vertical na preparacao e fixa o escudo apos o impacto.
- Fogo contra a barragem de agua evapora em nevoa, em vez de quebrar em estilhacos.

## Parede da Barragem

A Barragem agora usa um objeto persistente com os estados raise, sustain, hit,
break e collapse. O objeto fica entre jogador e inimigo durante todo o turno
adversario. A simulacao mora em VFXSystem; ParticleRenderer desenha o corpo
translucido, fluxo ascendente, crista, poca, kanji e ondas verticais de impacto.

## Limites de performance

- Maximo de 480 particulas ativas; excesso recicla a mais antiga sem shift ou splice.
- Pool limitado a 512 objetos, sem crescimento continuo durante o combate.
- Batches Canvas 2D agrupam particulas source-over e lighter, reduzindo trocas de estado.
- O pulso WebGL reutiliza um unico registro de impacto e habilita o pass de distorcao somente enquanto necessario.
