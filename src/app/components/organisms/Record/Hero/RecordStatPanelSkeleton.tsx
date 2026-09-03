import { Skeleton } from "@heroui/react";

import {
  HERO_STAT_PANEL_CLASS,
  heroStatColStyle,
} from "@app/components/organisms/Record/Hero/heroColumns";

/*
 * 戦績パネル(RecordStatPanel)の骨格。
 *
 * 戦績は対戦一覧から集計するため、イベント情報より遅れて届くことがある。
 * その間パネルを描かないでいると、イベント欄が全幅に広がった状態で一度描かれ、
 * 対戦一覧が届いた瞬間に幅が縮んでパネルが割り込む(実測で約840msの間ずれる)。
 * 取得中はこの骨格を同じ場所に置いて枠を先に確保する。
 *
 * 実体と外形がずれると差し替えでカードが跳ねるため、面のクラス(HERO_STAT_PANEL_CLASS)と
 * 幅(heroStatColStyle)は実体と共有し、中身も実体と同じ構造・同じ寸法で組む。
 *   リング   : aspect-square w-full (パネル幅に追従)
 *   勝敗タイル: 数字 28px + mt-1(4px) + ラベル 9px = 41px を h-13(52px)の枠に中央寄せ
 *
 * 数字が 28px なのは、実体の勝/敗の数字が text-lg だから。Tailwind の text-* は
 * font-size と line-height を組で当てるため、親の leading-none は text-lg 自身の
 * line-height(1.75rem)に上書きされ、行ボックスは 18px ではなく 28px になる。
 * ここを font-size と同じ 18px で組むとパネルが 10px 低くなり、実データに
 * 差し替わった瞬間にカードが伸びる(修正前の骨格がまさにその状態だった)。
 */
export default function RecordStatPanelSkeleton() {
  return (
    <div style={heroStatColStyle} className={HERO_STAT_PANEL_CLASS}>
      <div className="relative flex w-full flex-col items-center">
        <Skeleton className="aspect-square w-full rounded-full" />

        {/* 内訳ブロックの高さは実体と同じく h-13 で固定する
            (実体は個人戦/チーム戦/貢献度でこの高さに揃えてある) */}
        <div className="mt-2.5 w-full border-t border-divider pt-2.5">
          <div className="flex h-13 items-stretch">
            <div className="flex flex-1 flex-col items-center justify-center leading-none">
              <Skeleton className="h-7 w-5 rounded-md" />
              <Skeleton className="mt-1 h-[9px] w-4 rounded-sm" />
            </div>
            <span aria-hidden className="w-px self-stretch bg-divider" />
            <div className="flex flex-1 flex-col items-center justify-center leading-none">
              <Skeleton className="h-7 w-5 rounded-md" />
              <Skeleton className="mt-1 h-[9px] w-4 rounded-sm" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
