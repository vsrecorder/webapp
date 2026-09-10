import { Card, CardBody, Skeleton } from "@heroui/react";

/*
 * ホーム(ダッシュボード)の「本日のシティリーグ結果」を開催期間外に描くときの骨格。
 *
 * 実体は CityleagueOffSeasonCard。余白・間隔はそちらに合わせてあるので、
 * 中身を変えるときは両方を直すこと。行の高さは文字サイズで決まるため、
 * 素の高さを決め打ちせず実文言と同じ文字サイズの見えないテキストで場所を取る。
 * 次回シーズンが未発表のときは1行少なくなるが、多数派(発表済み)に合わせている。
 */
export default function CityleagueOffSeasonCardSkeleton() {
  return (
    // 高さは実体(CityleagueOffSeasonCard の MIN_HEIGHT_CLASS)と揃える
    <Card className="w-full shadow-md min-h-58">
      <CardBody className="flex flex-col items-center justify-center gap-3 px-4 py-6 text-center">
        {/* シティリーグのロゴ(h-9 w-9) */}
        <Skeleton className="h-9 w-9 rounded-md" />

        <div className="flex w-full flex-col items-center gap-1">
          {/* 「次回のシティリーグ」(text-sm = 20px の行) */}
          <span className="relative inline-flex items-center">
            <span aria-hidden className="invisible text-sm font-bold">
              次回のシティリーグ
            </span>
            <span className="absolute inset-y-0.5 left-0 right-0 rounded-md bg-default-100 animate-pulse" />
          </span>

          {/* 大会名(text-xs = 16px の行)。代表的な長さで幅を取る */}
          <span className="relative inline-flex items-center">
            <span aria-hidden className="invisible text-xs">
              シティリーグ2027 シーズン1
            </span>
            <span className="absolute inset-y-0.5 left-0 right-0 rounded-md bg-default-100 animate-pulse" />
          </span>

          {/* 開催期間(text-xs = 16px の行) */}
          <span className="relative inline-flex items-center">
            <span aria-hidden className="invisible text-xs">
              2026年9月26日 〜 2026年11月15日
            </span>
            <span className="absolute inset-y-0.5 left-0 right-0 rounded-md bg-default-100 animate-pulse" />
          </span>
        </div>

        {/* 注意書き(text-tiny の行)。実体では次回の有無によらず常に出る */}
        <span className="relative inline-flex items-center">
          <span aria-hidden className="invisible text-tiny">
            開催期間中は大会が表示されます
          </span>
          <span className="absolute inset-y-0.5 left-0 right-0 rounded-md bg-default-100 animate-pulse" />
        </span>
      </CardBody>
    </Card>
  );
}
