# Google Sheets 匿名統計 schemaVersion 2 受け取り仕様

## 概要

アプリは匿名統計ONの対戦保存時に、`buildAnonymousStatsRecord()` で作成した JSON を GAS Web App に `POST` します。

schemaVersion 2 では、従来のフラットなキー羅列ではなく、以下の構造で送信します。

```json
{
  "schemaVersion": 2,
  "kind": "contest_match",
  "client_id": "anonymous-random-id",
  "app_version": "1.0.0",
  "sent_at": "2026-05-24T00:00:00.000Z",
  "match": {
    "id": "M1779000000000",
    "date": "2026-05-19T00:00:00.000Z",
    "position": "上",
    "result": "勝ち",
    "point": "120"
  },
  "stages": [
    {
      "stage": 1,
      "my": {
        "baseTotal": 490885,
        "bonus": "59680",
        "members": [
          {
            "slot": 1,
            "idolId": "花海_咲季_Fighting_My_Way",
            "idolName": "花海咲季",
            "idolVariant": "Fighting My Way",
            "score": "242,490",
            "rank": "2"
          }
        ]
      },
      "enemy": {
        "baseTotal": 584249,
        "bonus": "",
        "members": []
      }
    }
  ]
}
```

## 送信する項目

- `schemaVersion`: `2`
- `kind`: 現状は `contest_match`
- `client_id`: ブラウザごとに生成した匿名ID
- `app_version`: アプリ側の固定バージョン文字列
- `sent_at`: アプリ側で送信した日時
- `match.id`: 対戦ID
- `match.date`: ISO日時
- `match.position`: 上/中/下
- `match.result`: 勝ち/負け/引き分け
- `match.point`: 獲得pt
- `stages[].stage`: 1-3
- `stages[].my.baseTotal`, `stages[].enemy.baseTotal`
- `stages[].my.bonus`, `stages[].enemy.bonus`
- `members[].slot`: 1-3
- `members[].idolId`
- `members[].idolName`
- `members[].idolVariant`
- `members[].score`
- `members[].rank`

## 送信しない項目

- 相手プレイヤー名
- シーズンメモ
- 個人メモ
- 編成テンプレ名
- 共有カード用プレイヤー名
- ローカルバックアップ情報

## 推奨シート構成

GAS側では、最低限以下の2シートに分けると集計しやすいです。

### matches シート

1対戦につき1行。

| column | value |
| --- | --- |
| schema_version | payload.schemaVersion |
| kind | payload.kind |
| match_id | payload.match.id |
| date | payload.match.date |
| position | payload.match.position |
| result | payload.match.result |
| point | payload.match.point |
| received_at | new Date() |
| raw_json | JSON.stringify(payload) |
| client_id | payload.client_id \|\| "" |
| app_version | payload.app_version \|\| "" |
| sent_at | payload.sent_at \|\| new Date().toISOString() |

### stage_members シート

1対戦 × 3ステージ × 自分/相手 × 3枠 = 最大18行。

| column | value |
| --- | --- |
| match_id | payload.match.id |
| date | payload.match.date |
| position | payload.match.position |
| result | payload.match.result |
| stage | stage.stage |
| side | `my` or `enemy` |
| side_base_total | sideData.baseTotal |
| side_bonus | sideData.bonus |
| slot | member.slot |
| idol_id | member.idolId |
| idol_name | member.idolName |
| idol_variant | member.idolVariant |
| score | member.score |
| rank | member.rank |
| received_at | new Date() |

## GAS側の受け取り疑似コード

```js
function doPost(e) {
  const payload = JSON.parse(e.postData.contents || '{}');

  if (payload.schemaVersion === 2 && payload.kind === 'contest_match') {
    return saveContestMatchV2(payload);
  }

  // 旧形式が残っている場合はここで legacy handler に渡す
  return saveLegacyPayload(payload);
}

function saveContestMatchV2(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const matches = ss.getSheetByName('matches') || ss.insertSheet('matches');
  const members = ss.getSheetByName('stage_members') || ss.insertSheet('stage_members');
  const receivedAt = new Date();
  const sentAt = payload.sent_at || new Date().toISOString();
  const matchHeaders = ensureHeaders(matches, [
    'schema_version',
    'kind',
    'match_id',
    'date',
    'position',
    'result',
    'point',
    'received_at',
    'raw_json',
    'client_id',
    'app_version',
    'sent_at',
  ]);

  upsertObjectRow(matches, matchHeaders, 'match_id', payload.match.id, {
    schema_version: payload.schemaVersion,
    kind: payload.kind,
    match_id: payload.match.id,
    date: payload.match.date,
    position: payload.match.position,
    result: payload.match.result,
    point: payload.match.point,
    received_at: receivedAt,
    raw_json: JSON.stringify(payload),
    client_id: payload.client_id || '',
    app_version: payload.app_version || '',
    sent_at: sentAt,
  });

  deleteRowsByMatchId(members, payload.match.id);

  payload.stages.forEach((stage) => {
    ['my', 'enemy'].forEach((side) => {
      const sideData = stage[side] || {};
      (sideData.members || []).forEach((member) => {
        members.appendRow([
          payload.match.id,
          payload.match.date,
          payload.match.position,
          payload.match.result,
          stage.stage,
          side,
          sideData.baseTotal || '',
          sideData.bonus || '',
          member.slot || '',
          member.idolId || '',
          member.idolName || '',
          member.idolVariant || '',
          member.score || '',
          member.rank || '',
          receivedAt,
        ]);
      });
    });
  });

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, schemaVersion: 2 }))
    .setMimeType(ContentService.MimeType.JSON);
}

function ensureHeaders(sheet, requiredHeaders) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(requiredHeaders);
    return requiredHeaders;
  }

  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header));

  if (missingHeaders.length > 0) {
    sheet
      .getRange(1, headers.length + 1, 1, missingHeaders.length)
      .setValues([missingHeaders]);
  }

  return headers.concat(missingHeaders);
}

function appendObjectRow(sheet, headers, values) {
  sheet.appendRow(headers.map((header) => values[header] ?? ''));
}

function upsertObjectRow(sheet, headers, keyHeader, keyValue, values) {
  const rowValues = headers.map((header) => values[header] ?? '');
  const keyIndex = headers.indexOf(keyHeader);

  if (keyIndex === -1 || sheet.getLastRow() < 2) {
    sheet.appendRow(rowValues);
    return;
  }

  const keyColumn = keyIndex + 1;
  const existingValues = sheet
    .getRange(2, keyColumn, sheet.getLastRow() - 1, 1)
    .getValues();
  const existingIndex = existingValues.findIndex((row) => row[0] === keyValue);

  if (existingIndex === -1) {
    sheet.appendRow(rowValues);
    return;
  }

  sheet
    .getRange(existingIndex + 2, 1, 1, headers.length)
    .setValues([rowValues]);
}

function deleteRowsByMatchId(sheet, matchId) {
  if (!matchId || sheet.getLastRow() < 1) return;

  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const matchIdColumnIndex = headers.includes('match_id')
    ? headers.indexOf('match_id') + 1
    : 1;

  for (let row = sheet.getLastRow(); row >= 2; row -= 1) {
    if (sheet.getRange(row, matchIdColumnIndex).getValue() === matchId) {
      sheet.deleteRow(row);
    }
  }
}
```

## 互換性

現在のアプリ側 `saveRecordToSheets()` はGASからJSONが返れば動作します。
GAS側は `{ ok: true }` または `{ ok: true, schemaVersion: 2 }` を返す想定です。
