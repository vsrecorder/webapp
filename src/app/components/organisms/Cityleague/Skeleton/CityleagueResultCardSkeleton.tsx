import { Card, CardHeader, CardBody } from "@heroui/react";
import { Skeleton } from "@heroui/react";

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
};

export default function CityleagueResultCardSkeleton({ showRankLabel = true }: Props) {
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
            <div className="h-[17.5px] flex items-center">
              {/* プレイヤー名の幅は実データの中央値(842件で 42px)に合わせる */}
              <Skeleton className="h-3.5 w-12 rounded-md" />
            </div>
            <div className="h-[15px] flex items-center">
              {/* ID は「ID: 0006983309」固定桁で常に 87.8px */}
              <Skeleton className="h-3 w-22 rounded-md" />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardBody className="px-3 pb-3 pt-2">
        {/* デッキ画像 */}
        <div className="relative w-full aspect-2/1">
          <Skeleton className="absolute inset-0 rounded-lg" />
        </div>

        {/*
          デッキコード。実体は画像の下に
          <span className="pt-1.5 text-center text-tiny text-default-400"> の1行があり、
          pt-1.5(6px) + 行ボックス(16px) = 22px を占める。ここが抜けていたため、
          骨格から実体に切り替わるたびにカードが 22px 伸びていた。
          幅は「デッキコード ○○○○○○-○○○○○○」の実測中央値 208px。
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
