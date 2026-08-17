import assert from "node:assert/strict";

const characters = ["blank", "0", "1", "2", ".", " "];

function decode(indices, probabilities) {
  let previous = -1;
  let text = "";
  const confidences = [];
  for (let index = 0; index < indices.length; index += 1) {
    const value = indices[index];
    if (value !== 0 && value !== previous) {
      text += characters[value] || "";
      confidences.push(probabilities[index]);
    }
    previous = value;
  }
  return {
    text,
    confidence: confidences.length ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length : 0,
  };
}

function nearlyEqual(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `expected ${actual} to equal ${expected}`);
}

{
  const result = decode([0, 0, 0], [0.9, 0.8, 0.7]);
  assert.equal(result.text, "");
  assert.equal(result.confidence, 0);
}

{
  const result = decode([1, 2, 3], [0.9, 0.8, 0.7]);
  assert.equal(result.text, "012");
  nearlyEqual(result.confidence, 0.8);
}

{
  const result = decode([2, 2, 2], [0.9, 0.7, 0.6]);
  assert.equal(result.text, "1");
  nearlyEqual(result.confidence, 0.9);
}

{
  const result = decode([2, 0, 2], [0.9, 0.1, 0.6]);
  assert.equal(result.text, "11");
  nearlyEqual(result.confidence, 0.75);
}

{
  const result = decode([2, 4, 3], [0.95, 0.8, 0.75]);
  assert.equal(result.text, "1.2");
  nearlyEqual(result.confidence, (0.95 + 0.8 + 0.75) / 3);
}

{
  const result = decode([2, 0, 3], [0.2, 0.99, 0.1]);
  assert.equal(result.text, "12");
  nearlyEqual(result.confidence, 0.15);
}

console.log("ipad-stage3-rapidocr-confidence-parity decoder tests PASS");
