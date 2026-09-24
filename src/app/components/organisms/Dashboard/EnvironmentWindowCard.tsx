"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { Button, Card, CardBody, Chip, Tab, Tabs, useDisclosure } from "@heroui/react";
import { LuChevronDown, LuChevronRight, LuFilePen, LuLock } from "react-icons/lu";
import { sendGAEvent } from "@next/third-parties/google";

import DeckSprites from "@app/components/molecules/DeckSprites";
import { WeeklyDeckUsageGroupingNote } from "@app/components/organisms/DeckMeta/WeeklyDeckUsageTexts";
import DeckCodeQuickStartModal from "@app/components/organisms/Deck/Modal/DeckCodeQuickStartModal";
import EnvironmentWindowCardSkeleton from "@app/components/organisms/Dashboard/Skeleton/EnvironmentWindowCardSkeleton";
import { deckFingerprintKey } from "@app/utils/fingerprint";
import { UI_DEFAULT_DECK_USAGE_GROUPING } from "@app/utils/deckUsageGrouping";
import { rankableDecks, exclOtherTotalOf } from "@app/utils/deckEnv";
import { lastWeekValue } from "@app/utils/week";
import { DECK_USAGE_ALL_TIME_QUERY } from "@app/utils/excludeDefaultMatches";
import { DeckData, DeckGetAllType, isFavoritedDeck } from "@app/types/deck";
import { DeckUsageItemType, DeckUsageStatType } from "@app/types/deck_usage_stat";
import {
  WeeklyDeckUsageGroupingType,
  WeeklyDeckUsageItemType,
  WeeklyDeckUsageStatType,
} from "@app/types/weekly_deck_usage_stat";

// 「環境ウィンドウ(E-2)」と「対戦環境分析(週次デッキ使用率)」を1枚に組み合わせたパネル。
//
// - 上段: 自分の登録デッキの環境上の立ち位置（環境◯位）＋「あなたの勝率 vs 環境平均勝率」の勝率比較。
//   記録が無いデッキは空欄(予約席)、記録があるデッキは実勝率(deck-usage)を入れて差分を出す。
// - 下段: プラットフォーム全体の使用率ランキング（5位まで＋アコーディオンで6〜10位）。週セレクタは無し。
//
// 配置は記録数で出し分ける（Dashboard.tsx 側）: 3件未満はプロフィール直下、4件以上は「対戦環境分析」の位置。
// 突合はフロントで完結（core-api 改修なし）。自分デッキの pokemon_sprites からサーバと同じ規則で指紋を
// 再計算し(fingerprint.ts)、環境各行の fingerprint と一致する行を探す。

type Props = {
  // 対象ユーザーID。デッキ別の実勝率(deck-usage)を引いて「あなたの勝率 vs 環境平均勝率」を出すために使う。
  userId: string;
  // 対象ユーザーの現在の記録件数(0〜3にキャップ。3は「3件以上」)。CTA・予約席の文言出し分け用。
  totalRecords: number;
  // GA 計測のラベル用。
  cohortWeek?: string;
  daysSinceSignup?: number;
  // 見出し付きのセクション（ダッシュボードの「対戦環境データ」）として置かれているか。
  // true のときは、環境データが無い週・取得失敗でもカードを消さず空状態を描画する
  // （見出しはサーバ側で描画されるため、ここで消すと見出しだけが宙に浮いて残る）。
  showEmptyState?: boolean;
};

// GA 用の状態ラベル。A=ランク入りデッキを持つ / B=デッキはあるが全てランク外 / C=デッキ未登録。
type GaVariant = "A" | "B" | "C";

// 自分の登録デッキ1つ分の、環境上での立ち位置。rank/row は圏外なら null。
type DeckPosition = {
  deck: DeckData;
  // いま出ているランキングの集計単位で作った指紋(行との突合に使う)
  fingerprint: string;
  // 組み合わせ単位(exact)で作った指紋。1体目でまとめた行の内訳は組み合わせ単位なので、
  // 「内訳のどれが自分のデッキか」はこちらで突き合わせる
  exactFingerprint: string;
  rank: number | null;
  row: WeeklyDeckUsageItemType | null;
  // お気に入りに設定されているデッキか(ユーザーごとに1つだけ)。既定選択の決定に使う。
  favorited: boolean;
};

// あなたのデッキ別の実績（deck-usage 由来）。記録が無ければ undefined。
type OwnStat = { winRate: number; count: number };

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

// ポイント差（±）を "+3.2" / "-1.5" / "±0" で表す。
function formatDeltaPt(pt: number): string {
  const s = Math.abs(pt).toFixed(1);
  const trimmed = s.endsWith(".0") ? s.slice(0, -2) : s;
  return pt === 0 ? "±0" : pt > 0 ? `+${trimmed}` : `-${trimmed}`;
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
      className={`flex items-center justify-center w-6 h-6 rounded-full text-[0.6875rem] font-black shrink-0 ${style}`}
    >
      {rank}
    </span>
  );
}

/*
 * 「1体目でまとめる」で束ねた行の内訳1件（2体目違いの派生）。
 * 対戦環境分析(WeeklyDeckUsagePanel の BreakdownRow)と同じ見せ方に揃える。
 * 使用率はこのカード全体と同じ基準(その他を除いた割合)で出すので、内訳の合計は行の使用率に一致する。
 */
function BreakdownRow({
  item,
  usageRate,
  isMe,
}: {
  item: WeeklyDeckUsageItemType;
  usageRate: number;
  // 選択中の自分のデッキと同じ組み合わせか
  isMe?: boolean;
}) {
  return (
    // 320px 幅だと「スプライト2体＋あなたの印＋使用率＋勝率」で行が埋まるため、
    // 間隔とスプライトを行(DeckRankRow)より一回り詰める
    <div
      className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 ${
        isMe ? "bg-primary/10 ring-1 ring-primary/60" : "bg-default-50"
      }`}
    >
      <DeckSprites sprites={item.pokemon_sprites} size={28} />
      {/* 束ねた行のどれが自分のデッキかを示す。行(DeckRankRow)の「あなたのデッキ」より
          小さく短くする。内訳の行は使用率・件数・勝率で幅がほぼ埋まっており、
          同じ文言を入れると 390px 幅で 11px はみ出す(実測) */}
      {isMe && (
        <Chip
          size="sm"
          color="primary"
          variant="flat"
          classNames={{
            base: "h-4 px-0 shrink-0",
            content: "text-[0.5rem] font-bold px-1",
          }}
        >
          あなた
        </Chip>
      )}
      <div className="ml-auto flex flex-col items-end shrink-0 leading-none">
        <span className="text-sm font-black tabular-nums text-default-600">
          {(usageRate * 100).toFixed(1)}
          <span className="text-[0.625rem] font-bold text-default-400">%</span>
        </span>
        {/* 件数だけを添える。このカードの使用率は常に「その他を除いた割合」で、
            それは節の見出し(subtitle)が示しているため、行ごとに分母を書かない。
            書くと 320px 幅で「あなた」の印ごと行からはみ出す(実測) */}
        <span className="mt-0.5 text-[0.5625rem] tabular-nums text-default-400">
          {item.count}件
        </span>
      </div>
      <Chip
        size="sm"
        variant="flat"
        color={winRateChipColor(item.win_rate)}
        classNames={{
          base: "h-5 px-0.5 shrink-0",
          content: "text-[0.625rem] font-bold tabular-nums px-1.5",
        }}
      >
        勝率 {(item.win_rate * 100).toFixed(1)}%
      </Chip>
    </div>
  );
}

// ランキングの1行（自分のデッキなら isMe でハイライト＋デッキ名を出す）。
// displayRate は表示する使用率。「その他を除いた割合」(count / exclOtherTotal)を渡す。
function DeckRankRow({
  rank,
  item,
  displayRate,
  exclOtherTotal,
  isMe,
  meName,
  myMemberFingerprint,
}: {
  rank: number;
  item: WeeklyDeckUsageItemType;
  displayRate: number;
  // 内訳の使用率を行と同じ基準で出すための分母（「その他」を除いた件数）
  exclOtherTotal: number;
  isMe?: boolean;
  meName?: string;
  // 選択中の自分のデッキの組み合わせ単位の指紋。内訳のどれが自分かを示すのに使う
  myMemberFingerprint?: string;
}) {
  /*
   * 束ねる前の組み合わせ。「1体目でまとめる」で集計したときだけ入っている。
   * 行は1体目しか出していないので、組み合わせが1種類の行でも2体目が分かる新しい情報になる。
   * (このカードのランキングは「その他」を除いてあるため、内訳が入るのはこの行だけ)
   */
  const members = item.members ?? [];
  const [expanded, setExpanded] = useState(false);

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
              classNames={{ base: "h-5 px-0.5", content: "text-[0.625rem] font-bold px-1.5" }}
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
            content: "text-[0.625rem] font-bold tabular-nums px-1.5",
          }}
        >
          勝率 {(item.win_rate * 100).toFixed(1)}%
        </Chip>
      </div>

      {/* 束ねた組み合わせの内訳。対戦環境分析と同じく、その場で開いて確かめられるようにする */}
      {members.length > 0 && (
        <div className="mt-0.5 flex flex-col gap-1">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="flex items-center justify-center gap-1 py-1 text-[0.625rem] font-bold text-default-500 hover:text-default-600"
          >
            <LuChevronDown
              className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
            />
            {expanded
              ? "内訳を閉じる"
              : `組み合わせの内訳を見る（${members.length}種類）`}
          </button>

          {expanded && (
            <div className="flex flex-col gap-1">
              {members.map((member, idx) => (
                <BreakdownRow
                  key={`${member.fingerprint || "member"}-${idx}`}
                  item={member}
                  usageRate={
                    exclOtherTotal > 0 ? member.count / exclOtherTotal : member.usage_rate
                  }
                  isMe={
                    myMemberFingerprint != null &&
                    member.fingerprint === myMemberFingerprint
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 使用率ランキングのリスト。使用率は「その他を除いた割合」(count / exclOtherTotal)で表示する。
// startRank から連番で順位を振る（アコーディオンで 6〜10 位を出すときに使う）。
function RankingList({
  items,
  exclOtherTotal,
  startRank = 1,
  selectedFingerprint,
  selectedName,
  selectedMemberFingerprint,
}: {
  items: WeeklyDeckUsageItemType[];
  exclOtherTotal: number;
  startRank?: number;
  selectedFingerprint?: string;
  selectedName?: string;
  selectedMemberFingerprint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {items.map((item, idx) => {
        const isMe =
          selectedFingerprint != null && item.fingerprint === selectedFingerprint;
        return (
          <DeckRankRow
            key={item.fingerprint}
            rank={startRank + idx}
            item={item}
            displayRate={
              exclOtherTotal > 0 ? item.count / exclOtherTotal : item.usage_rate
            }
            exclOtherTotal={exclOtherTotal}
            isMe={isMe}
            meName={isMe ? selectedName : undefined}
            myMemberFingerprint={selectedMemberFingerprint}
          />
        );
      })}
    </div>
  );
}

// 使用率ランキング（5位まで＋アコーディオンで6〜10位）。週セレクタは持たない。
function UsageRankingSection({
  ranking,
  exclOtherTotal,
  title,
  subtitle = "その他を除いた割合",
  selectedFingerprint,
  selectedName,
  selectedMemberFingerprint,
}: {
  ranking: WeeklyDeckUsageItemType[];
  exclOtherTotal: number;
  title: string;
  subtitle?: string;
  // 選択中の自分のデッキ: 行との突合用(表示中の集計単位)と、内訳との突合用(組み合わせ単位)
  selectedFingerprint?: string;
  selectedName?: string;
  selectedMemberFingerprint?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const top5 = ranking.slice(0, 5);
  const rest = ranking.slice(5, 10); // 6〜10位

  return (
    <>
      <RankHeader title={title} subtitle={subtitle} />
      <RankingList
        items={top5}
        exclOtherTotal={exclOtherTotal}
        startRank={1}
        selectedFingerprint={selectedFingerprint}
        selectedName={selectedName}
        selectedMemberFingerprint={selectedMemberFingerprint}
      />
      {rest.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {expanded && (
            <RankingList
              items={rest}
              exclOtherTotal={exclOtherTotal}
              startRank={6}
              selectedFingerprint={selectedFingerprint}
              selectedName={selectedName}
              selectedMemberFingerprint={selectedMemberFingerprint}
            />
          )}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="flex items-center justify-center gap-1 py-1.5 text-[0.6875rem] font-bold text-default-500 hover:text-default-600"
          >
            <LuChevronDown
              className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
            />
            {expanded ? "6〜10位を閉じる" : `6〜10位を見る（あと${rest.length}件）`}
          </button>
        </div>
      )}
    </>
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
            {/* 登録デッキの数だけチップが並び、横スクロールで見えているのは数個。
                全部を即時読み込みすると初回のリクエストがデッキ数に比例して増えるため、
                この行だけ遅延読み込みにする。 */}
            <DeckSprites sprites={p.deck.pokemon_sprites} size={22} loading="lazy" />
            <span
              className={`text-[0.6875rem] font-bold max-w-26 truncate ${
                active ? "text-primary" : "text-default-600"
              }`}
            >
              {p.deck.name}
            </span>
            <span
              className={`text-[0.625rem] font-black tabular-nums ${
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

// 「あなたの勝率 vs 環境平均勝率」。環境の平均勝率（借り物）と、あなたの実勝率(deck-usage)を並べて比較する。
// 記録がまだ無いデッキ(ownStat 無し)は「あなたの勝率」を空欄(予約席)にし、記録への動機に変える。
function YourVsEnv({
  envWinRate,
  ownStat,
  totalRecords,
}: {
  envWinRate: number;
  ownStat?: OwnStat;
  totalRecords: number;
}) {
  const hasOwn = ownStat != null && ownStat.count > 0;
  const deltaPt = hasOwn ? (ownStat!.winRate - envWinRate) * 100 : 0;
  const deltaColor =
    deltaPt > 0 ? "text-success" : deltaPt < 0 ? "text-warning" : "text-default-500";

  const hint =
    totalRecords === 0
      ? "記録すると、ここに「あなたの勝率 vs 環境平均勝率」が出ます。"
      : "このデッキを使用して記録すると、あなたの勝率と環境平均勝率を比べられます。";

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-dashed border-default-300 bg-default-50 px-3 py-3">
      <div className="flex items-stretch gap-2">
        {/* 環境平均（借り物） */}
        <div className="flex-1 rounded-lg bg-default-100 px-3 py-2">
          <div className="text-[0.625rem] font-bold text-default-400">
            このデッキの環境平均勝率
          </div>
          <span
            className={`text-lg font-black tabular-nums leading-tight ${winRateTextClass(envWinRate)}`}
          >
            {(envWinRate * 100).toFixed(1)}%
          </span>
        </div>
        {/* あなたの勝率（実データ or 予約席） */}
        <div className="flex-1 rounded-lg bg-default-100 px-3 py-2">
          <div className="text-[0.625rem] font-bold text-default-400">あなたの勝率</div>
          {hasOwn ? (
            <div className="flex items-baseline gap-1">
              <span
                className={`text-lg font-black tabular-nums leading-tight ${winRateTextClass(ownStat!.winRate)}`}
              >
                {(ownStat!.winRate * 100).toFixed(1)}%
              </span>
              <span className="text-[0.625rem] font-bold text-default-400">
                n={ownStat!.count}
              </span>
            </div>
          ) : (
            <span className="text-lg font-black tabular-nums text-default-300 tracking-widest leading-tight">
              — —
            </span>
          )}
        </div>
      </div>
      {hasOwn ? (
        <div className="flex items-center justify-center gap-1.5 rounded-lg bg-default-100/60 py-1.5">
          <span className="text-[0.6875rem] font-bold text-default-500">環境平均より</span>
          <span className={`text-sm font-black tabular-nums ${deltaColor}`}>
            {formatDeltaPt(deltaPt)}pt
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-[0.6875rem] font-bold text-primary leading-snug">
          <LuLock className="w-3 h-3 shrink-0" />
          {hint}
        </div>
      )}
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
        <div className="flex items-baseline gap-2 mt-1 flex-wrap">
          <span className="text-md font-black leading-none tabular-nums">
            環境使用率ランキング {rank}
            <span className="text-sm font-black text-default-400 ml-0.5">位</span>
            <div className="pt-1.5 text-md font-bold truncate">{deck.name}</div>
          </span>

          <span className="text-[0.6875rem] text-default-500 tabular-nums">
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
        <div className="text-[0.6875rem] text-default-400 mt-0.5 leading-snug">
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
      <span className="text-[0.6875rem] font-black text-default-500">{title}</span>
      <span className="text-[0.625rem] text-default-400">{subtitle}</span>
    </div>
  );
}

// 「記録する」CTA。表示中のデッキがランク入りか、記録が0件か1件以上かでラベルを出し分ける。
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
  const isFirst = totalRecords === 0;
  const label = ranked
    ? isFirst
      ? "この枠を、あなたの1戦で解錠する"
      : "もう1戦、記録する"
    : isFirst
      ? "このデッキを使用して最初の記録を作成する"
      : "このデッキを使用して記録を作成する";

  // 遷移先: 記録が無いうち(オンボーディング)はクイック記録(/records/quick)、
  // 記録がある「続ける」導線は通常の記録作成(/records/create)へ。
  // どちらも選択中のデッキを使用デッキに設定済みの状態で開く
  // (/records/create は deck_id・deck_code_id を読んで使用デッキをプリセットする。deck_name は使わない)。
  const href = deck
    ? isFirst
      ? `/records/quick?${new URLSearchParams({
          deck_id: deck.id,
          deck_code_id: deck.latest_deck_code?.id ?? "",
          deck_name: deck.name,
        }).toString()}`
      : `/records/create?${new URLSearchParams({
          deck_id: deck.id,
          deck_code_id: deck.latest_deck_code?.id ?? "",
        }).toString()}`
    : isFirst
      ? "/records/quick"
      : "/records/create";

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

/*
 * 集計単位(どこまでを「同じデッキ」として束ねるか)の切り替え。対戦環境分析
 * (WeeklyDeckUsagePanel)と同じ2択・同じ文言にする。
 *
 * 下段の使用率ランキングだけでなく、上段の「あなたのデッキは環境◯位」にも効く
 * (自分のデッキの指紋も同じ単位で作り直す)ため、カードの先頭に置く。
 */
function GroupingTabs({
  grouping,
  noteGrouping,
  failed,
  onChange,
}: {
  // タブの選択状態(押した瞬間に変わる)
  grouping: WeeklyDeckUsageGroupingType;
  // いま出ているランキングが実際に集計された単位。注記はこちらに合わせる
  // (取得が終わるまでは前の結果が出ているため)
  noteGrouping: WeeklyDeckUsageGroupingType;
  // 切り替えの取得に失敗したか
  failed: boolean;
  onChange: (grouping: WeeklyDeckUsageGroupingType) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Tabs
        fullWidth
        size="sm"
        selectedKey={grouping}
        onSelectionChange={(key) => onChange(key as WeeklyDeckUsageGroupingType)}
        classNames={{ tab: "h-7", tabContent: "font-bold text-xs" }}
        aria-label="デッキのまとめ方"
      >
        <Tab key="first_sprite" title="1体目でまとめる" />
        <Tab key="exact" title="組み合わせ別" />
      </Tabs>
      {failed ? (
        // 中身は前のまとめ方のままなので、食い違っている理由を注記の位置で伝える。
        // もう一方のタブを押せばやり直せる
        <span className="text-center text-[0.625rem] leading-snug text-danger">
          まとめ方を切り替えられませんでした。もう一度お試しください
        </span>
      ) : (
        <WeeklyDeckUsageGroupingNote grouping={noteGrouping} />
      )}
    </div>
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
          content: "text-[0.625rem] font-black px-1.5",
        }}
      >
        β機能
      </Chip>
      <span className="text-[0.6875rem] text-default-400 leading-snug">
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

// 空状態で並べるダミー行。実データの行(DeckRankRow)と同じ骨格・高さで組み、
// 「ここに使用率ランキングが入る」ことを形で伝える。
function DummyRankRow({ rank, barWidth }: { rank: number; barWidth: number }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl bg-default-100 px-3 py-2">
      <div className="flex items-center gap-2">
        <RankBadge rank={rank} />
        <DeckSprites sprites={undefined} />
        <span className="ml-auto text-lg font-black tabular-nums text-default-300 shrink-0 leading-none">
          --.-<span className="text-xs font-bold text-default-300">%</span>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-default-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-default-300"
            style={{ width: `${barWidth}%` }}
          />
        </div>
        <span className="h-5 w-15 rounded-full bg-default-200 shrink-0" />
      </div>
    </div>
  );
}

// 対戦環境データがまだ無い週・取得に失敗したときの空状態。
// ダッシュボードでは見出し(「対戦環境データ」)をサーバ側で描画しているため、ここでカードごと
// 消すと見出しだけが残って中身が無い見た目になる。ランキングの骨格をダミーで示したうえで、
// 何が入る場所なのかと次の一歩(記録の作成・他の週)を添える。
function EmptyStateCard({
  stat,
  failed,
}: {
  // 取得できていれば集計期間・母数を出す。取得失敗時は null。
  stat: WeeklyDeckUsageStatType | null;
  failed: boolean;
}) {
  return (
    <Card className="shadow-md">
      <CardBody className="gap-3 p-4">
        {stat != null && <BetaHeader stat={stat} />}

        {/* 取得失敗時は「ランキングの体裁」だけ整っていると誤解を招くため見出しを出さない。
            集計期間の見出し(サブタイトルの割合基準)も、出す数値が無いここでは伏せる。 */}
        {!failed && <RankHeader title="使用率ランキング" subtitle="" />}
        <div className="flex flex-col gap-1.5 opacity-40" aria-hidden="true">
          {[
            { rank: 1, barWidth: 60 },
            { rank: 2, barWidth: 40 },
            { rank: 3, barWidth: 25 },
          ].map((d) => (
            <DummyRankRow key={d.rank} rank={d.rank} barWidth={d.barWidth} />
          ))}
        </div>

        <p className="text-center text-xs text-default-400 leading-relaxed whitespace-pre-line px-2">
          {failed
            ? "対戦環境データを読み込めませんでした。\n時間をおいて、もう一度お試しください。"
            : "この週の公開可能なデータはまだありません。\n記録が集まると、使用率ランキングが表示されます。"}
        </p>

        {!failed && (
          <div className="flex flex-col gap-1">
            <Button
              as={Link}
              href="/records/create"
              color="primary"
              radius="full"
              startContent={<LuFilePen className="w-4 h-4" />}
              className="font-bold shadow-md w-full"
            >
              対戦記録を作成する
            </Button>
            <Button
              as={Link}
              href="/deck_meta"
              variant="light"
              color="default"
              radius="full"
              className="h-8 text-xs font-bold text-default-500"
            >
              他の週の対戦環境データを見る
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

// 自分の(識別可能な)デッキを選んで、その環境順位・あなたvs環境平均・当たりやすい相手を見せる本体。
function SelectModeView({
  positions,
  ranking,
  exclOtherTotal,
  totalRecords,
  ownStatByDeckId,
  onRecordClick,
  onSwitch,
}: {
  positions: DeckPosition[];
  ranking: WeeklyDeckUsageItemType[];
  exclOtherTotal: number;
  totalRecords: number;
  ownStatByDeckId: Map<string, OwnStat>;
  onRecordClick: () => void;
  onSwitch: () => void;
}) {
  // 既定は先頭 = 最上位ランク（positions はランク入りを上位に整列済み）。
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const selected = positions.find((p) => p.deck.id === selectedDeckId) ?? positions[0];
  const ranked = selected.rank != null;
  const ownStat = ownStatByDeckId.get(selected.deck.id);

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
          <YourVsEnv
            envWinRate={selected.row.win_rate}
            ownStat={ownStat}
            totalRecords={totalRecords}
          />
          <UsageRankingSection
            ranking={ranking}
            exclOtherTotal={exclOtherTotal}
            title="今週あなたが当たりやすい相手のデッキ"
            selectedFingerprint={selected.fingerprint}
            selectedName={selected.deck.name}
            selectedMemberFingerprint={selected.exactFingerprint}
          />
        </>
      ) : (
        <>
          <RankedOutHero deck={selected.deck} />
          <EncourageNote />
          <UsageRankingSection
            ranking={ranking}
            exclOtherTotal={exclOtherTotal}
            title="今週の環境 使用率ランキング"
            // 環境では圏外のデッキでも、1体目でまとめた行の内訳には現れることがある
            selectedMemberFingerprint={selected.exactFingerprint}
          />
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
  userId,
  totalRecords,
  cohortWeek,
  daysSinceSignup,
  showEmptyState = false,
}: Props) {
  const [stat, setStat] = useState<WeeklyDeckUsageStatType | null>(null);
  // デッキのまとめ方(組み合わせ別 / 1体目でまとめる)。対戦環境分析と同じ2択で、
  // 環境ランキングと自分のデッキの順位の両方がこの単位で決まる。
  const [grouping, setGrouping] = useState<WeeklyDeckUsageGroupingType>(
    UI_DEFAULT_DECK_USAGE_GROUPING,
  );
  const [userDecks, setUserDecks] = useState<DeckData[] | null>(null);
  // あなたのデッキ別実績(deck-usage)。取得失敗・未対応でも致命ではないので空配列で続行する。
  const [deckUsage, setDeckUsage] = useState<DeckUsageItemType[]>([]);
  const [failed, setFailed] = useState(false);
  // まとめ方を切り替えたときの取得だけが失敗した状態。カードは前の結果のまま残す
  const [switchFailed, setSwitchFailed] = useState(false);

  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  // 自分の登録デッキ（要ログイン）とデッキ別実績を取得する。どちらも集計単位に依らないので、
  // まとめ方を切り替えても取り直さない。デッキが取れなければ、誤情報を出さないため
  // カードごと非表示にする。
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [decksRes, usageRes] = await Promise.all([
          // デッキ選択の候補は「持っているデッキ全部」でなければならない。
          // ページングの /api/decks は1ページ10件で、11個目以降が候補から
          // 落ちる(スプライト付きのデッキが全て溢れると識別不能扱いにもなる)ため、
          // アーカイブ済みを除いた全件を返す /api/decks/all を使う。
          fetch(`/api/decks/all`, { cache: "no-store" }),
          // deck-usage は「あなたの実勝率」を出すための補助。失敗しても本体は出すため寛容に。
          // 比較相手の環境平均(weekly_deck_usage)は不戦勝・不戦敗を常に外しているので、
          // こちらも同じ条件で引く(でないと除外済みの平均に不戦込みの勝率を並べることになる)。
          fetch(`/api/users/${userId}/deck-usage?${DECK_USAGE_ALL_TIME_QUERY}`, {
            cache: "no-store",
          }).catch(() => null),
        ]);

        if (!decksRes.ok) throw new Error("fetch failed");

        const decksData: DeckGetAllType = await decksRes.json();

        if (cancelled) return;
        setUserDecks(decksData);

        if (usageRes && usageRes.ok) {
          const usageData: DeckUsageStatType = await usageRes.json();
          if (!cancelled) setDeckUsage(usageData.decks);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setFailed(true);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // 取得の失敗を「最初の1回」と「切り替え」で分けるために、effect から最新の stat を見る。
  // 依存に stat を入れると、取得するたびに effect が走り直してしまう。
  const statRef = useRef<WeeklyDeckUsageStatType | null>(null);
  useEffect(() => {
    statRef.current = stat;
  }, [stat]);

  // 環境ランキング（公開）。まとめ方を変えるとサーバ側の集計そのものが変わるので取り直す。
  // 届くまでは前のまとめ方の結果を出したままにする(骨格へ戻すとカードごと跳ねるため)。
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(
          `/api/deck_meta/weekly_usage?week=${lastWeekValue()}&grouping=${grouping}`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error("fetch failed");

        const statData: WeeklyDeckUsageStatType = await res.json();
        if (cancelled) return;
        setStat(statData);
        // 一度失敗しても、取り直せたらカードと注記を元に戻す
        setFailed(false);
        setSwitchFailed(false);
      } catch (e) {
        console.error(e);
        if (cancelled) return;
        /*
         * 最初の取得に失敗したときだけカードごと引っ込める(誤情報を出さないため)。
         * 一度出したあとの切り替えで失敗したときに同じことをすると、タブごと消えて
         * 元のまとめ方にも戻せなくなる。前の結果を残し、注記の位置で知らせる。
         */
        if (statRef.current == null) setFailed(true);
        else setSwitchFailed(true);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [grouping]);

  // ランキング対象（「その他」= 空指紋を除く・使用率降順）。共通ロジックに集約(deckEnv)。
  const rankable = useMemo(() => (stat ? rankableDecks(stat) : []), [stat]);

  // デッキID → あなたの実勝率・対戦数。予約席の「あなたの勝率 vs 環境平均勝率」に使う。
  const ownStatByDeckId = useMemo(() => {
    const map = new Map<string, OwnStat>();
    for (const d of deckUsage) {
      map.set(d.deck_id, { winRate: d.win_rate, count: d.count });
    }
    return map;
  }, [deckUsage]);

  /*
   * 自分の登録デッキ(スプライトあり=環境上で識別可能)ごとの立ち位置。ランク入りを上位に。
   *
   * 指紋は「選んでいるまとめ方」ではなく「いま出ているランキングが実際に集計された単位」
   * (stat.grouping)で作る。タブは即座に変わるのにランキングは取得が終わるまで前のままなので、
   * 選んだ方で突合すると、その間だけどの行にも一致せず「まだランク外」と出てしまう
   * (実測で約500ms、1位のデッキが圏外表示になっていた)。
   */
  const statGrouping = stat?.grouping ?? grouping;
  const deckPositions = useMemo<DeckPosition[]>(() => {
    if (!userDecks) return [];
    const list: DeckPosition[] = [];
    for (const deck of userDecks) {
      const fp = deckFingerprintKey(deck.pokemon_sprites, statGrouping);
      if (fp === "") continue; // スプライト未設定は環境上で識別できないため選択肢に出さない
      const exactFp = deckFingerprintKey(deck.pokemon_sprites, "exact");
      let idx = rankable.findIndex((d) => d.fingerprint === fp);
      if (idx < 0 && statGrouping === "first_sprite" && exactFp !== "") {
        // 1体目でまとめた行は、その組み合わせで「多数派の並びの1体目」で束ねられている。
        // 自分のデッキを少数派の並び(1体目と2体目が逆)で登録していると自分の1体目では
        // 行が見つからないため、内訳(組み合わせ単位)の指紋から親行を引き当てる。
        idx = rankable.findIndex((d) => d.members?.some((m) => m.fingerprint === exactFp));
      }
      const row = idx >= 0 ? rankable[idx] : null;
      list.push({
        deck,
        // 行のハイライト照合に使うため、引き当てた行の指紋に合わせる
        // (少数派の並びのデッキは、自分の1体目と行の指紋が一致しない)。
        fingerprint: row?.fingerprint ?? fp,
        exactFingerprint: exactFp,
        rank: idx >= 0 ? idx + 1 : null,
        row,
        favorited: isFavoritedDeck(deck),
      });
    }
    // お気に入り → ランク入り(順位昇順) → 圏外 の順に並べる。既定選択は先頭なので、
    // お気に入りがあればそれが、無ければ最上位ランクが初期表示になる
    // (デッキ一覧・記録作成のデッキ選択と同じく「お気に入りは先頭」に揃える)。
    return list.sort((a, b) => {
      if (a.favorited !== b.favorited) return a.favorited ? -1 : 1;
      if (a.rank == null && b.rank == null) return 0;
      if (a.rank == null) return 1;
      if (b.rank == null) return -1;
      return a.rank - b.rank;
    });
  }, [userDecks, rankable, statGrouping]);

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

  // 見出し付きセクションに置かれている場合は、データが無くても空状態のカードを出す
  // (見出しだけが残るのを防ぐ)。プロフィール直下(pinned)は見出しが無いため従来どおり非表示。
  if (failed) return showEmptyState ? <EmptyStateCard stat={null} failed /> : null;
  if (stat == null || userDecks == null) return <EnvironmentWindowCardSkeleton />;
  // ここに来る renderMode == null は「対戦環境データが無い週」(rankable が空)のみ。
  if (renderMode == null)
    return showEmptyState ? <EmptyStateCard stat={stat} failed={false} /> : null;

  // 「その他」を除いた割合の母数。カード内の全ランキングをこの基準で表示する(deckEnv)。
  const exclOtherTotal = exclOtherTotalOf(stat);

  // モードB(環境上で識別できるデッキが1つも無い)で代表として見せるデッキ。
  // select モードの既定選択と揃えて、お気に入りがあればそれを優先する。
  const representativeDeck = userDecks.find(isFavoritedDeck) ?? userDecks[0];

  return (
    <>
      <Card className="shadow-md">
        <CardBody className="gap-3 p-4">
          <BetaHeader stat={stat} />
          <GroupingTabs
            grouping={grouping}
            noteGrouping={statGrouping}
            failed={switchFailed}
            onChange={setGrouping}
          />

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

              <UsageRankingSection
                ranking={rankable}
                exclOtherTotal={exclOtherTotal}
                title="使用率ランキング"
              />

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
              <RankedOutHero deck={representativeDeck} />
              <EncourageNote />
              <UsageRankingSection
                ranking={rankable}
                exclOtherTotal={exclOtherTotal}
                title="今週の環境 使用率ランキング"
              />
              <RecordCtaButton
                ranked={false}
                totalRecords={totalRecords}
                deck={representativeDeck}
                onClick={handleRecordClick}
              />
            </>
          ) : (
            <SelectModeView
              positions={deckPositions}
              ranking={rankable}
              exclOtherTotal={exclOtherTotal}
              totalRecords={totalRecords}
              ownStatByDeckId={ownStatByDeckId}
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
