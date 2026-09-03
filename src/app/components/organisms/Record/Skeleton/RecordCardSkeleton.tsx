import { Card, CardBody } from "@heroui/react";
import { Skeleton } from "@heroui/react";

/*
 * 使用デッキ行(スプライト2体 + デッキ名)のスケルトン。
 * RecordCardBase のデッキ読み込み中表示と共有する。実データ描画時にレイアウトシフトが
 * 起きないよう、スプライトは実物と同じ 32px(w-8 h-8) スロットを隙間なく2つ並べる。
 * 中の丸は PokemonSprite が実際に見せるキャラ位置(枠いっぱいではなく、やや小さめ・
 * 下端中央寄り)に合わせて、スロット内で下端中央へ配置する。
 */
export function RecordDeckRowSkeleton() {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <div className="flex items-center shrink-0">
        {[0, 1].map((i) => (
          <div key={i} className="relative w-8 h-8">
            <Skeleton className="absolute bottom-0 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full" />
          </div>
        ))}
      </div>
      <Skeleton className="h-3.5 w-24 rounded-md" />
    </div>
  );
}

/*
 * RecordCardBase と同じ骨格のローディングスケルトン。
 * 公式/Tonamel/自由形式の全カードで共有する。
 */
export function RecordCardSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <Card shadow="none" className="border border-divider overflow-hidden">
        <CardBody className="p-0">
          <div className="flex">
            {/* 左アクセントバー */}
            <Skeleton className="w-1 shrink-0 rounded-none" />

            <div className="flex-1 px-4 py-3.5 min-w-0">
              {/* レギュレーションのチップ行(全ての記録に付くため常に枠を確保する。
                  集計対象外マークは大半の記録に無いのでスケルトンには出さない)。
                  幅は「スタンダード」のチップ(text-[0.625rem] font-bold + 左右padding)に合わせる */}
              <div className="flex h-5 items-center mb-1">
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>

              {/* 開催日(実体は text-xs leading-snug のブロック = 16.5px)。
                  バーに直接 h-* を置くと行ボックスぶんの高さが出ないため、実体と同じ
                  文字サイズの見えないテキストで行の高さを取り、その上に重ねる。
                  幅は「2026年8月18日(火)」の実測 103px に合わせる */}
              <div className="relative flex items-center">
                <span className="invisible text-xs leading-snug">&nbsp;</span>
                <Skeleton className="absolute left-0 h-3 w-26 rounded-md" />
              </div>

              {/* イベントのアイコン + イベント名。実体と同じく 40px のアイコン枠が行の高さを決める。
                  名前の幅は公式イベント名の中央値(整形後の「ジムバトル」= 70px)に合わせる */}
              <div className="mt-1.5 flex items-center gap-2.5">
                <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
                <Skeleton className="h-3.5 w-18 rounded-md" />
              </div>

              {/* 補足行(会場・対戦環境)。実体は RecordMetaRows の
                  text-[0.6875rem] leading-snug = 15.125px の行を gap-0.5 で2本。
                  バーに直接 h-* を置くと行ボックスぶんの高さが出ないため、実体と同じ
                  文字サイズの見えないテキストで行の高さを取り、その上に重ねる。
                  幅は会場名の中央値(12文字)と『ストームエメラルダ』の実測に合わせる */}
              <div className="mt-2 flex flex-col gap-0.5">
                {["w-33", "w-30"].map((width) => (
                  <div key={width} className="relative flex items-center">
                    <span className="invisible text-[0.6875rem] leading-snug">
                      &nbsp;
                    </span>
                    <Skeleton className="absolute left-0 h-3 w-3 rounded-sm" />
                    <Skeleton
                      className={`absolute left-[1.125rem] h-2.5 ${width} max-w-full rounded`}
                    />
                  </div>
                ))}
              </div>

              {/* 区切り線 */}
              <div className="border-t border-divider mt-3 mb-2.5" />

              {/* 情報行(デッキ + 勝敗)。イベントのアイコンはイベント名の横へ移したのでここには無い */}
              <div className="flex min-w-0 items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <RecordDeckRowSkeleton />
                </div>
                {/* 勝敗バッジ(text-xs + border + px-1.5 py-0.5 で 22px、「3勝1敗」で 52px)と
                    高さ・幅を揃える。
                    チーム戦/BO3はカード右上へ移動し読み込み後に出現するためここには置かない */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <Skeleton className="h-5.5 w-13 rounded-md" />
                </div>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

// display: 常に表示する場合は "flex"、特定ブレークポイント以降だけ表示する場合は
// "hidden md:flex" のように渡す（"hidden" と "flex" を同時にベースクラスへ
// 混在させると詳細度の関係で意図通りに切り替わらないため、呼び出し側で出し分ける）。
function MonthHeaderSkeleton({
  display = "flex",
  colSpanClass,
}: {
  display?: string;
  colSpanClass: string;
}) {
  return (
    <div
      className={`col-span-1 ${colSpanClass} ${display} items-center gap-3 pt-1 pb-0.5`}
    >
      {/* 年月ラベル。実体(Records の "YYYY年M月")は text-xs の1行で 16px × 60.4px。
          バーに高さ・幅を直接置くと 14px × 56px になり、仕切りごとに 2px 低く・
          罫線の始点が 4.4px 手前になって、実データ描画時に下の行がずれる。
          実体と同じ文字サイズ・字送りの見えないテキストで枠を取り、その上にバーを重ねて
          高さも幅も実体に一致させる(中身の文字列は寸法を取るためだけのもの)。 */}
      <span className="relative flex shrink-0 items-center">
        <span aria-hidden className="invisible text-xs font-bold tracking-wide">
          2026年8月
        </span>
        <Skeleton className="absolute inset-0 rounded-md" />
      </span>
      <div className="flex-1 h-px bg-divider" />
    </div>
  );
}

// スマホ: 3枚 / タブレット(md〜): 4枚 / デスクトップ(lg〜): 2列なら8枚・3列なら9枚
// （デスクトップの列数は Records の desktopColumns に合わせて呼び出し元から渡す）
export function RecordCardSkeletons({ desktopColumns = 2 }: { desktopColumns?: 2 | 3 }) {
  const colSpanClass =
    desktopColumns === 3 ? "lg:col-span-2 xl:col-span-3" : "lg:col-span-2";
  const extraDesktopCards = desktopColumns === 3 ? 5 : 4;

  return (
    <>
      <MonthHeaderSkeleton colSpanClass={colSpanClass} />
      <RecordCardSkeleton />
      <RecordCardSkeleton />
      <RecordCardSkeleton />
      <RecordCardSkeleton className="hidden md:block" />

      <MonthHeaderSkeleton display="hidden lg:flex" colSpanClass={colSpanClass} />
      {Array.from({ length: extraDesktopCards }).map((_, i) => (
        <RecordCardSkeleton key={i} className="hidden lg:block" />
      ))}
    </>
  );
}
