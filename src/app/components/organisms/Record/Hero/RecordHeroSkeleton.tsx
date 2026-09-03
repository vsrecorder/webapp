import { Card, Skeleton } from "@heroui/react";

import MatchSkeleton from "@app/components/organisms/Match/Skeleton/MatchSkeleton";
import RecordStatPanelSkeleton from "@app/components/organisms/Record/Hero/RecordStatPanelSkeleton";
import {
  HERO_INFO_COL_CLASS,
  heroColRowStyle,
} from "@app/components/organisms/Record/Hero/heroColumns";

/*
 * 区画の見出し(「使用デッキ」「対戦結果」)の骨格。
 * 実体は text-[0.5625rem] の1行で、行ボックスは 13.5px。バーに h-2.5(10px)を
 * 直接置くと区画ごとに 3.5px 低くなるため、実体と同じ文字サイズの見えないテキストで
 * 行の高さと幅を取り、その上にバーを重ねる。
 */
export function SectionLabelSkeleton({ text }: { text: string }) {
  return (
    <span className="relative flex self-start">
      <span aria-hidden className="invisible text-[0.5625rem] font-bold tracking-wide">
        {text}
      </span>
      <Skeleton className="absolute inset-0 rounded" />
    </span>
  );
}

type Props = {
  /*
   * イベント情報パネルに出す補足行の本数。
   * 補足行(会場・開始時刻・対戦環境など)はイベント側のデータから作るため、
   * 公式イベントでは3行前後、Tonamel・自由形式では基本0行になる。
   * 記録の参照先IDは取得前から分かるので、呼び出し側で本数を渡して実体に寄せる。
   */
  metaRows?: number;
  /*
   * 対戦結果を編集できる画面か(記録詳細ページ=true / 記録情報モーダル=false)。
   * 実体は編集可だと並び替えボタンで行が高くなり(48→62px)、末尾に「対戦結果を追加する」も
   * 付くため、ここを合わせないと骨格が約100px低くなる。
   */
  matchesEditable?: boolean;
};

/*
 * RecordHero のローディングスケルトン。実態に合わせて
 * 左アクセントバー／「左：イベント情報パネル、右：戦績パネル」／
 * 全幅の「使用デッキ」「対戦結果」まで骨格を表示する。
 *
 * イベント情報パネルの各行は、実体と同じ文字サイズの見えないテキストで行の高さを取り、
 * その上にバーを重ねる。バーに直接 h-* を置くと行ボックスぶんの高さが出ず、
 * 実データへの差し替えでパネルが伸びる(実体の内訳: 日付 16.5px / イベント名 45px /
 * 補足行 15.125px × 本数 / チップ 20px、間隔は mt-1・mt-2・gap-0.5)。
 */
export default function RecordHeroSkeleton({
  metaRows = 3,
  matchesEditable = false,
}: Props) {
  return (
    <Card shadow="sm" className="relative w-full overflow-hidden bg-content1">
      {/* アクセント枠線(実態はカード外周全体の枠線。種別色は取得後に決まるため
          スケルトンではニュートラル色で表示する) */}
      <span className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] border-[3px] border-default-300" />

      <div className="px-3 py-3">
        {/* 上段：左カラム(イベント情報パネル)／右カラム(戦績パネル)。
            幅比・間隔は実表示と同じく heroColumns.ts から取る */}
        <div className="flex items-stretch" style={heroColRowStyle}>
          {/* イベント情報。実表示と同じく、戦績パネルと対になる枠線つきの面にする */}
          <div
            className={`${HERO_INFO_COL_CLASS} flex flex-col rounded-2xl border border-divider px-2 py-2.5`}
          >
            {/* 日付(実体は text-[0.6875rem] の1行 = 16.5px) */}
            <div className="relative flex items-center">
              <span className="invisible text-[0.6875rem]">&nbsp;</span>
              <Skeleton className="absolute left-0 h-2.5 w-24 rounded" />
            </div>

            {/* 実表示と同じく、イベント名から下の塊は残りの高さの中央へ置く
                (my-auto。ここが揃っていないと実データへの差し替えで行が跳ねる) */}
            <div className="my-auto">
              {/* イベント名(実体は mt-1 + 40px のアイコン枠が行の高さを決める) */}
              <div className="mt-1 flex items-center gap-2">
                <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
                <Skeleton className="h-5 w-32 max-w-full rounded-md" />
              </div>

              {/* 補足行(会場・開始時刻・対戦環境)。本数は呼び出し側から受け取る */}
              {metaRows > 0 && (
                <div className="mt-2 flex flex-col gap-0.5">
                  {["w-40", "w-28", "w-44", "w-24"].slice(0, metaRows).map((width) => (
                    <div key={width} className="relative flex items-center">
                      <span className="invisible text-[0.6875rem] leading-snug">
                        &nbsp;
                      </span>
                      <Skeleton
                        className={`absolute left-0 h-2.5 ${width} max-w-full rounded`}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* チップ行は置かない。公式イベントは種別チップを持たず、大会順位のタグは
                  右上のメダルバッジへ抜けるため、実体では空行になって消えることが大半。
                  ここに枠を作ると骨格だけ 28px 高くなる。 */}
            </div>
          </div>

          {/* 戦績パネル。対戦一覧の取得中に出すものと同じ骨格を使う
              (別々に組むと、どちらか一方だけ実体とずれる) */}
          <RecordStatPanelSkeleton />
        </div>

        {/* 使用デッキ(実態と同じく全幅の区画。見出し＋不透明パネル) */}
        <div className="mt-3.5 flex w-full flex-col gap-1.5 border-t border-divider pt-3">
          <SectionLabelSkeleton text="使用デッキ" />
          <div className="flex w-full items-center gap-2.5 rounded-xl border border-divider bg-content1 px-2.5 py-2">
            {/* スプライト2枚の間隔は対戦結果の骨格(MatchSkeleton)と同じ gap-1.5 にする */}
            <div className="flex shrink-0 items-center gap-1.5">
              <Skeleton className="h-11 w-11 rounded-lg" />
              <Skeleton className="h-11 w-11 rounded-lg" />
            </div>
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-32 max-w-full rounded-md" />
            </div>
          </div>
        </div>

        {/* 対戦結果(実態と同じく不透明パネル内に対戦行スケルトンを表示する) */}
        <div className="mt-3.5 flex w-full flex-col gap-1.5 border-t border-divider pt-3">
          <SectionLabelSkeleton text="対戦結果" />
          <div className="overflow-hidden rounded-xl border border-divider bg-content1">
            <MatchSkeleton
              enableCreateMatchModalButton={matchesEditable}
              enableUpdateMatchModalButton={matchesEditable}
              flat
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
