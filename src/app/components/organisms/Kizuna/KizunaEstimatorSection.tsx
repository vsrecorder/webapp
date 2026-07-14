"use client";

import { useCallback, useState } from "react";

import KizunaSimulator from "@app/components/organisms/Kizuna/KizunaSimulator";
import KizunaDeckEstimator from "@app/components/organisms/Kizuna/KizunaDeckEstimator";

type Props = {
  // 未ログインなら null。ログイン済みでも登録デッキが0件なら質問式に切り替える。
  userId: string | null;
};

/*
 * きずなLv.の試算セクション。ログイン状態で中身を出し分ける。
 *
 * - 未ログイン：質問に答えてもらう（KizunaSimulator）
 * - ログイン済み：登録デッキを選ぶだけ。実際の記録から算出する（KizunaDeckEstimator）
 *   ただしデッキが1つも無い場合は、質問式にフォールバックする
 */
export default function KizunaEstimatorSection({ userId }: Props) {
  const [hasNoDecks, setHasNoDecks] = useState(false);

  const handleNoDecks = useCallback(() => setHasNoDecks(true), []);

  if (!userId || hasNoDecks) {
    return (
      <div className="flex flex-col gap-4">
        {hasNoDecks && (
          <p className="rounded-xl border border-default-200 px-4 py-3 text-xs leading-relaxed text-default-500">
            デッキがまだ登録されていないため、質問から試算します。デッキを登録すると、対戦記録から自動で算出できるようになります。
          </p>
        )}
        <KizunaSimulator />
      </div>
    );
  }

  return <KizunaDeckEstimator userId={userId} onNoDecks={handleNoDecks} />;
}
