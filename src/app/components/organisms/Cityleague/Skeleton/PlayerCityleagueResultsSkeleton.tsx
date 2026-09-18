import { Card, CardBody } from "@heroui/react";

import { DEFAULT_CITYLEAGUE_RESULTS_HEIGHT } from "@app/utils/cityleagueResultsHeightCache";

/*
 * 「入賞したシティリーグ」(PlayerCityleagueResults)本体の骨格。
 * この節自身の読み込み中と、称号とランクのパネルの骨格(DesignationPanelSkeleton)の
 * 両方から使う。
 *
 * 各ブロックの高さは実カード(ResultCard)をブラウザで実測した行ボックスに合わせてある
 * (390px 幅・デッキコードのある入賞1件で計測)。
 *   スライド = pt-1 4 + カード 367 + pb-8 32 = 403px
 *   カード   = border 4 + p-3 24 + 大会名/開催日 16 + 順位 28 + 会場名/タグ 52
 *              + デッキ画像 167 + デッキコード 16 + リンク 24 + gap-2 ×4
 */

/*
 * 場所取りの高さから、前回この節に何が出ていたかを見分けるための境目。
 *
 * 実体は「入賞1件以上=カード(403px)」と「0件=空状態(64px)」で見た目も幅も違うので、
 * 骨格もそれぞれの形で描く。前回の高さ(useCityleagueResultsHeight)が
 *   ・EMPTY 以下  … 前回は0件だった → 空状態の骨格
 *   ・CARD 以上   … 前回はカードが出た → カードの骨格
 *   ・その間      … キャッシュがまだ無いときの既定値(208px)。どちらとも決められないので
 *                   従来どおり1枚の矩形で場所だけ取る
 * カードの骨格を 300px 未満で描くと枠から溢れて切れるため、境目はその手前に置く。
 */
const EMPTY_SKELETON_MAX_HEIGHT = 120;
const CARD_SKELETON_MIN_HEIGHT = 300;

type Props = {
  // 確保する高さ。前回このシーズンで描画できた高さ(useCityleagueResultsHeight)を渡す
  height?: number;
  /*
   * 親カードの左右パディングを打ち消すクラス(呼び出し元の BLEED)。
   * 実体はデッキ画像を主役にするカード側にだけ掛けていて、空状態には掛けていない。
   * 骨格も同じ出し分けにする(空状態で掛けると幅が 342px → 374px にずれる)。
   */
  bleedClassName?: string;
};

export default function PlayerCityleagueResultsSkeleton({
  height = DEFAULT_CITYLEAGUE_RESULTS_HEIGHT,
  bleedClassName = "",
}: Props) {
  // 前回が0件のとき。実体は rounded-xl bg-default-50 の枠に text-xs 1行(実測 64px)で、
  // 文言「このシーズンの入賞はまだありません」の幅は 203px
  if (height <= EMPTY_SKELETON_MAX_HEIGHT) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center rounded-xl bg-default-50 px-3"
      >
        <div className="h-2.5 w-51 animate-pulse rounded-full bg-default-100" />
      </div>
    );
  }

  if (height < CARD_SKELETON_MIN_HEIGHT) {
    return (
      <div
        style={{ height }}
        className={`animate-pulse rounded-xl bg-default-100 ${bleedClassName}`}
      />
    );
  }

  return (
    // 実体のスライド(SwiperSlide)と同じ余白。pb-8 はページネーションのぶん
    <div style={{ height }} className={`px-1.5 pt-1 pb-8 ${bleedClassName}`}>
      <Card shadow="sm" className="h-full w-full border-2 border-default-100">
        <CardBody className="flex flex-col gap-2 p-3">
          {/* 大会名(実測156px)と開催日(111px)。実体は日付を ml-auto で右端に寄せる */}
          <div className="flex h-4 items-center gap-2">
            <div className="h-2.5 w-40 animate-pulse rounded-full bg-default-100" />
            <div className="ml-auto h-2.5 w-28 animate-pulse rounded-full bg-default-100" />
          </div>

          {/* 順位バッジ(h-7・実測82.3px) */}
          <div className="h-7 w-20 animate-pulse rounded-full bg-default-100" />

          {/* 会場名(text-base の行ボックス24px)と、県・リーグ・環境のタグ
              (Chip size="sm" = 24px / radius 12px。実測 48.8・86.6・102.9px) */}
          <div className="flex flex-col gap-1">
            <div className="flex h-6 items-center">
              <div className="h-4 w-32 animate-pulse rounded-md bg-default-100" />
            </div>
            <div className="flex gap-1">
              <div className="h-6 w-12 animate-pulse rounded-xl bg-default-100" />
              <div className="h-6 w-22 animate-pulse rounded-xl bg-default-100" />
              <div className="h-6 w-26 animate-pulse rounded-xl bg-default-100" />
            </div>
          </div>

          {/* デッキ画像(実体は aspect-2/1 = 167px)とデッキコード(text-tiny の行16px)。
              画像は場所取りの余りを吸う。実体より中身が短いカードでも枠に収まるようにする
              (高さは前回の実測なので、デッキコードの無い入賞などでズレうる) */}
          <div className="flex min-h-0 flex-1 flex-col gap-1">
            <div className="min-h-0 flex-1 animate-pulse rounded-lg bg-default-100" />
            <div className="flex h-4 items-center justify-center">
              <div className="h-2.5 w-52 animate-pulse rounded-full bg-default-100" />
            </div>
          </div>

          {/* 「このイベントの結果を見る」(実測164px) */}
          <div className="flex h-6 items-center justify-center">
            <div className="h-3 w-40 animate-pulse rounded-full bg-default-100" />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
