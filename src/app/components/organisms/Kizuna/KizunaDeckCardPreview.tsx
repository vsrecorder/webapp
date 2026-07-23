"use client";

import { Card, CardHeader } from "@heroui/react";

import { LuCalendar, LuChevronDown, LuImage } from "react-icons/lu";

import {
  useKizunaPreviewDeck,
  type KizunaPreviewStats,
} from "@app/components/organisms/Kizuna/KizunaPreviewContext";
import { kizunaHasGlow, kizunaTierOf } from "@app/utils/kizuna";
import PokemonSprite from "@app/components/atoms/PokemonSprite";
// 本物のデッキ一覧カード（organisms/Deck/DeckCard.tsx）と同じ表示部品を使う。
// 独自にマークアップを組むと、本物を直したときにこのモックだけ実態とずれるため。
import {
  KizunaLevelInline,
  KizunaLevelBar,
  KizunaLevelBillboard,
} from "@app/components/molecules/KizunaDeckLevel";
import DeckGoStatsGrid from "@app/components/molecules/DeckGoStatsGrid";

// 勝率の色分け。本物の DeckCard / DeckById と同じ閾値に合わせる。
function winRateTextColor(rate: number): string {
  if (rate >= 0.55) return "text-success";
  if (rate >= 0.45) return "text-default-500";
  if (rate >= 0.4) return "text-warning";
  return "text-danger";
}

/*
 * 「きずな」が実装されたら、デッキ一覧のカードがどう見えるかのモック。
 *
 * ここはプロモーションページ専用であり、本物のデッキ一覧（organisms/Deck/DeckCard.tsx）
 * とは一切つながっていない。APIも叩かない。
 * DeckCard 側を改造して「プレビュー用フラグ」を生やすと本番の一覧に事故が波及するため、
 * 見た目だけを写し取った別コンポーネントとして持つ。
 *
 * 中身は上の試算セクションの結果（KizunaPreviewContext）を映す。まだ試算していなければ
 * 下のサンプル値を出す。デッキを選んだ人には「自分のデッキがこう見える」が出る。
 *
 * 見た目は本物の DeckCard に合わせてある（登録日・スプライト2体・勝率リング／
 * ヒーロー画像・アコーディオン）。本物を変更したときは、ここも追随させること。
 */

// 試算前に出すサンプル。実在しないデッキ。
const SAMPLE = {
  deckName: "ピジョリザ",
  spriteIds: ["0006", "0018"], // リザードン・ピジョット
  registeredAt: "2026年7月9日(金)",
  kizunaLevel: 209,
  stats: {
    winRate: 0.62,
    wins: 30,
    losses: 18,
    matchCount: 48,
    goFirstCount: 26,
    goFirstRate: 0.54,
    goFirstWinRate: 0.65,
    goSecondCount: 22,
    goSecondWinRate: 0.59,
  } satisfies KizunaPreviewStats,
};

// 勝率リングの寸法は本物（DeckCard）と同じ
const RING_RADIUS = 18;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const percent = (rate: number) => `${Math.round(rate * 100)}%`;

type ViewModel = {
  deckName: string;
  spriteIds: string[];
  registeredAt: string;
  kizunaLevel: number;
  // スプライトの揺れ方（段階が上がるほど大きく・速く。最下段は動かない）
  bob: string;
  // 灯をともすか（「出会ったばかり」だけ灯らない）
  showGlow: boolean;
  // 灯のグラデーション（段階で炎の色が変わる）
  glowGradient: string;
  stats: KizunaPreviewStats;
  // 戦績が本人の記録によるものか（サンプルの数字を借りているか）
  hasRealStats: boolean;
};

// スプライトの背後にともる灯。きずなLv.の段階でグラデーション（炎の色）が変わる
// （結果カード・本物のデッキ一覧と同じ tier.glowGradient を使う）。
function Sprites({
  spriteIds,
  bob,
  showGlow,
  glowGradient,
}: {
  spriteIds: string[];
  bob: string;
  showGlow: boolean;
  glowGradient: string;
}) {
  const spx = 48;

  // 2枠を必ず埋める（本物の DeckCard も2体ぶんの枠を持つ）
  const slots = [spriteIds[0], spriteIds[1]];

  return (
    <div className="relative flex shrink-0 items-center gap-0">
      {/* 灯。バッジで濃さを数値化はしない（灯っているかどうかが見えれば足りる）。
          「出会ったばかり」は灯そのものを出さない。 */}
      {showGlow && (
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 h-14 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full blur-lg"
          style={{ background: glowGradient }}
        />
      )}
      {slots.map((id, i) => (
        <PokemonSprite
          key={`${id ?? "unknown"}-${i}`}
          id={id}
          size={spx}
          className={bob}
        />
      ))}
    </div>
  );
}

// ── リスト形式 ───────────────────────────────────────────────
// スプライトに灯を宿し（案C）、デッキ名ブロックの下にきずなLv.の線を1本足す（案A）。
// 勝率リングと行の構成には手を触れない。
function ListPreview({ vm }: { vm: ViewModel }) {
  const { stats } = vm;

  return (
    <Card className="w-full">
      <div className="flex flex-col gap-1.5 px-3 py-3">
        <div className="flex justify-end">
          <span className="flex items-center gap-1 whitespace-nowrap text-tiny text-default-400">
            <LuCalendar className="text-xs" />
            {vm.registeredAt}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Sprites
            spriteIds={vm.spriteIds}
            bob={vm.bob}
            showGlow={vm.showGlow}
            glowGradient={vm.glowGradient}
          />

          {/* 勝率リング（本物と同じく勝率で色分け） */}
          <div className="relative h-11 w-11 shrink-0">
            <svg
              viewBox="0 0 44 44"
              className={`h-full w-full ${winRateTextColor(stats.winRate)}`}
            >
              <circle
                cx="22"
                cy="22"
                r={RING_RADIUS}
                fill="none"
                strokeWidth="5"
                className="text-default-200"
                stroke="currentColor"
              />
              <circle
                cx="22"
                cy="22"
                r={RING_RADIUS}
                fill="none"
                strokeWidth="5"
                stroke="currentColor"
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={RING_CIRCUMFERENCE * (1 - stats.winRate)}
                transform="rotate(-90 22 22)"
              />
            </svg>
            <div
              className={`absolute inset-0 flex items-center justify-center text-tiny font-black tabular-nums ${winRateTextColor(stats.winRate)}`}
            >
              {percent(stats.winRate)}
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="truncate font-bold text-medium">{vm.deckName}</div>
            {/* 勝敗ときずなLv.を同じ行に置く。「強かったか」と「どう歩んできたか」が
                左右に並ぶことで、カードの中でも対比がそのまま読める。 */}
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-tiny text-default-400">
                {stats.matchCount}戦{stats.wins}勝{stats.losses}敗
              </span>
              <KizunaLevelInline level={vm.kizunaLevel} />
            </div>
            <KizunaLevelBar level={vm.kizunaLevel} />
          </div>

          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-default-100 text-default-400"
          >
            <LuChevronDown className="text-lg" />
          </span>
        </div>
      </div>
    </Card>
  );
}

// ── ギャラリー形式 ───────────────────────────────────────────
// 中央の勝率の大きな数字を、勝率ときずなLv.の二枚看板に組み替える（案B）。
// スプライトには灯を宿す。
function GalleryPreview({ vm }: { vm: ViewModel }) {
  // 本物のカードでは戦績はアコーディオンの中にある。二枚看板を見せるのが目的なので、
  // このプレビューでは常に開いた状態で固定し、閉じられないようにする。
  const { stats } = vm;

  return (
    <Card className="w-full overflow-hidden border border-default-200 shadow-sm">
      <CardHeader className="flex flex-col gap-1.5 px-3 pt-3 pb-2">
        <div className="flex justify-end">
          <span className="flex items-center gap-1 whitespace-nowrap text-tiny text-default-400">
            <LuCalendar className="text-xs" />
            {vm.registeredAt}
          </span>
        </div>
        <div className="flex w-full min-w-0 flex-col items-center gap-1">
          <Sprites
            spriteIds={vm.spriteIds}
            bob={vm.bob}
            showGlow={vm.showGlow}
            glowGradient={vm.glowGradient}
          />
          <div className="w-full min-w-0 truncate text-center font-bold text-large">
            {vm.deckName}
          </div>
          {/* きずなLv.は展開しなくても見えるよう、ヘッダーに常時出す（本物と同じ）。
              勝率との対比（二枚看板）は展開後に置く。 */}
          <div className="flex w-full min-w-0 flex-col gap-1 pt-0.5">
            <div className="flex items-center justify-center">
              <KizunaLevelInline level={vm.kizunaLevel} />
            </div>
            <KizunaLevelBar level={vm.kizunaLevel} showTierName={false} />
          </div>
        </div>
      </CardHeader>

      {/* ヒーロー：本物はデッキコード画像。モックなので枠だけを置く。
          本物のカードにある「タップで詳細」「勝率」のチップは、きずなの見せ方とは
          関係がないので載せない（このモックの主題から目を逸らさせない）。 */}
      <div className="relative flex aspect-2/1 w-full items-center justify-center bg-default-100">
        <span className="flex items-center gap-1.5 text-tiny text-default-400">
          <LuImage className="text-base" />
          デッキコード画像
        </span>
      </div>

      <div className="px-3 pt-2 pb-3">
        <div
          aria-hidden
          className="flex w-full cursor-default items-center justify-center gap-1 rounded-lg bg-default-100 px-3 py-2 font-bold text-tiny text-default-600"
        >
          デッキコード・戦績を見る
          <LuChevronDown aria-hidden className="text-base" />
        </div>
      </div>

      <div className="flex flex-col gap-3 px-3 pt-0 pb-3">
        {/* 二枚看板：カードの中心に「強かったか／どう歩んできたか」を並べる。
            本物のカード（DeckCard 展開時）と同じ KizunaLevelBillboard を使う。 */}
        <KizunaLevelBillboard
          level={vm.kizunaLevel}
          winRateNode={
            <span
              className={`font-black text-3xl leading-none tabular-nums ${winRateTextColor(stats.winRate)}`}
            >
              {percent(stats.winRate)}
            </span>
          }
          matchSummary={`${stats.matchCount}戦${stats.wins}勝${stats.losses}敗`}
        />

        {/* 先攻・後攻：本物のカードと同じ共有部品。割合と勝率を縦に積み、
            勝率は色分け＋全体差（デッキ全体の勝率との差）を添える。 */}
        <DeckGoStatsGrid
          winRate={stats.winRate}
          goFirstCount={stats.goFirstCount}
          goFirstRate={stats.goFirstRate}
          goFirstWinRate={stats.goFirstWinRate}
          goSecondCount={stats.goSecondCount}
          goSecondWinRate={stats.goSecondWinRate}
        />
      </div>
    </Card>
  );
}

export default function KizunaDeckCardPreview() {
  const previewDeck = useKizunaPreviewDeck();

  const kizunaLevel = previewDeck?.kizunaLevel ?? SAMPLE.kizunaLevel;
  const spriteIds =
    previewDeck && previewDeck.spriteIds.length > 0
      ? previewDeck.spriteIds
      : SAMPLE.spriteIds;

  const vm: ViewModel = {
    deckName: previewDeck?.deckName || SAMPLE.deckName,
    spriteIds,
    registeredAt: previewDeck?.registeredAt ?? SAMPLE.registeredAt,
    kizunaLevel,
    bob: kizunaTierOf(kizunaLevel).bob,
    showGlow: kizunaHasGlow(kizunaLevel),
    glowGradient: kizunaTierOf(kizunaLevel).glowGradient,
    // 質問式の試算では戦績を持てないため、その場合はサンプルの数字を借りる
    stats: previewDeck?.stats ?? SAMPLE.stats,
    hasRealStats: !!previewDeck?.stats,
  };

  /*
   * カードの幅は実機（スマートフォン）に近い 384px までに抑える。
   * 幅の狭い2カラムに押し込むと、本物では収まるデッキ名が切れてしまい、
   * 実装イメージとして誤った印象を与える。
   */
  return (
    <div className="flex flex-col gap-6">
      <div className="grid justify-items-center gap-10 lg:grid-cols-2 lg:gap-8">
        <div className="flex w-full min-w-0 max-w-sm flex-col gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-bold tracking-widest text-amber-600 lg:text-xs dark:text-amber-400">
              リスト形式
            </span>
            <span className="text-xs leading-relaxed text-default-500">
              スプライトの背後に灯がともり、デッキ名の下にきずなLv.の線が1本増えます。勝率リングはそのままです。
            </span>
          </div>
          <ListPreview vm={vm} />
        </div>

        <div className="flex w-full min-w-0 max-w-sm flex-col gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-bold tracking-widest text-amber-600 lg:text-xs dark:text-amber-400">
              ギャラリー形式
            </span>
            <span className="text-xs leading-relaxed text-default-500">
              中央の勝率を、勝率ときずなLv.の二枚看板に組み替えます。カードの真ん中に対比が置かれます。
            </span>
          </div>
          <GalleryPreview vm={vm} />
        </div>
      </div>

      {/* 何を見せているのかは、試算したかどうかで変わる */}
      <p className="text-center text-xs lg:text-sm leading-relaxed text-default-400">
        {!previewDeck
          ? "❈これは実装イメージです。デッキの内容・数値はすべて架空のもので、実際の画面とは異なる場合があります。"
          : vm.hasRealStats
            ? "❈これは実装イメージです。上で試算したデッキと、その対戦記録から算出した数値で表示しています。実際の画面とは異なる場合があります。"
            : "❈これは実装イメージです。上で選んだポケモンと試算したきずなLv.で表示しています。勝率・戦績・登録日はサンプルの数値です。"}
      </p>
    </div>
  );
}
