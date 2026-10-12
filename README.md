# かよい帳

GPS で自分が行った建物を自動で記録し、履歴と「何回行ったか」を残す iPhone / Android アプリ（Expo SDK 56）。

- 建物に **5 分以上**いると「訪問 1 回」として記録（半径 50m）
- 建物の名前は OpenStreetMap（Overpass API）から自動でつける。見つからなければ「名前のない場所」、自分で名前を変えられる
- 履歴 / ランキング（回数順・時間順）/ 地図 の 3 タブ
- データはこの端末の中だけ（クラウドなし）。外に出るのは名前を探すための座標問い合わせと地図タイルの取得だけ

## 動かし方

Expo Go の iOS 版はバックグラウンドで位置を取れないので、開発用ビルドで動かす。

```bash
pnpm install
LANG=en_US.UTF-8 pnpm ios   # 開発用ビルドを作ってシミュレータで起動（2回目以降は pnpm start でも可）
pnpm test                   # 判定ロジックのテスト
```

`LANG` を UTF-8 にしないと CocoaPods が `Unicode Normalization not appropriate for ASCII-8BIT` で落ちる。

シミュレータで位置を動かす:

```bash
xcrun simctl privacy booted grant location-always com.nokokoro.kayoicho
xcrun simctl location booted set 35.681236,139.767125
```

5 分以上そのままにしてから別の場所へ `set` すると、1 回分の訪問が記録される。

## 仕組み

`src/lib` に判断をすべて置き、React/Expo を import しない（テストはここだけに当てる）。

1. 位置タスク（`src/services/tracker.ts`）が座標を受け取り、端末 DB に追記
2. `processPending()` が未処理の座標から滞在を切り出し（`stay.ts`）、既知の建物か判定（`match.ts`）、訪問を記録
3. `nameNewPlaces()` が新しい建物の名前を Overpass で探す（`naming.ts`）。失敗したら次回また探す

止まっている間は位置更新が届かないので、「次の点が来るまではそこにいた」とみなしている。

## ハマりどころ

- **位置タスクは `index.js` で登録する。** expo-router は画面を開くまでルートのファイルを読み込まないため、`app/_layout.tsx` で登録すると、アプリが閉じた状態から裏で起こされたときに登録されていない
- **DB への書き込みは 1 本ずつ流す**（`src/services/db.ts` の `exclusive`）。expo-sqlite の `withTransactionAsync` は他の書き込みを止めないので、裏の位置タスクと画面側の処理が重なると記録が消えたり二重に数えたりする
- **Overpass の公開サーバは不安定。** 本家が 504 を返し続けることがあるので、ミラー 2 つへ順に切り替え、1 つあたり 20 秒まで待つ
- `react-native-reanimated` は expo-router が引き込む。版が新しすぎると `pod install` が通らないので `npx expo install` で SDK に合う版に固定してある

## 制約

- iOS は電池節約のため裏での位置更新を間引くことがあり、数分だけ寄った場所は取りこぼすことがある
- 建物の中でGPSが外れても 10 分以内に戻れば 1 回にまとめるが、それより長いと 2 回に数える
- 民家・小さな建物は OpenStreetMap に名前が無いことが多い。駅ではホーム名が選ばれることがある（名前は自分で変えられる）
- アプリをスワイプで終了（強制終了）すると、iOS では次にアプリを開くまで記録が止まる
- 点が届かない間は同じ場所にいたとみなすが、1回の滞在は最長 12 時間で打ち切る
- 通信するのは建物の名前探し（overpass-api.de / overpass.private.coffee / overpass.kumi.systems に建物の位置を送る）と、地図タイル（tile.openstreetmap.org）だけ
- 処理済みの生の座標は 30 日で消える（訪問の記録は残る）
