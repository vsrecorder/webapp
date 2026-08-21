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
                  幅は「スタンダード」のチップ(text-[10px] font-bold + 左右padding)に合わせる */}
              <div className="flex h-5 items-center mb-1">
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>

              {/* 開催日(実体は text-xs のインラインテキスト。行ボックスは親の strut ぶん
                  24px 取るので、同じ高さの枠にバーを入れて実データ描画時のズレを防ぐ)。
                  幅は「2026年8月18日(火)」の実測 103px に合わせる */}
              <div className="h-6 flex items-center">
                <Skeleton className="h-3 w-26 rounded-md" />
              </div>

              {/* イベント名(実体は ScrollingText の text-sm leading-snug = 19.25px)。
                  幅は公式イベント名の中央値(整形後の「ジムバトル」= 70px)に合わせる */}
              <div className="h-[19.25px] flex items-center mt-0.5">
                <Skeleton className="h-3.5 w-18 rounded-md" />
              </div>

              {/* チップ1段目（種別＋対戦環境の2個が最も一般的な構成。
                  幅は「ジムバトル」66px ＋『ストームエメラルダ』126px の実測に合わせる） */}
              <div className="flex items-center gap-2 mt-1.5">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-32 rounded-full" />
              </div>

              {/* チップ2段目（会場名）。RecordCardBase の2段目と同じ mt-1 で並べ、
                  幅は会場名の中央値(12文字 = 136px)に合わせる */}
              <div className="flex items-center gap-2 mt-1">
                <Skeleton className="h-5 w-34 rounded-full" />
              </div>

              {/* 区切り線 */}
              <div className="border-t border-divider mt-3 mb-2.5" />

              {/* 情報行(アイコン枠 + デッキ + 勝敗) */}
              <div className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
                <div className="flex items-center justify-between gap-2 flex-1 min-w-0">
                  {/* RecordCardBase のデッキ行と同じだけ左に寄せる(情報行の gap-3 = 12px のうち 6px) */}
                  <div className="min-w-0 flex-1 -ml-1.5">
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
      <Skeleton className="h-3.5 w-14 rounded-md shrink-0" />
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
