import { Chip } from "@heroui/react";

/*
 * 週次デッキ使用率パネルの固定文言。骨格(WeeklyDeckUsagePanelSkeleton)と
 * 実体(WeeklyDeckUsagePanel)の両方から同じものを描く。
 *
 * データに依らない文言を骨格側でバーに置き換えると、折り返しの回数が端末幅で変わるぶん
 * だけ骨格と実体の高さが食い違う(実測: 320px で母集団の注記が5行→7行になり 27.5px、
 * β注記が2行→3行になり 15.125px ズレた)。バーの幅をいくら合わせても幅依存は消せないので、
 * 固定文言はそのまま置いて折り返しごと一致させる。
 */

// パネル冒頭の β機能の注記(Chip + 説明。狭い端末では説明が3行に折り返す)
export function WeeklyDeckUsageBetaNote() {
  return (
    <div className="flex items-center gap-2">
      <Chip
        size="sm"
        color="warning"
        variant="flat"
        classNames={{ base: "h-5 px-0.5", content: "text-[0.625rem] font-black px-1.5" }}
      >
        β機能
      </Chip>
      <span className="text-[0.6875rem] text-default-400 leading-snug">
        プラットフォーム全体の週次デッキ使用率
        <br />
        (集計方法や表示仕様は今後変わる可能性があります)
      </span>
    </div>
  );
}

// 母集団の下に置く集計方法の注記(狭い端末では5行→7行に折り返す)
export function WeeklyDeckUsageNotes() {
  return (
    <span className="text-[0.625rem] text-default-300 leading-snug text-center">
      ※スタンダードの記録のみを集計しています
      <br />
      ※自分・相手それぞれのデッキを1件として
      <br />
      集計するため、対戦数より多くなっています
      <br />
      ※ポケモン未設定の対戦はデッキ名から推測して集計しています
      <br />
      ※▲▼・NEW と +/− の数値は前週の順位・使用率・勝率との比較です
    </span>
  );
}

// 使用率の分母の説明。骨格からは既定(全体件数を分母にする表示)のまま呼ぶ
export function WeeklyDeckUsageRateNote({
  rateMode = "all",
  otherCount = 0,
  exclOtherTotal = 0,
}: {
  rateMode?: "all" | "excl_other";
  otherCount?: number;
  exclOtherTotal?: number;
}) {
  return (
    <span className="text-[0.625rem] text-default-400 leading-snug text-center">
      {rateMode === "all"
        ? "「その他」を含む全体件数を分母に算出しています"
        : `「その他」(${otherCount}件)を除いた${exclOtherTotal}件を分母に算出しています`}
    </span>
  );
}

// ランキングの見出しと並び順の説明
export function WeeklyDeckUsageRankingHeader() {
  return (
    <div className="flex items-center justify-between px-1 -mb-2">
      <span className="text-[0.6875rem] font-black text-default-500">使用率ランキング</span>
      <span className="text-[0.625rem] text-default-400">使用率が高い順（同率は勝率順）</span>
    </div>
  );
}
