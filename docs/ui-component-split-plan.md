# app/page.js UIコンポーネント分割案

## 方針

仕様変更・UI変更を避けるため、まずは JSX のまとまり単位で props を渡すだけの分割に留める。
状態管理の移動や hooks 化は第2段階に回す。

## 第1段階: 表示セクションの単純分割

以下は副作用が少なく、切り出しやすい。

1. `SummaryCards`
   - 総対戦数、勝敗、勝率の3カード
   - props: `records`, `winCount`, `winRate`

2. `ScreenshotOcrSection`
   - スクショ取り込み、OCRモード、プレビュー、OCR結果
   - propsが多いため、最初は関連stateとhandlerをまとめて渡す
   - 将来 `useOcrImport()` に分ける候補

3. `IdolManagerSection`
   - 詳細設定: アイドル追加
   - props: custom idol入力値一式、`combinedIdolDb`, `idolChecklist`, `idolDbSummary`
   - 将来 `useCustomIdols()` に分ける候補

4. `BattleInputSection`
   - 対戦入力、編成テンプレ、スコア入力、自分/相手編成枠
   - 大きいのでさらに以下へ分ける
   - `FormationTemplatePanel`
   - `StageResultCards`
   - `SlotGroupPicker`
   - `StageScoreInputs`

5. `IdolPickerPanel`
   - 右側のアイドル選択一覧
   - props: `selectedSlot`, `search`, `filteredIdols`, `setSlotValues`

6. `SeasonSection`
   - シーズン管理、シーズンサマリー、共有カード
   - さらに `SeasonForm`, `SeasonSummary`, `SeasonShareCard` に分ける
   - PNG出力確認をしやすくするなら `SeasonShareCard` を最優先で分ける

7. `AnalysisPresetSection`
   - 分析条件保存

8. `StageIdolAnalysisSection`
   - ステージ別アイドル分析
   - `IdolDetailModal` も別コンポーネント化候補

9. `WinRateGraphSection`
   - 勝率推移グラフ

10. `MetaAnalysisSection`
    - 相手メタ分析

11. `BackupSection`
    - バックアップ / 復元

12. `RecentMatchesSection`
    - 最近の対戦

## 第2段階: hooks分割

JSX分割後に以下を hooks 化する。

- `useLocalStorageHydration()`
- `useBackup()`
- `useOcrImport()`
- `useSeasonSummary()`
- `useAnalysisFilters()`
- `useRecords()`

## 優先順位

1. `SeasonShareCard` 分割
   - PNG出力テストがしやすくなる
2. `ScreenshotOcrSection` 分割
   - OCR周りの変更範囲が明確になる
3. `BattleInputSection` 分割
   - page.js の最大部分を削れる
4. `IdolPickerPanel` 分割
   - アイドルDB修正時の確認が楽になる

## 注意点

- localStorage key は変更しない
- 保存JSONの形は変更しない
- CSS className は最初はそのまま移動
- `app/lib/*` のロジック関数は今の入口 `./lib/tracker` を維持
- 分割直後は `npm run build` と `npm run lint` を必ず実行
