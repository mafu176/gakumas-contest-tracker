export const API_URL =
  "https://script.google.com/macros/s/AKfycbw8ZzyxQZlo30bMRRsjXkvnd0VweAaPVfiFIVIWLnkBFTqOME_OJgaS3L7obbfNmaHl/exec";

export const stages = [1, 2, 3];

export const members = [1, 2, 3];

export const mySlots = stages.flatMap((stage) =>
  members.map((member) => `自分 ステージ${stage} メンバー${member}`)
);

export const enemySlots = stages.flatMap((stage) =>
  members.map((member) => `相手 ステージ${stage} メンバー${member}`)
);

export const slotGroups = [
  { title: "自分編成", slots: mySlots },
  { title: "相手編成", slots: enemySlots },
];

export const idolCharacterOrder = [
  "花海咲季",
  "月村手毬",
  "藤田ことね",
  "雨夜燕",
  "有村麻央",
  "葛城リーリヤ",
  "倉本千奈",
  "紫雲清夏",
  "篠澤広",
  "姫崎莉波",
  "花海佑芽",
  "十王星南",
  "秦谷美鈴",
];

export function getIdolCharacterOrder(idol) {
  const index = idolCharacterOrder.indexOf(idol?.character || "");
  return index === -1 ? idolCharacterOrder.length : index;
}
