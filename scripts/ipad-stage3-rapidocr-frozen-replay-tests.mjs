import assert from "node:assert/strict";

function localBboxForCandidate(candidate, manifestRecord) {
  if (!candidate?.bbox || !manifestRecord?.rect) return null;
  return {
    x: Math.max(0, Math.round(Number(candidate.bbox.x) - Number(manifestRecord.rect.x))),
    y: Math.max(0, Math.round(Number(candidate.bbox.y) - Number(manifestRecord.rect.y))),
    width: Math.max(1, Math.round(Number(candidate.bbox.width))),
    height: Math.max(1, Math.round(Number(candidate.bbox.height))),
  };
}

function proposalValue(row, field) {
  if (field === "bonus") return Number(row.proposal?.bonus || 0);
  if (field === "total") return Number(row.proposal?.total || 0);
  return Number(row.proposal?.members?.[Number(field.replace("member", "")) - 1] || 0);
}

function compareTensorSamples(a = [], b = []) {
  const bByIndex = new Map(b.map((entry) => [entry.index, Number(entry.value)]));
  const rows = [];
  for (const sample of a) {
    if (!bByIndex.has(sample.index)) continue;
    const browserValue = bByIndex.get(sample.index);
    rows.push({
      index: sample.index,
      frozen: Number(sample.value),
      browser: browserValue,
      delta: Number(Math.abs(Number(sample.value) - browserValue).toFixed(8)),
    });
  }
  return {
    compared: rows.length,
    maxDelta: rows.reduce((max, row) => Math.max(max, row.delta), 0),
    rows,
  };
}

assert.deepEqual(
  localBboxForCandidate(
    { bbox: { x: 424, y: 1580, width: 165, height: 19 } },
    { rect: { x: 194, y: 1522, width: 677, height: 77 } }
  ),
  { x: 230, y: 58, width: 165, height: 19 }
);

assert.equal(localBboxForCandidate({ bbox: null }, { rect: { x: 1, y: 2 } }), null);

assert.equal(proposalValue({ proposal: { members: [1, 2, 3], bonus: 4, total: 10 } }, "member1"), 1);
assert.equal(proposalValue({ proposal: { members: [1, 2, 3], bonus: 4, total: 10 } }, "member2"), 2);
assert.equal(proposalValue({ proposal: { members: [1, 2, 3], bonus: 4, total: 10 } }, "member3"), 3);
assert.equal(proposalValue({ proposal: { members: [1, 2, 3], bonus: 4, total: 10 } }, "bonus"), 4);
assert.equal(proposalValue({ proposal: { members: [1, 2, 3], bonus: 4, total: 10 } }, "total"), 10);

assert.deepEqual(
  compareTensorSamples(
    [
      { index: 0, value: -1 },
      { index: 7, value: 0.5 },
      { index: 99, value: 1 },
    ],
    [
      { index: 7, value: 0.25 },
      { index: 0, value: -1 },
    ]
  ),
  {
    compared: 2,
    maxDelta: 0.25,
    rows: [
      { index: 0, frozen: -1, browser: -1, delta: 0 },
      { index: 7, frozen: 0.5, browser: 0.25, delta: 0.25 },
    ],
  }
);

console.log("ipad-stage3-rapidocr-frozen-replay tests PASS");
