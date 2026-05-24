export const regressionTestCases = [
  {
    id: "next1",
    label: "next1 / 猫耳背景・次へ画面",
    category: "next-screen",
    expected: {
      stage1: "494,431 / 692,999",
      stage2: "1,730,450 / 994,400",
      stage3: "640,948 / 534,760",
    },
  },
  {
    id: "next4",
    label: "next4 / 背景ぼかし・低スコア混在",
    category: "next-screen",
    expected: {
      stage1: "420,101 / 309,748",
      stage2: "832,971 / 905,569",
      stage3: "346,909 / 347,982",
    },
  },
  {
    id: "normal1",
    label: "normal1 / 通常終了画面",
    category: "normal-result",
    expected: {
      stage1: "271,520 / 65,559",
      stage2: "150,388 / 95,056",
      stage3: "228,141 / 84,591",
    },
  },
  {
    id: "normal4",
    label: "normal4 / 通常終了画面",
    category: "normal-result",
    expected: {
      stage1: "490,885 / 584,249",
      stage2: "419,764 / 429,432",
      stage3: "716,315 / 354,228",
    },
  },
];
