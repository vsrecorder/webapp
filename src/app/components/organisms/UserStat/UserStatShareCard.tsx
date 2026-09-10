"use client";

import { Card, CardBody } from "@heroui/react";

import UserStatSummary from "@app/components/molecules/UserStat/UserStatSummary";
import { UserStatType } from "@app/types/user_stat";

type Props = {
  // 集計期間の表示（例: 「『メガリザードンex』」「2026年7月」）
  filterLabel: string;
  stat: UserStatType | null;
  // 不戦勝・不戦敗を除いた数字か
  excludeDefaultMatches: boolean;
};

/*
 * 「戦績分析」パネルのシェア画像用カード。
 *
 * 画面のパネルからフィルタ操作用のUI(タブ・セレクタ)を外し、
 * 見出しと集計期間・数値だけを載せた静止した見た目にする。
 * 数値表示は画面と同じ UserStatSummary を使うため、画面と画像で食い違わない。
 */
export default function UserStatShareCard({
  filterLabel,
  stat,
  excludeDefaultMatches,
}: Props) {
  return (
    <Card>
      <CardBody className="gap-4 p-4">
        <div className="flex flex-col items-center gap-1">
          <h2 className="text-sm font-bold text-default-700">戦績分析</h2>
          <p className="text-xs text-default-400">{filterLabel} の戦績</p>
          {/* 不戦勝・不戦敗を外した数字は公式のスイスドロー成績と一致しない。
              画像は文脈から切り離されて出回るので、断り書きを画像自体に載せる */}
          {excludeDefaultMatches && (
            <p className="text-[0.625rem] font-bold text-default-400">
              不戦勝・不戦敗を除く
            </p>
          )}
        </div>

        <UserStatSummary stat={stat} isLoading={false} />
      </CardBody>
    </Card>
  );
}
