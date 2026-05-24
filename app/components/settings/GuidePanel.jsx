export default function GuidePanel({ visible, showGuide, setShowGuide }) {
  return (
    <section className={`${visible ? "" : "hidden"} rounded-3xl bg-white p-6 shadow`}>
      <button
        onClick={() => setShowGuide(!showGuide)}
        className="flex w-full items-center justify-between text-left"
      >
        <h2 className="text-xl font-semibold">
          学マス コンテスト戦績トラッカー ご利用ガイド
        </h2>

        <span className="text-sm text-zinc-500">
          {showGuide ? "閉じる" : "開く"}
        </span>
      </button>

      {showGuide && (
        <div className="mt-4 space-y-6 text-sm leading-7 text-zinc-700">
          <section>
            <h3 className="text-lg font-semibold text-zinc-900">はじめに</h3>
            <p className="mt-2">
              このツールは、学園アイドルマスター コンテストの戦績管理・分析・共有を目的としたツールです。
            </p>
            <p className="mt-2">
              入力した戦績は自動集計され、シーズン管理、分析、共有画像生成などを行えます。
            </p>
            <p className="mt-2">
              また、統計データ送信を有効にすると、環境分析・利用状況確認・運営改善用データの提供にもご協力いただけます。
            </p>
          </section>

          <section>
            <h3 className="border-t pt-5 text-lg font-semibold text-zinc-900">入力タブ</h3>
            <h4 className="mt-3 font-semibold text-zinc-900">OCR取り込み</h4>
            <p>戦績画像から自動入力できます。</p>
            <p>画像を選択すると、対戦情報・スコア・順位・編成情報を自動で読み取ります。</p>
            <p>読み取り後は必ず内容をご確認ください。</p>

            <h4 className="mt-3 font-semibold text-zinc-900">対戦入力</h4>
            <p>対戦相手、位置、獲得pt、ステージ勝敗などを入力します。</p>
            <p>保存すると履歴へ追加されます。</p>

            <h4 className="mt-3 font-semibold text-zinc-900">編成入力</h4>
            <p>自分編成・相手編成を登録できます。</p>
            <p>編成テンプレート保存にも対応しています。</p>

            <h4 className="mt-3 font-semibold text-zinc-900">履歴管理</h4>
            <p>最近の対戦履歴を確認できます。</p>
            <p>編集・削除・再読み込みにも対応しています。</p>
          </section>

          <section>
            <h3 className="border-t pt-5 text-lg font-semibold text-zinc-900">編成タブ</h3>
            <h4 className="mt-3 font-semibold text-zinc-900">編成テンプレート</h4>
            <p>よく使う編成を保存できます。</p>
            <p>保存した編成は再利用可能です。</p>
          </section>

          <section>
            <h3 className="border-t pt-5 text-lg font-semibold text-zinc-900">シーズンタブ</h3>
            <h4 className="mt-3 font-semibold text-zinc-900">シーズン管理</h4>
            <p>シーズン名、期間、最終pt、順位を登録できます。</p>
            <p>分析対象シーズンもここで変更します。</p>

            <h4 className="mt-3 font-semibold text-zinc-900">シーズンサマリー</h4>
            <p>勝率、対戦数、最高ptなどを確認できます。</p>

            <h4 className="mt-3 font-semibold text-zinc-900">日別戦績</h4>
            <p>日ごとの戦績推移を確認できます。</p>

            <h4 className="mt-3 font-semibold text-zinc-900">編成変更履歴</h4>
            <p>シーズン中の編成変更状況を確認できます。</p>

            <h4 className="mt-3 font-semibold text-zinc-900">シーズン一覧</h4>
            <p>保存済みシーズンの検索・編集・複製・削除ができます。</p>
          </section>

          <section>
            <h3 className="border-t pt-5 text-lg font-semibold text-zinc-900">分析タブ</h3>
            <h4 className="mt-3 font-semibold text-zinc-900">分析条件保存</h4>
            <p>分析条件を保存できます。</p>
            <p>よく使う条件の再利用に便利です。</p>

            <h4 className="mt-3 font-semibold text-zinc-900">ステージ別分析</h4>
            <p>ステージごとの採用率・勝率・順位などを確認できます。</p>

            <h4 className="mt-3 font-semibold text-zinc-900">相手メタ分析</h4>
            <p>相手環境の採用傾向を確認できます。</p>

            <h4 className="mt-3 font-semibold text-zinc-900">位置分析</h4>
            <p>上殴り・中殴り・下殴りごとの成績を確認できます。</p>

            <h4 className="mt-3 font-semibold text-zinc-900">グラフ表示</h4>
            <p>勝率推移などを確認できます。</p>

            <h4 className="mt-3 font-semibold text-zinc-900">最終編成分析</h4>
            <p>最終採用編成を確認できます。</p>
          </section>

          <section>
            <h3 className="border-t pt-5 text-lg font-semibold text-zinc-900">共有タブ</h3>
            <h4 className="mt-3 font-semibold text-zinc-900">共有画像生成</h4>
            <p>戦績共有用画像を作成できます。</p>
            <p>PNG保存・PNGコピー・X投稿に対応しています。</p>

            <h4 className="mt-3 font-semibold text-zinc-900">プレイヤー名表示</h4>
            <p>設定タブの「プレイヤー名（任意）」が共有画像へ反映されます。</p>
          </section>

          <section>
            <h3 className="border-t pt-5 text-lg font-semibold text-zinc-900">設定タブ</h3>
            <h4 className="mt-3 font-semibold text-zinc-900">プレイヤー名（任意）</h4>
            <p>共有画像表示名・運営確認用名称です。</p>
            <p>未入力でも利用できます。</p>

            <h4 className="mt-3 font-semibold text-zinc-900">バックアップ</h4>
            <p>エクスポート・インポートに対応しています。</p>
            <p>機種変更時はバックアップを推奨します。</p>

            <h4 className="mt-3 font-semibold text-zinc-900">統計データ送信</h4>
            <p>有効化すると、環境分析・利用状況確認・運営改善用データを送信します。</p>
            <p>対戦結果、編成情報、プレイヤー名（任意）、アプリバージョン等が送信されます。</p>
            <p>相手名、メモ、バックアップデータ等は送信されません。</p>
            <p>プレイヤー名は任意入力です。</p>
            <p>未入力でも利用できます。</p>
          </section>

          <section>
            <h3 className="border-t pt-5 text-lg font-semibold text-zinc-900">よくある流れ</h3>
            <h4 className="mt-3 font-semibold text-zinc-900">初回利用</h4>
            <div className="mt-2 rounded-2xl bg-zinc-100 p-4 font-semibold text-zinc-800">
              シーズン作成
              <br />
              ↓
              <br />
              編成登録
              <br />
              ↓
              <br />
              入力
              <br />
              ↓
              <br />
              分析
              <br />
              ↓
              <br />
              共有
            </div>
          </section>

          <section>
            <h3 className="border-t pt-5 text-lg font-semibold text-zinc-900">推奨事項</h3>
            <p className="mt-2">定期的なバックアップをおすすめします。</p>
            <p>大規模更新前や端末変更前は必ずエクスポートを行ってください。</p>
          </section>
        </div>
      )}
    </section>
  );
}
