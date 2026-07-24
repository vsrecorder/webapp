"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { Button, Card, CardBody, Chip, useDisclosure } from "@heroui/react";
import { LuChevronRight, LuFilePen, LuLock } from "react-icons/lu";
import { sendGAEvent } from "@next/third-parties/google";

import PokemonSprite from "@app/components/atoms/PokemonSprite";
import DeckCodeQuickStartModal from "@app/components/organisms/Deck/Modal/DeckCodeQuickStartModal";
import { getDeckSpriteBySlot } from "@app/utils/deckSprite";
import { fingerprintKey } from "@app/utils/fingerprint";
import { rankableDecks, exclOtherTotalOf } from "@app/utils/deckEnv";
import { lastWeekValue } from "@app/utils/week";
import { DeckData, DeckGetResponseType } from "@app/types/deck";
import {
  WeeklyDeckUsageItemType,
  WeeklyDeckUsageStatType,
} from "@app/types/weekly_deck_usage_stat";

// 施策E-2「環境の窓」カード。
//
// 記録がまだ少ないユーザー(3件未満)は、自分の勝率が貯まるまで価値を得られない(価値の後払い
// 構造・engagement-strategy-blindspots.md §2)。そこで、既に持っているプラットフォーム全体の
// 週次デッキ使用率(/deck_meta と同じ集計)に、ユーザー自身の登録デッキを突き合わせ、
// 「あなたのデッキは環境◯位」を記録が貯まる前に先出しする。あわせて「あなた自身の勝率が
// 入る空欄(予約席)」を見せ、「見る→書く」への動機に変える。
//
// 複数デッキを持つユーザーは、セレクタで見たいデッキを選べる(選んだデッキの順位・予約席・
// 当たりやすい相手に切り替わる)。突合はフロントだけで完結する(core-api 改修なし)。自分デッキの
// pokemon_sprites からサーバと同じ規則で指紋を再計算し(fingerprint.ts)、環境各行の fingerprint と
// 一致する行を探す。表示条件(記録3件未満・トグル有効)はサーバ側(Dashboard.tsx)で判定するため、
// このコンポーネントは「表示すると決まったとき」だけ描画される。

type Props = {
  // 対象ユーザーの現在の記録件数(0〜2)。予約席の文言・CTA を「まだ0件」と「1〜2件」で
  // 出し分けるために使う。1〜2件のユーザーは勝率が既にあるが統計的に無意味な段階のため、
  // 「まだ参考にならない」と正直に見せる(blindspots §2)。
  totalRecords: number;
  // GA 計測のラベル用。FirstRecordCtaCard と同じくコホート別に効果を見られるようにする。
  cohortWeek?: string;
  daysSinceSignup?: number;
};

// GA 用の状態ラベル。A=ランク入りデッキを持つ / B=デッキはあるが全てランク外 / C=デッキ未登録。
type GaVariant = "A" | "B" | "C";

// 自分の登録デッキ1つ分の、環境上での立ち位置。rank/row は圏外なら null。
type DeckPosition = {
  deck: DeckData;
  fingerprint: string;
  rank: number | null;
  row: WeeklyDeckUsageItemType | null;
};

// 勝率に応じた色分け（WeeklyDeckUsagePanel・既存の統計表示と同じ閾値）。
function winRateChipColor(rate: number): "success" | "default" | "warning" | "danger" {
  if (rate >= 0.55) return "success";
  if (rate >= 0.45) return "default";
  if (rate >= 0.4) return "warning";
  return "danger";
}

// 予約席の「環境の平均勝率」を色付きテキストで出すためのクラス（チップと同じ意味色）。
function winRateTextClass(rate: number): string {
  const color = winRateChipColor(rate);
  if (color === "success") return "text-success";
  if (color === "warning") return "text-warning";
  if (color === "danger") return "text-danger";
  return "text-default-600";
}

// デッキ変種のスプライトを2枠固定で表示する（WeeklyDeckUsagePanel の DeckSprites と同じ流儀）。
function DeckSprites({
  sprites,
  size = 32,
}: {
  sprites: { id: string; position?: number }[] | undefined;
  size?: number;
}) {
  const list = sprites ?? [];
  return (
    <div className="flex items-center gap-0 shrink-0">
      {([1, 2] as const).map((slot) => (
        <PokemonSprite key={slot} id={getDeckSpriteBySlot(list, slot)?.id} size={size} />
      ))}
    </div>
  );
}

// 上位3件をメダル配色で強調する（WeeklyDeckUsagePanel の RankBadge と同じ）。
function RankBadge({ rank }: { rank: number }) {
  const style =
    rank === 1
      ? "bg-amber-400/20 text-amber-600 ring-1 ring-amber-400/40"
      : rank === 2
        ? "bg-default-300/30 text-default-500 ring-1 ring-default-300/60"
        : rank === 3
          ? "bg-orange-400/20 text-orange-700 ring-1 ring-orange-400/40"
          : "bg-default-100 text-default-400";

  return (
    <span
      className={`flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-black shrink-0 ${style}`}
    >
      {rank}
    </span>
  );
}

// ランキングの1行（自分のデッキなら isMe でハイライト＋デッキ名を出す）。
// displayRate は表示する使用率。「その他を除いた割合」(count / exclOtherTotal)を渡す。
function DeckRankRow({
  rank,
  item,
  displayRate,
  isMe,
  meName,
}: {
  rank: number;
  item: WeeklyDeckUsageItemType;
  displayRate: number;
  isMe?: boolean;
  meName?: string;
}) {
  return (
    <div
      className={`flex flex-col gap-1.5 rounded-xl px-3 py-2 ${
        isMe ? "bg-primary/10 ring-1 ring-primary/60" : "bg-default-100"
      }`}
    >
      <div className="flex items-center gap-2">
        <RankBadge rank={rank} />
        <DeckSprites sprites={item.pokemon_sprites} />
        {isMe && (
          <>
            {meName && (
              <span className="font-bold text-xs text-default-600 truncate">
                {meName}
              </span>
            )}
            <Chip
              size="sm"
              color="primary"
              variant="flat"
              classNames={{ base: "h-5 px-0.5", content: "text-[10px] font-bold px-1.5" }}
            >
              あなたのデッキ
            </Chip>
          </>
        )}
        <span className="ml-auto text-lg font-black tabular-nums text-default-700 shrink-0 leading-none">
          {(displayRate * 100).toFixed(1)}
          <span className="text-xs font-bold text-default-400">%</span>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-default-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-primary/70"
            style={{
              width: `${Math.min(100, Math.max(2, Math.round(displayRate * 100)))}%`,
            }}
          />
        </div>
        <Chip
          size="sm"
          variant="flat"
          color={winRateChipColor(item.win_rate)}
          classNames={{
            base: "h-5 px-0.5 shrink-0",
            content: "text-[10px] font-bold tabular-nums px-1.5",
          }}
        >
          勝率 {(item.win_rate * 100).toFixed(1)}%
        </Chip>
      </div>
    </div>
  );
}

// 使用率ランキングのリスト。使用率は「その他を除いた割合」(count / exclOtherTotal)で表示する。
// 同じデッキがカード内のどの表示でも同じ%になるよう、全ランキングをこの基準に統一する。
function RankingList({
  items,
  exclOtherTotal,
  selectedFingerprint,
  selectedName,
}: {
  items: WeeklyDeckUsageItemType[];
  exclOtherTotal: number;
  selectedFingerprint?: string;
  selectedName?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {items.map((item, idx) => {
        const isMe =
          selectedFingerprint != null && item.fingerprint === selectedFingerprint;
        return (
          <DeckRankRow
            key={item.fingerprint}
            rank={idx + 1}
            item={item}
            displayRate={
              exclOtherTotal > 0 ? item.count / exclOtherTotal : item.usage_rate
            }
            isMe={isMe}
            meName={isMe ? selectedName : undefined}
          />
        );
      })}
    </div>
  );
}

// 自分の登録デッキを選ぶ横スクロールのセレクタ。各チップに順位/圏外も出す。
function DeckSelector({
  positions,
  selectedId,
  onSelect,
}: {
  positions: DeckPosition[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {positions.map((p) => {
        const active = p.deck.id === selectedId;
        return (
          <button
            key={p.deck.id}
            type="button"
            onClick={() => onSelect(p.deck.id)}
            aria-pressed={active}
            className={`flex items-center gap-1.5 shrink-0 rounded-full border pl-1 pr-2.5 py-1 transition-colors ${
              active
                ? "border-primary bg-primary/10"
                : "border-default-200 bg-default-50 hover:bg-default-100"
            }`}
          >
            <DeckSprites sprites={p.deck.pokemon_sprites} size={22} />
            <span
              className={`text-[11px] font-bold max-w-26 truncate ${
                active ? "text-primary" : "text-default-600"
              }`}
            >
              {p.deck.name}
            </span>
            <span
              className={`text-[10px] font-black tabular-nums ${
                p.rank != null
                  ? active
                    ? "text-primary"
                    : "text-default-500"
                  : "text-default-400"
              }`}
            >
              {p.rank != null ? `${p.rank}位` : "圏外"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// 予約席: 環境の平均勝率（借り物・実線）と、あなたの勝率（まだ無い/参考にならない・破線）を
// 並べて見せる。空欄を「自分の数字で埋めたい未完成」に変え、記録への動機にする。
// 記録0件と1〜2件で文言を出し分ける（1〜2件は勝率が既にあるが統計的に無意味な段階のため、
// 「まだ参考にならない」と正直に伝える）。
function ReservedSeat({
  envWinRate,
  totalRecords,
}: {
  envWinRate: number;
  totalRecords: number;
}) {
  const yourSub =
    totalRecords === 0
      ? "あなたの記録から算出"
      : `まだ${totalRecords}件では参考になりません`;
  const hint =
    totalRecords === 0
      ? "1件記録すると、ここに「あなた vs 環境平均」が出ます"
      : "記録を続けると、あなたの数字が環境平均と比べられるようになります";

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-dashed border-default-300 bg-default-50 px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-bold text-default-600">
          このデッキの全体勝率
          <span className="block text-[10px] font-medium text-default-400 mt-0.5">
            環境の平均（借り物）
          </span>
        </div>
        <span
          className={`text-lg font-black tabular-nums ${winRateTextClass(envWinRate)}`}
        >
          {(envWinRate * 100).toFixed(1)}%
        </span>
      </div>
      <div className="h-px bg-default-200" />
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-bold text-default-600">
          あなたの勝率
          <span className="block text-[10px] font-medium text-default-400 mt-0.5">
            {yourSub}
          </span>
        </div>
        <span className="text-lg font-black tabular-nums text-default-300 tracking-widest">
          — —
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-primary leading-snug">
        <LuLock className="w-3 h-3 shrink-0" />
        {hint}
      </div>
    </div>
  );
}

// ランク入りデッキのヒーロー表示（環境◯位＋使用率・件数）。
function RankedHero({
  deck,
  rank,
  row,
}: {
  deck: DeckData;
  rank: number;
  row: WeeklyDeckUsageItemType;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-default-50 border border-default-100 px-3.5 py-3">
      <DeckSprites sprites={deck.pokemon_sprites} size={40} />
      <div className="min-w-0 flex-1">
        <div className="font-bold text-sm truncate">{deck.name}</div>
        <div className="flex items-baseline gap-2 mt-1 flex-wrap">
          <span className="text-2xl font-black leading-none tabular-nums">
            環境{rank}
            <span className="text-xs font-black text-default-400 ml-0.5">位</span>
          </span>
          <span className="text-[11px] text-default-500 tabular-nums">
            使用率 {(row.usage_rate * 100).toFixed(1)}% ・ {row.count}件
          </span>
        </div>
      </div>
    </div>
  );
}

// ランク外デッキのヒーロー表示。
function RankedOutHero({ deck }: { deck: DeckData }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-default-50 border border-default-100 px-3.5 py-3">
      <DeckSprites sprites={deck.pokemon_sprites} size={40} />
      <div className="min-w-0 flex-1">
        <div className="font-bold text-sm truncate">{deck.name}</div>
        <div className="text-sm font-bold text-default-500 mt-1">今週はまだランク外</div>
        <div className="text-[11px] text-default-400 mt-0.5 leading-snug">
          出現が少なく、まだ集計対象に届いていません
        </div>
      </div>
    </div>
  );
}

// ランク外デッキに添える希少性の訴求。
function EncourageNote() {
  return (
    <p className="text-xs font-bold text-primary leading-relaxed rounded-xl bg-primary/10 px-3 py-2.5">
      あなたの記録が、このデッキの対戦環境データを作ります。
    </p>
  );
}

function RankHeader({
  title,
  subtitle = "使用率順",
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center justify-between px-1 -mb-1">
      <span className="text-[11px] font-black text-default-500">{title}</span>
      <span className="text-[10px] text-default-400">{subtitle}</span>
    </div>
  );
}

// 「記録する」CTA。表示中のデッキがランク入りか、記録が0件か1〜2件かでラベルを出し分ける。
function RecordCtaButton({
  ranked,
  totalRecords,
  deck,
  onClick,
}: {
  ranked: boolean;
  totalRecords: number;
  // 選択中のデッキ。あれば「使用デッキ選択済み」でクイック記録を開く。
  deck?: DeckData;
  onClick: () => void;
}) {
  const label = ranked
    ? totalRecords === 0
      ? "この枠を、あなたの1戦で解錠する"
      : "もう1戦、記録する"
    : totalRecords === 0
      ? "このデッキを使用して最初の記録を作成する"
      : "このデッキを使用して記録を続ける";

  // 選択中のデッキがあれば、そのデッキを使用デッキに選択済みの状態で記録フォーム(/records/quick)を開く。
  const href = deck
    ? `/records/quick?${new URLSearchParams({
        deck_id: deck.id,
        deck_code_id: deck.latest_deck_code?.id ?? "",
        deck_name: deck.name,
      }).toString()}`
    : "/records/quick";

  return (
    <Button
      as={Link}
      href={href}
      color="primary"
      radius="full"
      startContent={<LuFilePen className="w-4 h-4" />}
      className="font-bold shadow-md w-full"
      onPress={onClick}
    >
      {label}
    </Button>
  );
}

function BetaHeader({ stat }: { stat: WeeklyDeckUsageStatType }) {
  const period =
    stat.week_start && stat.week_end ? `${stat.week_start} 〜 ${stat.week_end} の週` : "";
  return (
    <div className="flex items-start gap-2">
      <Chip
        size="sm"
        color="warning"
        variant="flat"
        classNames={{
          base: "h-5 px-0.5 shrink-0",
          content: "text-[10px] font-black px-1.5",
        }}
      >
        β機能
      </Chip>
      <span className="text-[11px] text-default-400 leading-snug">
        プラットフォーム全体の週次デッキ使用率
        {period && (
          <>
            <br />
            {period} ・ {stat.contributor_count}人 / のべ{stat.total_votes}件
          </>
        )}
      </span>
    </div>
  );
}

function SkeletonCard() {
  return (
    <Card className="shadow-md">
      <CardBody className="gap-3 p-4">
        <div className="h-4 w-40 rounded bg-default-100 animate-pulse" />
        <div className="h-16 rounded-xl bg-default-100 animate-pulse" />
        <div className="h-20 rounded-xl bg-default-100 animate-pulse" />
      </CardBody>
    </Card>
  );
}

// 自分の(識別可能な)デッキを選んで、その環境順位・予約席・当たりやすい相手を見せる本体。
// 選択状態はこの中に閉じ込める（positions は常に1件以上）。
function SelectModeView({
  positions,
  ranking,
  exclOtherTotal,
  totalRecords,
  onRecordClick,
  onSwitch,
}: {
  positions: DeckPosition[];
  ranking: WeeklyDeckUsageItemType[];
  exclOtherTotal: number;
  totalRecords: number;
  onRecordClick: () => void;
  onSwitch: () => void;
}) {
  // 既定は先頭 = 最上位ランク（positions はランク入りを上位に整列済み）。
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const selected = positions.find((p) => p.deck.id === selectedDeckId) ?? positions[0];
  const ranked = selected.rank != null;

  function handleSelect(id: string) {
    setSelectedDeckId(id);
    onSwitch();
  }

  return (
    <>
      <span className="text-xs font-bold text-default-500 tracking-wide">
        あなたのデッキと類似する対戦環境データ
      </span>

      {positions.length >= 2 && (
        <DeckSelector
          positions={positions}
          selectedId={selected.deck.id}
          onSelect={handleSelect}
        />
      )}

      {selected.rank != null && selected.row != null ? (
        <>
          <RankedHero deck={selected.deck} rank={selected.rank} row={selected.row} />
          <ReservedSeat envWinRate={selected.row.win_rate} totalRecords={totalRecords} />
          <RankHeader
            title="今週あなたが当たりやすい相手のデッキ"
            subtitle="その他を除いた割合"
          />
          <RankingList
            items={ranking.slice(0, 5)}
            exclOtherTotal={exclOtherTotal}
            selectedFingerprint={selected.fingerprint}
            selectedName={selected.deck.name}
          />
        </>
      ) : (
        <>
          <RankedOutHero deck={selected.deck} />
          <EncourageNote />
          <RankHeader title="今週の環境 TOP3" />
          <RankingList items={ranking.slice(0, 3)} exclOtherTotal={exclOtherTotal} />
        </>
      )}

      <RecordCtaButton
        ranked={ranked}
        totalRecords={totalRecords}
        deck={selected.deck}
        onClick={onRecordClick}
      />
    </>
  );
}

export default function EnvironmentWindowCard({
  totalRecords,
  cohortWeek,
  daysSinceSignup,
}: Props) {
  const [stat, setStat] = useState<WeeklyDeckUsageStatType | null>(null);
  const [userDecks, setUserDecks] = useState<DeckData[] | null>(null);
  const [failed, setFailed] = useState(false);

  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  // 環境ランキング（公開・認証不要）と自分の登録デッキ（要ログイン）を並行取得する。
  // どちらか一方でも失敗したら、誤情報を出さないためカードごと非表示にする。
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [statRes, decksRes] = await Promise.all([
          fetch(`/api/deck_meta/weekly_usage?week=${lastWeekValue()}`, {
            cache: "no-store",
          }),
          fetch(`/api/decks?archived=false&cursor=`, { cache: "no-store" }),
        ]);

        if (!statRes.ok || !decksRes.ok) throw new Error("fetch failed");

        const statData: WeeklyDeckUsageStatType = await statRes.json();
        const decksData: DeckGetResponseType = await decksRes.json();

        if (cancelled) return;
        setStat(statData);
        setUserDecks(decksData.decks.map((d) => d.data));
      } catch (e) {
        console.error(e);
        if (!cancelled) setFailed(true);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // ランキング対象（「その他」= 空指紋を除く・使用率降順）。共通ロジックに集約(deckEnv)。
  const rankable = useMemo(() => (stat ? rankableDecks(stat) : []), [stat]);

  // 自分の登録デッキ(スプライトあり=環境上で識別可能)ごとの立ち位置。ランク入りを上位に。
  const deckPositions = useMemo<DeckPosition[]>(() => {
    if (!userDecks) return [];
    const list: DeckPosition[] = [];
    for (const deck of userDecks) {
      const fp = fingerprintKey((deck.pokemon_sprites ?? []).map((s) => s.id));
      if (fp === "") continue; // スプライト未設定は環境上で識別できないため選択肢に出さない
      const idx = rankable.findIndex((d) => d.fingerprint === fp);
      list.push({
        deck,
        fingerprint: fp,
        rank: idx >= 0 ? idx + 1 : null,
        row: idx >= 0 ? rankable[idx] : null,
      });
    }
    // ランク入り(順位昇順) → 圏外 の順に並べ、既定選択が最上位ランクになるようにする。
    return list.sort((a, b) => {
      if (a.rank == null && b.rank == null) return 0;
      if (a.rank == null) return 1;
      if (b.rank == null) return -1;
      return a.rank - b.rank;
    });
  }, [userDecks, rankable]);

  const hasRanked = deckPositions.some((p) => p.rank != null);

  // 描画モード。select=自分の識別可能なデッキを選んで見る / B=デッキはあるが識別不能 / C=未登録。
  const renderMode: "select" | "B" | "C" | null = useMemo(() => {
    if (!stat || !userDecks) return null; // 読み込み中
    if (rankable.length === 0) return null; // 対戦環境データが無い週はカードごと出さない
    if (deckPositions.length > 0) return "select";
    if (userDecks.length > 0) return "B";
    return "C";
  }, [stat, userDecks, rankable, deckPositions]);

  // GA 用ラベル。A=ランク入りデッキを持つ / B=デッキはあるが全てランク外 / C=未登録。
  const gaVariant: GaVariant = hasRanked
    ? "A"
    : userDecks && userDecks.length > 0
      ? "B"
      : "C";

  const eventParams = useMemo(
    () => ({
      cohort_week: cohortWeek ?? "unknown",
      days_since_signup: daysSinceSignup ?? -1,
      total_records: totalRecords,
      deck_count: deckPositions.length,
    }),
    [cohortWeek, daysSinceSignup, totalRecords, deckPositions.length],
  );

  // 表示回数を計測（状態が確定したとき1回だけ）。
  const sentImpression = useRef(false);
  useEffect(() => {
    if (renderMode == null || sentImpression.current) return;
    sentImpression.current = true;
    sendGAEvent("event", "env_window_impression", { ...eventParams, variant: gaVariant });
  }, [renderMode, gaVariant, eventParams]);

  function handleRecordClick() {
    sendGAEvent("event", "env_window_cta_click", {
      ...eventParams,
      variant: gaVariant,
      action: "record",
    });
  }

  function handleDeckRegisterClick() {
    sendGAEvent("event", "env_window_cta_click", {
      ...eventParams,
      variant: gaVariant,
      action: "deck_register",
    });
    onOpen();
  }

  function handleDeckSwitch() {
    sendGAEvent("event", "env_window_deck_switch", {
      ...eventParams,
      variant: gaVariant,
    });
  }

  if (failed) return null;
  if (stat == null || userDecks == null) return <SkeletonCard />;
  if (renderMode == null) return null;

  // 「その他」を除いた割合の母数。カード内の全ランキングをこの基準で表示する(deckEnv)。
  const exclOtherTotal = exclOtherTotalOf(stat);
  const top3 = rankable.slice(0, 3);

  return (
    <>
      <Card className="shadow-md">
        <CardBody className="gap-3 p-4">
          <BetaHeader stat={stat} />

          {renderMode === "C" ? (
            <>
              <span className="text-xs font-bold text-default-500 tracking-wide">
                今週の対戦環境
              </span>
              <p className="text-xs text-default-500 leading-relaxed rounded-xl bg-default-50 border border-default-100 px-3 py-2.5">
                デッキを登録すると、
                <span className="font-bold text-default-700">
                  あなたのデッキが環境で何位か
                </span>
                がここに表示されます。
              </p>

              <RankHeader title="使用率ランキング" subtitle="使用率が高い順" />
              <RankingList items={top3} exclOtherTotal={exclOtherTotal} />

              <Button
                color="primary"
                variant="flat"
                radius="full"
                startContent={<LuChevronRight className="w-4 h-4" />}
                className="font-bold w-full"
                onPress={handleDeckRegisterClick}
              >
                デッキコードからデッキを登録する
              </Button>
            </>
          ) : renderMode === "B" ? (
            <>
              <span className="text-xs font-bold text-default-500 tracking-wide">
                あなたのデッキと類似する対戦環境データ
              </span>
              <RankedOutHero deck={userDecks[0]} />
              <EncourageNote />
              <RankHeader title="今週の環境 TOP3" />
              <RankingList items={top3} exclOtherTotal={exclOtherTotal} />
              <RecordCtaButton
                ranked={false}
                totalRecords={totalRecords}
                deck={userDecks[0]}
                onClick={handleRecordClick}
              />
            </>
          ) : (
            <SelectModeView
              positions={deckPositions}
              ranking={rankable}
              exclOtherTotal={exclOtherTotal}
              totalRecords={totalRecords}
              onRecordClick={handleRecordClick}
              onSwitch={handleDeckSwitch}
            />
          )}
        </CardBody>
      </Card>

      <DeckCodeQuickStartModal isOpen={isOpen} onOpenChange={onOpenChange} />
    </>
  );
}
