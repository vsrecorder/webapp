"use client";

import { useEffect, useMemo, useState } from "react";

import { Button, Card, CardBody, Tab, Tabs } from "@heroui/react";
import { LuShare2 } from "react-icons/lu";

import PanelShareModal from "@app/components/organisms/Share/PanelShareModal";
import DeckDistributionShareCard, {
  type ShareDeckRow,
} from "@app/components/organisms/DeckUsage/DeckDistributionShareCard";
import { buildDeckDistributionPostText } from "@app/utils/panelPostText";

import { EnvironmentType } from "@app/types/environment";
import { StandardRegulationType } from "@app/types/standard_regulation";
import { DEFAULT_REGULATION_ID, regulationDisplay } from "@app/types/regulation";
import RegulationSegmentedControl from "@app/components/molecules/RegulationSegmentedControl";
import { ChampionshipSeriesType } from "@app/types/championship_series";
import { OpponentDeckUsageStatType } from "@app/types/opponent_deck_usage_stat";
import { DeckUsageItemType, DeckUsageStatType } from "@app/types/deck_usage_stat";
import { OldestRecordEventDateType } from "@app/types/oldest_record_event_date";
import {
  seasonOptionsFromChampionshipSeries,
  currentSeasonValue,
} from "@app/utils/season";
import {
  getCurrentYearMonth,
  generateYearMonthOptions,
} from "@app/utils/yearMonthOptions";
import OpponentDeckDistributionChart, {
  buildOpponentDeckDisplay,
} from "@app/components/organisms/DeckUsage/OpponentDeckDistributionChart";
import PokemonSprite from "@app/components/atoms/PokemonSprite";
import { getDeckSpriteBySlot } from "@app/utils/deckSprite";

type FilterMode = "month" | "environment" | "season" | "regulation";

// 使用デッキセレクタに添えるスプライトの枠(px)。ADR pokemon-sprite-size-and-gap の
// 「デッキ選択(選択済み)」に合わせる。
const OWN_DECK_SPRITE_SIZE = 28;

type Props = {
  userId: string;
  environments: EnvironmentType[];
  currentEnvironmentId?: string;
  standardRegulations: StandardRegulationType[];
  championshipSeries: ChampionshipSeriesType[];
  userCreatedAt?: string;
  // セクション見出し。パネル自身が見出し行を描画し、その右端にシェアボタンを置く。
  sectionTitle: string;
};

export default function OpponentDeckUsagePanel({
  userId,
  environments,
  currentEnvironmentId,
  standardRegulations,
  championshipSeries,
  userCreatedAt,
  sectionTitle,
}: Props) {
  const [filterMode, setFilterMode] = useState<FilterMode>("environment");
  const [yearMonth, setYearMonth] = useState<string>(getCurrentYearMonth);
  const [environmentId, setEnvironmentId] = useState<string>(
    currentEnvironmentId ?? environments[0]?.id ?? "",
  );
  const [season, setSeason] = useState<string>(() =>
    currentSeasonValue(championshipSeries),
  );
  const [standardRegulationId, setStandardRegulationId] = useState<string>(
    standardRegulations[0]?.id ?? "",
  );

  // レギュレーション区分(スタンダード/エクストラ/殿堂/その他)。期間の絞り込みとは直交する軸で、
  // 既定はスタンダード(レギュレーションが混ざった数字を初期表示しない)。
  const [regulationId, setRegulationId] = useState<number>(DEFAULT_REGULATION_ID);
  const [stat, setStat] = useState<OpponentDeckUsageStatType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [ownDeckId, setOwnDeckId] = useState<string>("");
  const [ownDecks, setOwnDecks] = useState<DeckUsageItemType[]>([]);
  const [oldestEventDate, setOldestEventDate] = useState<string | null>(null);
  // シェアモーダルの開閉
  const [shareOpen, setShareOpen] = useState(false);

  // 「月次」の選択肢は、実際に記録されている最も古い対戦のevent_dateを起点にする。
  // 取得前・取得失敗時はユーザー登録日、それも無ければ直近12ヶ月にフォールバックする。
  const createdAtDate =
    oldestEventDate != null
      ? new Date(oldestEventDate)
      : userCreatedAt != null
        ? new Date(userCreatedAt)
        : undefined;
  const yearMonthOptions = generateYearMonthOptions(createdAtDate);
  const seasonOptions = seasonOptionsFromChampionshipSeries(championshipSeries);

  useEffect(() => {
    let cancelled = false;

    async function fetchOldestEventDate() {
      try {
        const res = await fetch(`/api/users/${userId}/oldest-record-event-date`, {
          cache: "no-store",
        });
        if (!res.ok) return;

        const data: OldestRecordEventDateType = await res.json();
        if (!cancelled) setOldestEventDate(data.event_date);
      } catch (e) {
        console.error(e);
      }
    }

    fetchOldestEventDate();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    let cancelled = false;

    async function fetchStat() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("regulation_id", String(regulationId));
        if (filterMode === "month" && yearMonth) {
          params.set("year_month", yearMonth);
        } else if (filterMode === "environment" && environmentId) {
          params.set("environment_id", environmentId);
        } else if (filterMode === "season" && season) {
          params.set("season", season);
        } else if (filterMode === "regulation" && standardRegulationId) {
          params.set("standard_regulation_id", standardRegulationId);
        }
        if (ownDeckId) params.set("deck_id", ownDeckId);

        const res = await fetch(
          `/api/users/${userId}/opponent-deck-usage?${params.toString()}`,
          {
            cache: "no-store",
          },
        );

        if (!res.ok) return;

        const data: OpponentDeckUsageStatType = await res.json();
        if (!cancelled) setStat(data);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchStat();
    return () => {
      cancelled = true;
    };
  }, [userId, filterMode, yearMonth, environmentId, season, standardRegulationId, regulationId, ownDeckId]);

  // 期間フィルタが変わるたびに、その期間で実際に使用したデッキ一覧を取得し
  // 「自分のデッキ」セレクタの選択肢にする（未使用デッキを候補に出さないため）
  useEffect(() => {
    let cancelled = false;

    async function fetchOwnDecks() {
      try {
        const params = new URLSearchParams();
        params.set("regulation_id", String(regulationId));
        if (filterMode === "month" && yearMonth) {
          params.set("year_month", yearMonth);
        } else if (filterMode === "environment" && environmentId) {
          params.set("environment_id", environmentId);
        } else if (filterMode === "season" && season) {
          params.set("season", season);
        } else if (filterMode === "regulation" && standardRegulationId) {
          params.set("standard_regulation_id", standardRegulationId);
        }

        const res = await fetch(`/api/users/${userId}/deck-usage?${params.toString()}`, {
          cache: "no-store",
        });

        if (!res.ok) return;

        const data: DeckUsageStatType = await res.json();
        // deck_id は ULID のため文字列降順に並べると新しいデッキが先頭にくる
        const sortedDecks = [...(data.decks ?? [])].sort((a, b) =>
          a.deck_id < b.deck_id ? 1 : a.deck_id > b.deck_id ? -1 : 0,
        );
        if (!cancelled) setOwnDecks(sortedDecks);
      } catch (e) {
        console.error(e);
      }
    }

    setOwnDeckId("");
    fetchOwnDecks();
    return () => {
      cancelled = true;
    };
  }, [userId, filterMode, yearMonth, environmentId, season, standardRegulationId, regulationId]);

  const decks = useMemo(() => stat?.decks ?? [], [stat]);
  // 使用デッキを絞り込んでいるときは、どのデッキを選んでいるかスプライトでも示す。
  // 円グラフのバッジ(OpponentDeckDistributionChart の deckSpriteUrls)と同じ扱いにし、
  // 1体でも登録があれば position でスロットを固定して2枠表示、1体も無いデッキでは
  // 何も出さない(モンスターボール2つはデッキの手掛かりにならないため)。
  const selectedOwnDeck = ownDeckId
    ? ownDecks.find((d) => d.deck_id === ownDeckId)
    : undefined;
  const ownDeckSprite1 = getDeckSpriteBySlot(selectedOwnDeck?.pokemon_sprites, 1);
  const ownDeckSprite2 = getDeckSpriteBySlot(selectedOwnDeck?.pokemon_sprites, 2);
  const hasOwnDeckSprite = Boolean(ownDeckSprite1 || ownDeckSprite2);


  // 「環境」と「レギュレーションマーク」はスタンダードのカードプールを前提にした区切りのため、
  // エクストラ・殿堂では月次とシーズンだけを出す。
  const isStandardRegulation = regulationId === DEFAULT_REGULATION_ID;

  const filterTabs: { key: FilterMode; title: string }[] = [
    { key: "month", title: "月次" },
    ...(isStandardRegulation
      ? [{ key: "environment" as FilterMode, title: "環境" }]
      : []),
    { key: "season", title: "シーズン" },
    ...(isStandardRegulation
      ? [{ key: "regulation" as FilterMode, title: "レギュレーションマーク" }]
      : []),
  ];

  // レギュレーションを切り替えると選べる集計タブも変わるため、集計の選択もそれに合わせる。
  //  ・スタンダードへ戻したとき: 既定の集計である環境へ戻す。
  //  ・エクストラ・殿堂へ切り替えたとき: 消えるタブ(環境・レギュレーションマーク)を選んだ
  //    ままだと、その条件で集計され続けてしまうためシーズンへ寄せる
  //    (エクストラ・殿堂でも母数を確保しやすい区切り)。
  const handleRegulationChange = (nextRegulationId: number) => {
    setRegulationId(nextRegulationId);

    if (nextRegulationId === DEFAULT_REGULATION_ID) {
      setFilterMode("environment");
      return;
    }

    if (filterMode === "environment" || filterMode === "regulation") {
      setFilterMode("season");
    }
  };

  const periodFilterLabel =
    filterMode === "month"
      ? (yearMonthOptions.find((o) => o.value === yearMonth)?.label ?? yearMonth)
      : filterMode === "environment"
        ? `『${environments.find((e) => e.id === environmentId)?.title ?? ""}』環境`
        : filterMode === "season"
          ? (seasonOptions.find((o) => o.value === season)?.label ?? season)
          : `『${standardRegulations.find((r) => r.id === standardRegulationId)?.marks ?? ""}』`;

  // レギュレーションはパネル上のセグメントで選ぶが、シェア画像には写らない。
  // 既定のスタンダード以外を見ているときは、何のレギュレーションの数字か分かるよう添える。
  const filterLabel =
    regulationId === DEFAULT_REGULATION_ID
      ? periodFilterLabel
      : `${periodFilterLabel}(${regulationDisplay(regulationId).name})`;

  // 使用デッキで絞り込んでいるときは、どのデッキ使用時の分布かを添える
  const ownDeckSuffix = ownDeckId
    ? `・『${ownDecks.find((d) => d.deck_id === ownDeckId)?.name ?? ""}』使用時の`
    : "";
  // シェア画像の見出し。画面の期間ラベルと同じ文言・同じ改行位置にする
  const shareSubtitle = `${filterLabel}${ownDeckSuffix}\n対戦相手のデッキ分布`;

  // シェア画像・ポスト文に渡す表示データ。
  // 「その他」への集約と配色は画面の円グラフと同じ関数で求め、並び・色をずらさない。
  const shareRows = useMemo(() => {
    const { items, colors, softColors } = buildOpponentDeckDisplay(decks);
    const rows = items.map((deck, idx): ShareDeckRow => {
      const sprite1 = getDeckSpriteBySlot(deck.pokemon_sprites, 1);
      const sprite2 = getDeckSpriteBySlot(deck.pokemon_sprites, 2);
      return {
        key: `${deck.deck_info}-${idx}`,
        name: deck.deck_info,
        spriteIds: [sprite1?.id, sprite2?.id],
        hasSprite: Boolean(sprite1 || sprite2),
        count: deck.count,
        usageRate: deck.usage_rate,
        winRate: deck.win_rate,
      };
    });
    return { rows, colors, softColors };
  }, [decks]);

  return (
    <>
      {/* セクション見出し行。タイトルを左、シェアボタンを右端に置く（ダッシュボードの
          「対戦環境データ」の見出し行と同じ配置ルール）。集計が空の間は画像に載せる
          中身が無いためシェアを押させない。 */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-default-700">{sectionTitle}</h2>
        <Button
          size="sm"
          variant="flat"
          radius="full"
          className="h-7 shrink-0 px-3 text-xs font-bold"
          startContent={<LuShare2 className="h-3.5 w-3.5" />}
          isDisabled={isLoading || decks.length === 0}
          onPress={() => setShareOpen(true)}
        >
          シェア
        </Button>
      </div>
      <Card>
        <CardBody className="gap-4 p-4">
          {/* レギュレーション区分の絞り込み(期間の絞り込みとは独立に効く) */}
          <RegulationSegmentedControl
            regulationId={regulationId}
            onChange={handleRegulationChange}
          />

          {/* フィルタータブ */}
          {/* 親のダッシュボード側がlg:columns-2のCSS多段組みレイアウトを使っており、
              position: stickyは多段組みコンテナ内で正しく機能しない(見た目の位置と
              クリック判定がズレてタップに反応しなくなる)ため、ここではstickyにしない */}
          <Tabs
            fullWidth
            size="sm"
            selectedKey={filterMode}
            onSelectionChange={(key) => setFilterMode(key as FilterMode)}
            classNames={{
              tab: "h-7",
              tabContent: "font-bold text-xs",
            }}
          >
            {filterTabs.map((tab) => (
              <Tab key={tab.key} title={tab.title} />
            ))}
          </Tabs>

          {/* セレクタ */}
          <div className="relative">
            <select
              name="opponent-deck-usage-period"
              value={
                filterMode === "month"
                  ? yearMonth
                  : filterMode === "environment"
                    ? environmentId
                    : filterMode === "season"
                      ? season
                      : standardRegulationId
              }
              onChange={(e) => {
                if (filterMode === "month") {
                  setYearMonth(e.target.value);
                } else if (filterMode === "environment") {
                  setEnvironmentId(e.target.value);
                } else if (filterMode === "season") {
                  setSeason(e.target.value);
                } else {
                  setStandardRegulationId(e.target.value);
                }
              }}
              className="w-full appearance-none rounded-xl border border-default-200 bg-default-100 px-4 py-2.5 pr-10 text-sm font-bold text-default-700 focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {filterMode === "month"
                ? yearMonthOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))
                : filterMode === "environment"
                  ? environments.map((env) => (
                      <option key={env.id} value={env.id}>
                        『{env.title}』
                      </option>
                    ))
                  : filterMode === "season"
                    ? seasonOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))
                    : standardRegulations.map((reg) => (
                        <option key={reg.id} value={reg.id}>
                          『{reg.marks}』
                        </option>
                      ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-default-400 text-xs">
              ▼
            </span>
          </div>

          {/* 自分のデッキセレクタ（対面相性の勝率は使用デッキによって変わるため）。
              ネイティブの <select> には画像を入れられないため、選択中デッキのスプライトは
              セレクタの左に並べて示す（未選択＝全デッキ集計のときは表示しない） */}
          <div className="flex items-center gap-2">
            {hasOwnDeckSprite && (
              <div className="flex items-center gap-0 shrink-0">
                <PokemonSprite id={ownDeckSprite1?.id} size={OWN_DECK_SPRITE_SIZE} />
                <PokemonSprite id={ownDeckSprite2?.id} size={OWN_DECK_SPRITE_SIZE} />
              </div>
            )}
            {/* 期間セレクタより一段小さくし、月毎の勝率推移パネルのデッキセレクタと寸法を揃える */}
            <div className="relative flex-1 min-w-0">
              <select
                name="opponent-deck-usage-own-deck"
                value={ownDeckId}
                onChange={(e) => setOwnDeckId(e.target.value)}
                className="w-full appearance-none rounded-lg border border-default-200 bg-default-100 pl-3 pr-7 py-1.5 text-xs font-bold text-default-700 focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">使用したすべてのデッキで集計</option>
                {ownDecks.map((deck) => (
                  <option key={deck.deck_id} value={deck.deck_id}>
                    {deck.name}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-default-400 text-[0.625rem]">
                ▼
              </span>
            </div>
          </div>

          {/* 期間ラベル */}
          <p className="text-center text-xs text-default-400 -mt-2">
            {filterLabel}
            {ownDeckSuffix}
            <br />
            対戦相手のデッキ分布
          </p>

          {/* グラフ + 凡例 */}
          <OpponentDeckDistributionChart
            decks={decks}
            isLoading={isLoading}
            hasData={stat !== null}
            emptyMessage={
              "この期間の対戦記録がまだありません。\n記録を作成すると対戦相手のデッキ分布が表示されます。"
            }
          />

        </CardBody>
      </Card>

      <PanelShareModal
        isOpen={shareOpen}
        onOpenChange={() => setShareOpen((open) => !open)}
        onClose={() => setShareOpen(false)}
        description="対戦相手のデッキ分布を画像にして、ポスト文と一緒にシェアできます。"
        postText={buildDeckDistributionPostText(shareSubtitle, shareRows.rows)}
        filenamePrefix="opponent_deck_usage"
      >
        {(width) => (
          <DeckDistributionShareCard
            title="対戦相手のデッキ分布"
            subtitle={shareSubtitle}
            rows={shareRows.rows}
            colors={shareRows.colors}
            softColors={shareRows.softColors}
            usageLabel="対面率"
            width={width}
          />
        )}
      </PanelShareModal>
    </>
  );
}
