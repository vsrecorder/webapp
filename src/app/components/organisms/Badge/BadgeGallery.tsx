"use client";

import { useCallback, useEffect, useState, Fragment } from "react";
import { Card, CardBody, useDisclosure } from "@heroui/react";

import FetchError from "@app/components/molecules/FetchError";

import { UserBadgeType } from "@app/types/badge";
import { ChampionshipSeriesType } from "@app/types/championship_series";
import {
  BadgeDetailModal,
  BadgeTile,
  BadgeTileSkeleton,
} from "@app/components/organisms/Badge/badgeUi";
import {
  seasonOptionsFromChampionshipSeries,
  currentSeasonValue,
} from "@app/utils/season";

type Props = {
  userId: string;
  championshipSeries: ChampionshipSeriesType[];
};

const CATEGORY_LABELS: Record<string, string> = {
  milestone: "マイルストーン",
};

const CATEGORY_ORDER = ["milestone"];

// マイルストーンは記録数・デッキコード数・対戦数の3系統がそれぞれ独立した昇格トラックのため、
// criteria_type ごとに分けて1系統=1行の「左→右」の流れとして見せる。
// デッキ系のcriteria_typeは、オンボーディングの「初デッキ」が deck_count なのに対し
// マイルストーンは deck_code_count(デッキコードの登録数)で別物なので取り違えないこと。
const MILESTONE_SUBGROUP_LABELS: Record<string, string> = {
  record_count: "記録数",
  deck_code_count: "デッキコード数",
  match_count: "対戦数",
};

function subgroupByCriteriaType(
  badges: UserBadgeType[],
): { key: string; label: string; badges: UserBadgeType[] }[] {
  const order: string[] = [];
  const byType = new Map<string, UserBadgeType[]>();
  for (const badge of badges) {
    if (!byType.has(badge.criteria_type)) {
      order.push(badge.criteria_type);
    }
    const list = byType.get(badge.criteria_type) ?? [];
    list.push(badge);
    byType.set(badge.criteria_type, list);
  }
  return order.map((key) => ({
    key,
    label: MILESTONE_SUBGROUP_LABELS[key] ?? key,
    badges: [...(byType.get(key) ?? [])].sort(
      (a, b) => a.criteria_value - b.criteria_value,
    ),
  }));
}

// マイルストーンのように「易→難」の順で1本道になっているバッジ群を、
// 左から右へ">"でつないで昇格の流れを表現する行。DesignationPanelの称号ロードマップと
// 同じ区切り記号を使い、見た目の統一感を揃えている。
function BadgeFlowRow({
  badges,
  onSelect,
}: {
  badges: UserBadgeType[];
  onSelect: (badge: UserBadgeType) => void;
}) {
  return (
    <div className="flex items-stretch gap-1">
      {badges.map((badge, i) => (
        <Fragment key={badge.id}>
          <div className="flex-1 min-w-0">
            <BadgeTile badge={badge} onSelect={onSelect} />
          </div>
          {i < badges.length - 1 && (
            <span className="self-center shrink-0 text-warning/70 font-black text-xs">
              ▶
            </span>
          )}
        </Fragment>
      ))}
    </div>
  );
}

// BadgeFlowRow と同じ構造(タイル+"▶"区切り)のプレースホルダー。
// マイルストーンは実際は▶で繋がる横並びのため、区切り分の幅もスケルトンに反映する。
// 行の高さは一番背の高いタイル(=一番長いバッジ名)で決まるので、その名前を nameSample に渡す。
function BadgeFlowRowSkeleton({ count, nameSample }: { count: number; nameSample: string }) {
  return (
    <div className="flex items-stretch gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <Fragment key={i}>
          <div className="flex-1 min-w-0">
            <BadgeTileSkeleton nameSample={nameSample} />
          </div>
          {i < count - 1 && (
            <span className="self-center shrink-0 text-default-300 font-black text-xs">
              ▶
            </span>
          )}
        </Fragment>
      ))}
    </div>
  );
}

export default function BadgeGallery({ userId, championshipSeries }: Props) {
  const [badges, setBadges] = useState<UserBadgeType[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<UserBadgeType | null>(null);
  // ユーザーが select で明示的に選んだシーズン。未選択("")の間は一覧から決めた現在シーズンを使う。
  // useState の初期化子で決めてしまうと、championshipSeries が後から届いた場合に選び直されないため、
  // 描画のたびに派生させる(一覧は高々数件なのでコストは無視できる)。
  const [selectedSeason, setSelectedSeason] = useState("");
  const season = selectedSeason || currentSeasonValue(championshipSeries);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const seasonOptions = seasonOptionsFromChampionshipSeries(championshipSeries);

  function handleSelect(badge: UserBadgeType) {
    setSelectedBadge(badge);
    onOpen();
  }

  // 取得に失敗したことを空のバッジ一覧で覆い隠さないよう、
  // 失敗はエラーとして扱い、この場だけで取り直せるようにする。
  const loadBadges = useCallback(async () => {
    setError(false);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/users/${userId}/badges?season=${season}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Failed to fetch");
      }

      const data = await res.json();

      setBadges(data?.badges ?? []);
    } catch (err) {
      console.log(err);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, [userId, season]);

  useEffect(() => {
    loadBadges();
  }, [loadBadges]);

  if (isLoading) {
    return (
      <Card className="shadow-md">
        <CardBody className="p-4 flex flex-col gap-4">
          {/* 獲得数(text-xs = 16px の行)とシーズン選択(border + py-1.5 + text-xs = 30px) */}
          <div className="flex items-center justify-between gap-2">
            <div className="h-4 flex items-center">
              <div className="w-20 h-3 rounded-full bg-default-100 animate-pulse" />
            </div>
            <div className="w-24 h-7.5 rounded-xl bg-default-100 animate-pulse" />
          </div>

          {CATEGORY_ORDER.map((category) => (
            <div key={category} className="flex flex-col gap-2">
              {/* カテゴリ名(text-[0.6875rem] の行 = 16.5px。px はルート16px時) */}
              <div className="h-[1.03125rem] flex items-center">
                <div className="w-24 h-2.5 rounded-full bg-default-100 animate-pulse" />
              </div>
              <div className="flex flex-col gap-3">
                {Array.from({ length: 3 }).map((_, subIndex) => (
                  <div key={subIndex} className="flex flex-col gap-1.5">
                    {/* 系統名(text-[0.625rem] の行 = 15px。px はルート16px時) */}
                    <div className="h-[0.9375rem] flex items-center">
                      <div className="w-14 h-2 rounded-full bg-default-100 animate-pulse" />
                    </div>
                    {/* マイルストーンは「駆け出し/熟練/達人/伝説の」×「ユーザー/ビルダー/バトラー」。
                        一番長いのは前半4文字の「駆け出し◯◯◯◯」 */}
                    <BadgeFlowRowSkeleton count={4} nameSample="駆け出しユーザー" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardBody>
      </Card>
    );
  }

  if (error) {
    return <FetchError message="バッジの取得に失敗しました" onRetry={loadBadges} />;
  }

  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABELS[category] ?? category,
    badges: (badges ?? [])
      .filter((b) => b.category === category)
      .sort((a, b) => a.criteria_value - b.criteria_value),
  })).filter((g) => g.badges.length > 0);

  // APIはonboarding系も含む全バッジを返すが、それらは「はじめの一歩」(OnboardingBadgePanel)
  // 側に並ぶ。獲得数はこのカードに実際に表示されているバッジだけで数えないと、
  // 画面上のタイル数と分母が食い違う。
  const visibleBadges = grouped.flatMap((g) => g.badges);
  const achievedCount = visibleBadges.filter((b) => b.achieved).length;

  return (
    <Card className="shadow-md">
      <CardBody className="p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-default-500 shrink-0">
            獲得数 {achievedCount} / {visibleBadges.length}
          </span>
          <div className="relative inline-block shrink-0">
            <select
              name="badge-season"
              value={season}
              onChange={(e) => setSelectedSeason(e.target.value)}
              className="appearance-none rounded-xl border border-default-200 bg-default-100 pl-3 pr-7 py-1.5 text-xs font-bold text-default-700 focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {seasonOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-default-400 text-[0.625rem]">
              ▼
            </span>
          </div>
        </div>

        {grouped.map((group) => (
          <div key={group.category} className="flex flex-col gap-2">
            <span className="text-[0.6875rem] font-bold text-default-400">{group.label}</span>
            <div className="flex flex-col gap-3">
              {subgroupByCriteriaType(group.badges).map((sub) => (
                <div key={sub.key} className="flex flex-col gap-1.5">
                  <span className="text-[0.625rem] font-bold text-default-300">
                    {sub.label}
                  </span>
                  <BadgeFlowRow badges={sub.badges} onSelect={handleSelect} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardBody>

      <BadgeDetailModal
        badge={selectedBadge}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
      />
    </Card>
  );
}
