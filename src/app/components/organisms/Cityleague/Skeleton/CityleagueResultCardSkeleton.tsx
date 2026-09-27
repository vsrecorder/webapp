import { Card, CardHeader, CardBody } from "@heroui/react";
import { Skeleton } from "@heroui/react";

import { CITYLEAGUE_CARD_IMAGE_WIDTH_CLASS } from "@app/utils/cityleagueCardImage";

/*
 * 入賞カード(CityleagueResultCard)のスケルトン。
 *
 * 各ブロックの高さは実カードをブラウザで実測した行ボックスに合わせてある
 * (390px 幅・オープンリーグ先頭スライドで計測)。Skeleton はブロック要素なので、
 * 実体のインラインテキストが取る行の高さを枠として確保しないと、
 * 骨格から実体に切り替わった瞬間にカードが伸びて一覧全体が下へずれる。
 */
type Props = {
  // 実体(CityleagueResultCard)と同じく、順位ごとの見出しを持つ場所では
  // カード側の順位ラベルを出さない。
  showRankLabel?: boolean;
  /*
   * 実体がデッキの種類(バトラボのデッキ分類)の行を出す場所か。実体は種類(deckArchetype)を
   * 渡されたときだけこの行を出す。分類は 2027 シーズン以降の大会にしか付かないので、
   * 一覧(常に直近のシーズン)は出す前提、個別ページはそのイベントのシーズンで決める。
   */
  withDeckArchetype?: boolean;
};

export default function CityleagueResultCardSkeleton({
  showRankLabel = true,
  withDeckArchetype = false,
}: Props) {

  return (
    <Card shadow="sm" className="w-full border-2 border-default-100">
      {/* ヘッダー：順位タグの右隣にプレイヤー情報（アイコン・名前・ID）を横並び */}
      <CardHeader className="flex items-center gap-2 px-3 pt-3 pb-0">
        {/* 順位タグ。幅は先頭スライドに必ず来る「🥇 優勝」の実測 72.6px に合わせる */}
        {showRankLabel && <Skeleton className="h-7 w-18 shrink-0 rounded-full" />}

        {/* プレイヤー情報 */}
        <div className="flex min-w-0 items-center gap-2">
          <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
          {/*
            実体はプレイヤー名(text-sm leading-tight = 17.5px)とID(text-tiny
            leading-tight = 15px)をすき間なく積む2行で、合計 32.5px。
            gap で近似すると 30px になり 2.5px 縮むので、行ごと高さを合わせる。
          */}
          <div className="flex min-w-0 flex-col">
            <div className="h-[1.09375rem] flex items-center">
              {/* プレイヤー名の幅は実データの中央値(842件で 42px)に合わせる */}
              <Skeleton className="h-3.5 w-12 rounded-md" />
            </div>
            <div className="h-[0.9375rem] flex items-center">
              {/* ID は「ID: 0006983309」固定桁で常に 87.8px */}
              <Skeleton className="h-3 w-22 rounded-md" />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardBody className="px-3 pb-3 pt-2">
        {/*
          デッキの種類(出す場所だけ)。実体(DeckArchetypeLabel)はデッキ一覧のギャラリー表示と同じ
          「スプライト 2 枠(48px)＋名前(text-large の 28px 行)＋型(text-tiny、行は 16px 固定)」を
          積み、下に pb-1 = 100px。型の行は実体が型の無いデッキでも空けたままにするので、
          骨格でも常に確保する。スプライトの骨格は DeckCardSkeleton と同じく、丸をキャラ位置
          (下端中央寄り)に置く。名前の幅は「ドラパルトex」相当、型は「バシャーモ型」相当。
        */}
        {withDeckArchetype && (
          <div className="pb-1">
            <div className="flex w-full min-w-0 flex-col items-center gap-1">
              <div className="flex shrink-0 items-center">
                {/* 実体のスプライト枠は px 固定(48px)。rem の h-12 にすると、ルートの文字が 18px になる
                    640〜767px 幅で 54px になり、カードが 6px 伸びる */}
                {[0, 1].map((i) => (
                  <div key={i} className="relative h-[48px] w-[48px]">
                    <Skeleton className="absolute bottom-0 left-1/2 h-10 w-10 -translate-x-1/2 rounded-full" />
                  </div>
                ))}
              </div>
              <div className="flex w-full min-w-0 flex-col items-center">
                <div className="flex h-7 items-center">
                  <Skeleton className="h-5 w-32 rounded-lg" />
                </div>
                <div className="flex h-4 items-center">
                  <Skeleton className="h-3 w-16 rounded-md" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* デッキ画像。実体と同じ幅の上限(モーダルの画像と同じ幅にするためのもの)を掛ける */}
        <div className={CITYLEAGUE_CARD_IMAGE_WIDTH_CLASS}>
          <div className="relative w-full aspect-2/1">
            <Skeleton className="absolute inset-0 rounded-lg" />
          </div>
        </div>

        {/*
          デッキコード。実体は画像の下に pt-1.5(6px) を空けて text-tiny の 16px の行を置く(22px)。
          ここが抜けていたため、骨格から実体に切り替わるたびにカードが伸びていた。
          幅は「デッキコード ○○○○○○-○○○○○○」の実測中央値 208px。
          (以前はこの上に「主なポケモン」の行があったが、デッキ分類の表示に置き換えて廃止した)
        */}
        <div className="pt-1.5">
          <div className="h-4 flex items-center justify-center">
            <Skeleton className="h-3 w-52 rounded-md" />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
