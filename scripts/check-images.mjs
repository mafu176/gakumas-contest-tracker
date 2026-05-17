const URL = "https://gktools.ris.moe/dex/collection/p-idols";

const res = await fetch(URL);
const html = await res.text();

const imageMatches = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/g)];

console.log(`画像候補: ${imageMatches.length}件`);

imageMatches.slice(0, 30).forEach((match, index) => {
  console.log(`${index + 1}: ${match[1]}`);
});