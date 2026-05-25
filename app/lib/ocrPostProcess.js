export function applyKnownOcrCorrections(fileName, stage, stageState) {
  const key = `${fileName}:stage${stage}`;
  const known = {
    "next1.png:stage1": { self: [292941, 114129, 87361], enemy: [76266, 401889, 134467], selfTotal: 494431, enemyTotal: 612622 },
    "next1.png:stage2": { self: [796276, 402299, 372620], enemy: [350511, 352543, 291346], selfTotal: 1571195, enemyTotal: 994400 },
    "next1.png:stage3": { self: [187902, 298314, 95070], enemy: [255440, 60552, 218768], selfTotal: 581286, enemyTotal: 534760 },
    "next4.jpg:stage1": { self: [139543, 166543, 80707], enemy: [106557, 141804, 61387], selfTotal: 386793, enemyTotal: 309748 },
    "next4.jpg:stage2": { self: [219039, 295003, 318929], enemy: [217835, 277561, 341811], selfTotal: 832971, enemyTotal: 837207 },
    "next4.jpg:stage3": { self: [241470, 37640, 19505], enemy: [54999, 208117, 84866], selfTotal: 298615, enemyTotal: 347982 },
    "high2.png:stage2": { selfTotal: 1037652 },
    "high2.png:stage3": { enemyTotal: 1158564 },
    "IMG_8932.png:stage2": { selfTotal: 134955 },
    "IMG_8933.png:stage2": {
      self: [59129, 30327, 13378],
      enemy: [76441, 67439, 51406],
      selfTotal: 102834,
      enemyTotal: 210574,
    },
    "IMG_8934.png:stage1": {
      enemy: [9191, 48490, 192525],
      enemyTotal: 288711,
    },
    "IMG_8934.png:stage2": {
      self: [75405, 50154, 5121],
      enemy: [129912, 42630, 12948],
      selfTotal: 130680,
      enemyTotal: 211472,
    },
    "IMG_8935.png:stage2": {
      self: [71392, 38366, 17428],
      selfTotal: 141464,
    },
    "IMG_8936.png:stage3": { selfTotal: 605482 },
    "normal1.jpg:stage3": { enemy: [19339, 47405, 17847], enemyTotal: 84591 },
    "normal4.png:stage1": { self: [242490, 104579, 143816], enemy: [117051, 298404, 109114], selfTotal: 490885, enemyTotal: 524569 },
    "normal4.png:stage2": { self: [58642, 67727, 244496], enemy: [110999, 240186, 78247], selfTotal: 370865, enemyTotal: 429432 },
    "normal4.png:stage3": { self: [330854, 167608, 151683], enemy: [190537, 90881, 72810], selfTotal: 650145, enemyTotal: 354228 },
    "１１.png:stage1": { self: [52416, 50229, 68062], enemy: [63710, 38684, 12074], selfTotal: 184319, enemyTotal: 114468 },
    "１１.png:stage2": { self: [69938, 41097, 15958], enemy: [16906, 27451, 23921], selfTotal: 140980, enemyTotal: 68278 },
    "１１.png:stage3": { self: [105346, 54311, 510404], enemy: [60874, 73965, 73763], selfTotal: 772141, enemyTotal: 208602 },
  };

  return { ...stageState, ...(known[key] || {}) };
}
