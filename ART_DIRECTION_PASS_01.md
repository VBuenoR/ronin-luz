# Rōnin de Luz — Passe de Direção de Arte 01

## Objetivo

Preservar o contraste central da obra — uma luz frágil atravessando a floresta afogada — sem sacrificar a leitura de recursos, ataques e decisões de turno.

## Gramática visual consolidada

| Elemento | Direção | Função de jogo |
| --- | --- | --- |
| Luz do Rōnin | marfim `#ffe9b0`, ouro quente e halo curto | ponto focal e segurança visual do jogador |
| Água / espíritos | ciano elétrico, azul profundo e brilho frio | ameaça fluida, legível contra os tons orgânicos da floresta |
| Escuridão | violeta dessaturado | corrupção e poder sem confundir com inimigos de água |
| Perigo tático | ciano de maré ou laranja vulcânico, sempre acompanhado de texto | torna a resposta correta imediata antes do turno inimigo |

## VFX e composição

- A vinheta fecha a composição nas bordas, mas agora controla **força** e **alcance** separadamente. Ela nunca deve transformar HUD, silhuetas ou objetivos em preto absoluto.
- O punch zoom pertence somente à arena: personagens, onda, golpes e partículas podem ganhar escala; a interface nunca deve sair da área segura.
- Presets de pós-processamento só são aplicados quando a zona muda. A floresta permanece etérea, o abismo perde saturação e fecha a luz, e a lava aumenta bloom e distorção térmica.

## Telegráficos de combate

O kanji continua sendo a assinatura do inimigo. O rótulo curto logo abaixo da barra de vida resolve a decisão tática:

- `GOLPE`
- `MARÉ — DEFENDA` / `ERUPÇÃO — DEFENDA`
- `RAJADA — DEFENDA`
- `CARGA — DEFENDA`
- `TSUNAMI — DEFENDA` / `METEOROS — DEFENDA`
- `FADIGA — CASTIGUE`
- `NÉVOA — USE MAGIA`
- `DEFESA — DANO REDUZIDO`

Esse texto não altera scripts, dano, probabilidades ou progressão; apenas deixa visível a estratégia que o sistema já exige.
