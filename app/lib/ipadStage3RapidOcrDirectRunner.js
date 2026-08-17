"use client";

import { runIpadStage3RapidOcrBrowserDiagnostic } from "./ipadStage3RapidOcrBrowser";

const DIRECT_RUNNER_SCHEMA = "ipad-stage3-rapidocr-direct-runner-v1";

function nowMs() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

export async function runIpadStage3RapidOcrDirectRunner({ image, imageName }) {
  const started = nowMs();
  const diagnostic = await runIpadStage3RapidOcrBrowserDiagnostic({
    image,
    imageName,
    diagnostics: null,
  });
  return {
    ...diagnostic,
    directRunner: {
      schema: DIRECT_RUNNER_SCHEMA,
      mode: "ipad-stage3-detectorless-fixed-roi",
      imageIdentifier: imageName || "",
      normalOcrFlowBypassed: true,
      productionOcrInvoked: false,
      tesseractInvoked: false,
      stageScope: [3],
      fieldScope: ["self.member1", "self.member2", "self.member3", "self.bonus", "self.total", "enemy.member1", "enemy.member2", "enemy.member3", "enemy.bonus", "enemy.total"],
      elapsedMs: Number((nowMs() - started).toFixed(3)),
    },
    productionOutputChanged: false,
  };
}
