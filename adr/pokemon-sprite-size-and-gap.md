# ポケモンスプライトの表示サイズと間隔

## ステータス

提案中 (Proposed) — 2026-07-17 / D5(表示比率)を追記 — 2026-07-24

## Context

ポケモンスプライトの表示は共通コンポーネント [PokemonSprite](src/app/components/atoms/PokemonSprite.tsx) に統一済みだが、**呼び出し側が渡す `size` と、親コンテナの `gap` に決まった基準が無い**。実装は 28〜96 の9種類に散らばっており、`gap` の表記も `gap-0` を明示するものと指定なし(結果的に 0)が混在している。

そのため「新しくスプライトを表示するとき、どのサイズに合わせるべきか」を、都度既存箇所を grep して判断する状態になっていた。実際に活動ログモーダル([CalendarDayDetailModal.tsx](src/app/components/organisms/Calendar/CalendarDayDetailModal.tsx))へスプライトを追加した際、基準を特定するために全箇所の棚卸しが必要になった。

本ADRは、**既存実装から読み取れる規約を明文化し、今後の追加・変更時の判断基準にする**ことを目的とする。

> **注記:** 本ADRの対応表は、設計として事前に決めたものではなく、**既に存在する実装を後から棚卸しして整理したもの**(現状の追認)である。用途の名前は実装から読み取った推定を含む。したがって「決定」というより「発見された規約 + 今後の指針」に近い。既知の不整合は末尾に残してある。

### 既存コードベースの前提(踏襲する規約)

- **表示は必ず [PokemonSprite](src/app/components/atoms/PokemonSprite.tsx) を使う。** 各スプライト画像はキャラの大きさ・キャンバス内の位置がまちまちなため、単純に固定サイズで表示すると小型ポケモンが小さく・下寄りに見える。PokemonSprite は各画像のアルファ境界(bbox)を基準に、枠内で最適サイズ・位置へ正規化する。(例外として円グラフだけは canvas 描画のため別系統。同じ bbox 正規化を共有する。D4 参照)
- **`size` は「枠」の一辺(px)であって、見た目のキャラの大きさではない。** 枠は `size` px の正方形で、中の `<img>` は bbox に応じて拡縮される(同じ `size=32` でも、中の画像は 48px にも 89px にもなる)。**サイズを検証するときは指定値ではなく実描画の枠を測ること。**
- **枠の中でキャラをどれだけの大きさに見せるか(表示比率)は、`size` とは独立に「公式身長」で決まる。** 呼び出し側が制御する余地は無く、全箇所で共通。詳細は D5。
- `id` は padded 形式の文字列(`"0006"` / メガ等は `"0006_mega_x"`)。未指定・欠損時は unknown が表示される。
- **2体1組が基本。** デッキ識別は先頭2体を並べる。未登録の枠を unknown で埋めて常に2体分の幅を確保する箇所と、何も表示しない箇所がある(下記「既知の不整合」)。

---

## Decision

### D1. スプライト同士の間隔は `0` を既定とする

2体を隙間なく並べる(わずかに重なって見える)のがこのアプリの標準。**新規追加時は `gap-0` を明示する。**

例外は次の2箇所のみで、いずれも意図的に離している:

| 箇所 | gap | 理由 |
| --- | --- | --- |
| [Matches.tsx:543](src/app/components/organisms/Match/Matches.tsx#L543) 対戦一覧の相手ポケモン | `gap-1` (4px) | 一覧の情報密度が高く、隣接要素と干渉するため |
| [KizunaShareCard.tsx:56](src/app/components/organisms/Kizuna/KizunaShareCard.tsx#L56) シェア画像 | `gap-1` (4px) | 書き出し画像で 96px と大きく、密着すると潰れて見えるため |

### D2. サイズは「用途(役割)」で決める

新しい表示箇所を作るときは、**近い役割の既存箇所と同じ `size` を使う**。独自の値を足さない。

| size | gap | 用途 | 箇所 |
| --- | --- | --- | --- |
| **28** | `gap-0` | デッキ選択(リスト・選択済みとも) | [RecordCreate.tsx:375](src/app/components/templates/RecordCreate.tsx#L375)(3タブ×2), [UpdateUsedDeckModal.tsx:102](src/app/components/organisms/Deck/Modal/UpdateUsedDeckModal.tsx#L102)(×2), [OpponentDeckUsagePanel.tsx:286](src/app/components/organisms/DeckUsage/OpponentDeckUsagePanel.tsx#L286) と [UserStatHistoryChart.tsx:371](src/app/components/organisms/UserStat/UserStatHistoryChart.tsx#L371)(デッキセレクタ横の選択中デッキ) |
| **32** | `0`※ | 記録カードのデッキ行 | [RecordCardBase.tsx:196](src/app/components/organisms/Record/RecordCardBase.tsx#L196) |
| **32** | `gap-0` | **リスト行**(使用率分析・相手デッキ分布・週間使用率・活動ログ) | [DeckUsagePanel.tsx:158](src/app/components/organisms/DeckUsage/DeckUsagePanel.tsx#L158), [OpponentDeckDistributionChart.tsx:120](src/app/components/organisms/DeckUsage/OpponentDeckDistributionChart.tsx#L120), [WeeklyDeckUsagePanel.tsx:69](src/app/components/organisms/DeckMeta/WeeklyDeckUsagePanel.tsx#L69), [CalendarDayDetailModal.tsx:84](src/app/components/organisms/Calendar/CalendarDayDetailModal.tsx#L84)(使用デッキ・対戦相手とも) |
| **36** | `0`※ | 対戦作成/編集の入力履歴 | [CreateMatchModal.tsx:691](src/app/components/organisms/Match/Modal/CreateMatchModal.tsx#L691), [UpdateMatchModal.tsx:785](src/app/components/organisms/Match/Modal/UpdateMatchModal.tsx#L785) |
| **40** | —(単体) | スプライト選択の候補行 | [KizunaSpritePicker.tsx:100](src/app/components/organisms/Kizuna/KizunaSpritePicker.tsx#L100), [PokemonSpriteModal.tsx:384](src/app/components/organisms/Match/Modal/PokemonSpriteModal.tsx#L384) |
| **44** | `0`※ | 記録ヒーローのデッキ / キズナのデッキ推定リスト | [RecordHero.tsx:489](src/app/components/organisms/Record/Hero/RecordHero.tsx#L489), [KizunaDeckEstimator.tsx:488](src/app/components/organisms/Kizuna/KizunaDeckEstimator.tsx#L488) |
| **44** | —(単体) | スプライト選択モーダルのスロット | [PokemonSpriteModal.tsx:298](src/app/components/organisms/Match/Modal/PokemonSpriteModal.tsx#L298) |
| **44** | **`gap-1`** | 対戦一覧の相手ポケモン(D1の例外) | [Matches.tsx:543](src/app/components/organisms/Match/Matches.tsx#L543) |
| **48** | `gap-0` | デッキカード(リスト・ギャラリー) / デッキ・対戦のスプライト選択ボタン | [DeckCard.tsx:281](src/app/components/organisms/Deck/DeckCard.tsx#L281)(list), [DeckCard.tsx:497](src/app/components/organisms/Deck/DeckCard.tsx#L497)(gallery), [UsedDeckCard.tsx:129](src/app/components/organisms/Deck/UsedDeckCard.tsx#L129), [ShowDeckModal.tsx:236](src/app/components/organisms/Deck/Modal/ShowDeckModal.tsx#L236), [CreateDeckModal.tsx:257](src/app/components/organisms/Deck/Modal/CreateDeckModal.tsx#L257), [UpdateDeckModal.tsx:258](src/app/components/organisms/Deck/Modal/UpdateDeckModal.tsx#L258), [CreateMatchModal.tsx:628](src/app/components/organisms/Match/Modal/CreateMatchModal.tsx#L628), [UpdateMatchModal.tsx:712](src/app/components/organisms/Match/Modal/UpdateMatchModal.tsx#L712), [KizunaDeckCardPreview.tsx:93](src/app/components/organisms/Kizuna/KizunaDeckCardPreview.tsx#L93)(list・gallery共通) |
| **52** | `gap-0` | デッキ詳細ヘッダ | [DeckById.tsx:305](src/app/components/organisms/Deck/DeckById.tsx#L305) |
| **56** | —(単体) | キズナの選択スロット | [KizunaSpritePicker.tsx:131](src/app/components/organisms/Kizuna/KizunaSpritePicker.tsx#L131) |
| **64** | —(単体) | 選択候補のプレビュー | [PokemonSpriteModal.tsx:374](src/app/components/organisms/Match/Modal/PokemonSpriteModal.tsx#L374) |
| **96** | **`gap-1`** | キズナのシェア画像(D1の例外) | [KizunaShareCard.tsx:56](src/app/components/organisms/Kizuna/KizunaShareCard.tsx#L56) |

- `0`※ … `gap` クラスの指定が無く、結果的に 0 になっている箇所(D3・「未解決事項」1 を参照)。
- —(単体) … スプライトを1体しか置かないため、スプライト同士の間隔が存在しない箇所。

サイズは概ね次の階層になっている:

```
28 / 32  … リスト・行(情報密度優先)
36 / 40  … 入力履歴・選択候補行など中間
44 / 48  … カード・選択ボタン・記録ヒーロー(タップ対象/主役)
52 以上  … ヘッダ・プレビュー・書き出し画像
```

### D3. `gap-0` は省略せず明示する

見た目上は「指定なし」と `gap-0` は同じ(どちらも 0px)だが、**意図して 0 にしているのか、単に書き忘れなのかが読めない**。新規・改修時は `gap-0` を明示する。

親は `flex items-center gap-0 shrink-0` を基本形とする(`shrink-0` はスプライトが横幅に潰されるのを防ぐため)。

### D4. 円グラフ(canvas)のスプライトは DOM とは別系統

円グラフのスプライトは HeroUI の `<Image>` ではなく、**chart.js プラグインが canvas に `drawImage` で直接描く**([pieSlicesSpritePlugin.ts](src/app/utils/pieSlicesSpritePlugin.ts))。DOM の [PokemonSprite](src/app/components/atoms/PokemonSprite.tsx) と同じ bbox 正規化を [spriteDrawRect](src/app/utils/spriteFit.ts#L94)(`spriteFitStyle` の canvas 版)で再現しているため見た目は揃うが、**サイズは Tailwind の `size` ではなくプラグイン内の定数/計算で決まる**ため上の対応表には載らない。ここに併記する。

| 箇所 | サイズ | 定義 |
| --- | --- | --- |
| 外周の吹き出し(スライス色の縁取りバッジ)。全スライス統一 | **44**(固定) | [pieSlicesSpritePlugin.ts:104](src/app/utils/pieSlicesSpritePlugin.ts#L104) `SPRITE_SIZE` |
| 円の中心(詳細カードで選択中のデッキを拡大表示) | **36〜72**(動的) | [pieSlicesSpritePlugin.ts:397](src/app/utils/pieSlicesSpritePlugin.ts#L397) `min(72, max(36, outerRadius × 0.7))` |

- 「サイズ」は `spriteDrawRect` の `boxSize`(＝DOM の `size` と同じ意味の一辺 px)に渡る。
- スプライト同士の間隔は Tailwind の `gap` ではなく `OVERLAP_RATIO = 0`([:102](src/app/utils/pieSlicesSpritePlugin.ts#L102))で表し、DOM 側の `gap-0`(隣接・重なりなし)と揃えている。
- 吹き出しは大きくするとバッジが外周へ張り出し、カード幅の制約で円本体が縮む/余白から見切れるため、**44 前後が上限の目安**(同ファイルのコメント参照)。中心はバッジ内に単体表示で余裕があるため、半径に応じて動的に拡大する。

### D5. 枠の中の表示比率は「公式身長」で決まり、全箇所で共通

`size`(枠の一辺)とは別軸の話。**枠の中でキャラをどれだけの大きさに見せるか(枠占有率)は、各ポケモンの公式身長から算出する**。小型ポケモンは小さく、大型ポケモンは大きく見える。以前は全個体が同じ枠占有率(0.86 固定)だった。

**呼び出し側にこれを制御する手段は無い**(props も無い)。`size` を変えても中のキャラの「枠に対する比率」は変わらず、枠ごと拡大縮小されるだけ。したがって新しい表示箇所は、下の2経路のどちらかを通しさえすれば自動的に同じ比率になる。

#### 算出経路(この2つ以外を作らない)

| 経路 | 用途 | 身長の引き方 |
| --- | --- | --- |
| [spriteFitStyle](src/app/utils/spriteFit.ts#L82) | DOM(`PokemonSprite` が使う) | id(`"0006"`)で `SPRITE_HEIGHTS` を直接引く |
| [spriteDrawRect](src/app/utils/spriteFit.ts#L157) | canvas(円グラフの chart.js プラグイン) | URL のファイル名(`6.png`)から `HEIGHT_BY_FILE` で逆引き |

DOM 側は必ず [PokemonSprite](src/app/components/atoms/PokemonSprite.tsx) を使う(D1 冒頭の前提)。React の再レンダリングを避けるため DOM を直接組み立てる箇所([RecentMatchWinRateChart.tsx](src/app/components/organisms/UserStat/RecentMatchWinRateChart.tsx))も、**`spriteFitStyle` の戻り値をそのまま要素へ適用する**。プロパティを1つずつ書き写すと算出式の変更に追従できず、そこだけ見え方がずれる。

#### 身長データ

[spriteHeights.ts](src/app/utils/spriteHeights.ts)(`SPRITE_HEIGHTS: Record<id, メートル>`)。[generate-sprite-heights.mjs](scripts/generate-sprite-heights.mjs) が **PokéAPI の公開 CSV**(`pokemon.csv`、デシメートル→m 変換)から自動生成する。値は公式ずかんの身長。

対象 id は `spriteBounds.ts` のキーから読むため、**スプライトを追加したら `generate-sprite-bounds.mjs` → `generate-sprite-heights.mjs` の順に再実行する**。メガ・キョダイマックス・リージョンフォームは identifier のトークン境界一致で個別の身長にマッチし、未マッチは基本フォームの身長にフォールバックする(生成時にログが出る)。

#### 身長 → 枠占有率(対数圧縮)

身長は 0.1m〜100m級(キョダイマックス等)まで幅が極端に広く、線形に写すと小型ポケモンが枠内で潰れて見えなくなる。そこで対数で圧縮し、競技でよく使う 0.3〜6m 帯に効きを集中させる([heightTargetRatio](src/app/utils/spriteFit.ts#L39))。

| 定数 | 値 | 意味 |
| --- | --- | --- |
| `MIN_H` / `MAX_H` | 0.3m / 6.0m | この帯の外側はクランプ(巨大は一律最大、極小は一律最小) |
| `MIN_RATIO` / `MAX_RATIO` | 0.58 / 0.93 | 枠占有率の下限・上限 |
| `FALLBACK_RATIO` | 0.72 | 身長データが無い id(未知フォーム等)の既定 |
| `UNKNOWN_TARGET_RATIO` | 0.5 | unknown プレースホルダ(モンスターボール)。身長非依存の固定値 |

いずれも**見え方の調整用 tunable** であり、変えると全表示箇所に一律で効く。実例: フシギダネ 0.7m → 0.68、リザードン 1.7m → 0.78、カビゴン 2.1m → 0.81、レックウザ 7m → 0.93(上限に張り付き)。

#### 枠サイズに依存させない(2026-07-24 修正)

`fitScale` のクランプ(`MIN_SCALE=0.7` / `MAX_SCALE=1.9`)は「元画像 68px に対する拡大率」の上下限で、**枠サイズ `REFERENCE_FRAME=48` を基準にした値**である。これを枠に比例させる(`clampFactor = frame / REFERENCE_FRAME`)ことで `scale` が `frame` に完全比例し、**実効の枠占有率が枠サイズに依存しなくなる**。

比例させないと、身長比率が枠サイズに食われて箇所ごとに見え方が変わる:

| | クランプに張り付いた個体数(全1366体) | 実効占有率の中央値 |
| --- | --- | --- |
| 28px(デッキ選択) | **884体 (65%)** が下限に張り付き | 0.825 |
| 32px(リスト行) | **616体 (45%)** が下限に張り付き | 0.760 |
| 36px | 303体 (22%) が下限に張り付き | 0.742 |
| 48px(基準) | 36体 (2.6%)(下限18・上限18) | 0.732 |
| 96px(シェア画像) | 36体 (2.6%)(下限18・上限18) | 0.732 |

下限に張り付くと**キャラが枠からはみ出て `overflow-hidden` で見切れる**(28px 枠のキョダイマックスリザードンは占有率 1.25、エターナルムゲンダイナは 1.68 だった)。比例修正後はどの枠サイズでも上表の 48px 行と同じ(張り付き 36体 / 中央値 0.732)になる。

残る 36体は bbox が極端な個体で、`max(bw, bh)` 基準ゆえの残差(下限側=`0925` のような 48×27 の横長など bbox が大きすぎる個体、上限側=bbox が 15px 未満の極小個体)。**枠サイズには依存しない**ため「箇所ごとの不統一」にはならない。

拡大率が上がるぶん大きい枠では元画像のドットが甘くなるが、箇所ごとに大きさがバラつく方が目につくため、見え方の統一を優先する。

---

## 未解決事項 / 既知の不整合

本ADR時点で残っている、意図的でない可能性が高い差分。**今回は挙動を変えないため未修正**とし、必要になった時点で個別に判断する。

1. **`gap` 指定なしのコンテナが 5ファイル7箇所ある** — いずれも2体を並べるコンテナで、実効値は 0(D1と一致)のため見た目の影響は無い。D3 に寄せるなら `gap-0` を足すだけで済む。

   | size | 箇所 | class |
   | --- | --- | --- |
   | 32 | [RecordCardBase.tsx:194](src/app/components/organisms/Record/RecordCardBase.tsx#L194) | `flex items-center shrink-0` |
   | 36 | [CreateMatchModal.tsx:690](src/app/components/organisms/Match/Modal/CreateMatchModal.tsx#L690), [:700](src/app/components/organisms/Match/Modal/CreateMatchModal.tsx#L700) | `flex items-end justify-center w-full h-9` |
   | 36 | [UpdateMatchModal.tsx:784](src/app/components/organisms/Match/Modal/UpdateMatchModal.tsx#L784), [:794](src/app/components/organisms/Match/Modal/UpdateMatchModal.tsx#L794) | 同上 |
   | 44 | [KizunaDeckEstimator.tsx:486](src/app/components/organisms/Kizuna/KizunaDeckEstimator.tsx#L486) | `relative flex items-end` |
   | 44 | [RecordHero.tsx:494](src/app/components/organisms/Record/Hero/RecordHero.tsx#L494) | `flex shrink-0 items-center` |

   36 は「入力履歴の行」と「履歴が無いときのプレースホルダ」で各ファイル2つずつある。
   なお [KizunaSpritePicker.tsx:129](src/app/components/organisms/Kizuna/KizunaSpritePicker.tsx#L129)(56)は単体表示、[PokemonSpriteModal.tsx:294](src/app/components/organisms/Match/Modal/PokemonSpriteModal.tsx#L294)(44)はスロット番号バッジの span でスプライトのコンテナではないため、上表からは除いている。
2. **[RecentMatchWinRateChart.tsx](src/app/components/organisms/UserStat/RecentMatchWinRateChart.tsx) だけ PokemonSprite を使っていない** — ツールチップを DOM 直操作で組み立てている(頻繁な mousemove での React 再レンダリングを避けるため)。**枠サイズはローカル定数 `SPRITE_SIZE = 28` で持つので、`size` の一括変更はここに波及しない**。ただし表示比率は `spriteFitStyle` の戻り値をそのまま要素へ適用しているため、D5 の算出には自動で追従する。
3. **未登録枠の埋め方が揃っていない** — 使用率分析系や活動ログの `OpponentSprites` は unknown で埋めて常に2枠を確保するが、活動ログの `DeckSprites` はスプライトが無ければ何も表示しない。サイズ・間隔とは別軸の論点。

   ただし**リストの行ではない単発の表示**(円グラフのバッジ [deckSpriteUrls](src/app/components/organisms/DeckUsage/OpponentDeckDistributionChart.tsx#L92)、デッキセレクタ横の [OpponentDeckUsagePanel.tsx:286](src/app/components/organisms/DeckUsage/OpponentDeckUsagePanel.tsx#L286) / [UserStatHistoryChart.tsx:371](src/app/components/organisms/UserStat/UserStatHistoryChart.tsx#L371))は、**1体でも登録があれば position でスロットを固定して2枠、1体も無ければ何も出さない**で揃えている。行の高さを揃える必要が無く、unknown 2枠は「どのデッキか」の手掛かりにならないため。
4. **ローカルラッパーの既定値が実態と合っていない** — [RecordCreate.tsx](src/app/components/templates/RecordCreate.tsx) と [UpdateUsedDeckModal.tsx](src/app/components/organisms/Deck/Modal/UpdateUsedDeckModal.tsx) のローカル `DeckSprites` は既定 `size = 36` だが、全呼び出しが `28` を明示的に渡しており**既定値が使われる箇所は無い**。既定を 28 にすれば `size` の指定自体を省ける。
5. **`PokemonSpriteModal` の `gap-3` はスプライト同士の間隔ではない** — スプライトとテキストラベルの間隔であり、D1 の対象外。棚卸し時に混同しやすい。
