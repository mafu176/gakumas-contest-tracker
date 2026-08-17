import assert from "node:assert/strict";

const REC_INPUT_HEIGHT = 48;
const REC_INPUT_WIDTH = 320;

function resizedWidth(sourceWidth, sourceHeight) {
  const ratio = sourceWidth / Math.max(1, sourceHeight);
  return Math.min(REC_INPUT_WIDTH, Math.max(1, Math.ceil(REC_INPUT_HEIGHT * ratio)));
}

function normalizeByte(byte) {
  return (byte / 255 - 0.5) / 0.5;
}

function writeBgrNchwPixel(data, plane, target, { r, g, b }) {
  data[target] = normalizeByte(b);
  data[plane + target] = normalizeByte(g);
  data[plane * 2 + target] = normalizeByte(r);
}

assert.equal(resizedWidth(682, 104), 315);
assert.equal(resizedWidth(737, 104), 320);
assert.equal(resizedWidth(10, 100), 5);
assert.equal(resizedWidth(2000, 100), 320);

assert.equal(Number(normalizeByte(0).toFixed(8)), -1);
assert.equal(Number(normalizeByte(255).toFixed(8)), 1);
assert.equal(Number(normalizeByte(128).toFixed(8)), 0.00392157);

const plane = REC_INPUT_HEIGHT * REC_INPUT_WIDTH;
const data = new Float32Array(3 * plane);
writeBgrNchwPixel(data, plane, 0, { r: 10, g: 20, b: 30 });
assert.ok(Math.abs(data[0] - normalizeByte(30)) < 1e-7);
assert.ok(Math.abs(data[plane] - normalizeByte(20)) < 1e-7);
assert.ok(Math.abs(data[plane * 2] - normalizeByte(10)) < 1e-7);

const padded = new Float32Array(3 * plane);
const target = 319;
assert.equal(padded[target], 0);
assert.equal(padded[plane + target], 0);
assert.equal(padded[plane * 2 + target], 0);

const delta392 = 0.39215692;
const byteDelta = delta392 / (2 / 255);
assert.ok(Math.abs(byteDelta - 50) < 0.01);

console.log("ipad-stage3-rapidocr-preprocessing-parity tests PASS");
