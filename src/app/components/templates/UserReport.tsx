"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { Button, Card, CardBody, Spinner } from "@heroui/react";
import { LuChevronLeft, LuImages, LuShare2 } from "react-icons/lu";
import { motion, useReducedMotion } from "framer-motion";

import FetchError from "@app/components/molecules/FetchError";
import LinkButton from "@app/components/molecules/LinkButton";
import PanelShareModal from "@app/components/organisms/Share/PanelShareModal";

import RecapCardPreview from "@app/components/organisms/Report/RecapCardPreview";
import { CARD_WIDTH } from "@app/components/organisms/Report/RecapCardFrame";
import RecapSummaryCard from "@app/components/organisms/Report/RecapSummaryCard";
import RecapDeckCard from "@app/components/organisms/Report/RecapDeckCard";
import RecapOpponentCard from "@app/components/organisms/Report/RecapOpponentCard";
import RecapStreakCard from "@app/components/organisms/Report/RecapStreakCard";
import RecapOutroCard from "@app/components/organisms/Report/RecapOutroCard";

import { UserStatType } from "@app/types/user_stat";
import { DeckUsageStatType } from "@app/types/deck_usage_stat";
import { OpponentDeckUsageStatType } from "@app/types/opponent_deck_usage_stat";
import { UserStreakType } from "@app/types/streak";

import {
  fetchPeriodDeckEnv,
  envUsageRate,
  type PeriodDeckEnv,
} from "@app/utils/periodDeckEnv";
import {
  buildRecapAllPostText,
  buildRecapPostText,
  type RecapCardKind,
  type RecapPostContext,
} from "@app/utils/recapPostText";
import {
  periodQuery,
  periodTitle,
  periodValue,
  type RecapPeriod,
} from "@app/utils/recapPeriod";

// 1080×1350 をそのまま @4x で焼くと canvas 上限に近づき、生成も重くなる。
// @2x(2160×2700)で X のタイムラインには十分。
const SHARE_PIXEL_RATIO = 2;

type Props = {
  userId: string;
  period: RecapPeriod;
};

type RecapCard = {
  kind: RecapCardKind;
  node: ReactNode;
};

/*
 * ふりかえり（/users/report/weeks/[week]、/users/report/[yearMonth]、
 * /users/report/environments/[id]）。
 *
 * その期間の記録から「1枚1メッセージ」のカードを組み立て、縦に流して読ませる。
 * カードは画面に入ったところで下からふわりと現れ、1枚ずつ画像としてシェアできる。
 *
 * 期間の選択はここではなく入口の一覧(/users/report)が持つ。この画面は
 * 「選ばれた1つの期間」を見せることに徹する。
 *
 * 期間が変わったときはページ側が key で作り直すため、
 * 表示状態や取得済みの環境データはここで初期化しない。
 */
export default function TemplateUserReport({ userId, period }: Props) {
  const [stat, setStat] = useState<UserStatType | null>(null);
  const [deckStat, setDeckStat] = useState<DeckUsageStatType | null>(null);
  const [opponentStat, setOpponentStat] = useState<OpponentDeckUsageStatType | null>(
    null,
  );
  const [streak, setStreak] = useState<UserStreakType | null>(null);
  const [env, setEnv] = useState<PeriodDeckEnv | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  // シェア対象のカード。閉じるアニメーションの間も中身を保つため、
  // 開閉フラグ(shareOpen)とは別に持つ。
  const [shareTarget, setShareTarget] = useState<RecapCard | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  // 全ページをまとめてシェアするモーダル
  const [shareAllOpen, setShareAllOpen] = useState(false);

  const shouldReduceMotion = useReducedMotion();

  const load = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);

    try {
      const query = periodQuery(period);
      // 戦績(stat)だけは必須。他は欠けてもカードを減らして表示する。
      const [statRes, deckRes, opponentRes, streakRes] = await Promise.all([
        fetch(`/api/users/${userId}/stat?${query}`, { cache: "no-store" }),
        fetch(`/api/users/${userId}/deck-usage?${query}`, { cache: "no-store" }),
        fetch(`/api/users/${userId}/opponent-deck-usage?${query}`, {
          cache: "no-store",
        }),
        fetch(`/api/users/${userId}/streak`, { cache: "no-store" }),
      ]);

      if (!statRes.ok) throw new Error("failed to fetch user stat");

      setStat(await statRes.json());
      setDeckStat(deckRes.ok ? await deckRes.json() : null);
      setOpponentStat(opponentRes.ok ? await opponentRes.json() : null);
      setStreak(streakRes.ok ? await streakRes.json() : null);
    } catch (e) {
      console.error(e);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [userId, period]);

  useEffect(() => {
    load();
  }, [load]);

  // その期間に多く使ったデッキ / 多く当たった相手を上位3件まで。
  // API は件数降順で返すが、表示の根拠を並び順に依存させないため明示的に並べ替える。
  const topDecks = useMemo(
    () => [...(deckStat?.decks ?? [])].sort((a, b) => b.count - a.count).slice(0, 3),
    [deckStat],
  );
  const topOpponents = useMemo(
    () => [...(opponentStat?.decks ?? [])].sort((a, b) => b.count - a.count).slice(0, 3),
    [opponentStat],
  );

  // 環境との突き合わせやポスト文は主役(1位)を対象にする
  const topDeck = topDecks[0] ?? null;
  const topOpponent = topOpponents[0] ?? null;

  // 相手デッキが決まってから、その期間の環境データを引く（相手がいない期間は引かない）
  useEffect(() => {
    if (!topOpponent) return;

    let cancelled = false;
    fetchPeriodDeckEnv(period).then((result) => {
      if (!cancelled) setEnv(result);
    });
    return () => {
      cancelled = true;
    };
  }, [topOpponent, period]);

  const envRate = useMemo(() => {
    if (!env || !topOpponent) return null;
    return envUsageRate(
      env,
      (topOpponent.pokemon_sprites ?? []).map((s) => s.id),
    );
  }, [env, topOpponent]);

  // usage_rate の分母は相手デッキ集計側で数えた試合数。戦績(stat)側の試合数とは
  // 集計条件が異なりうるため、「N戦中M回」はこちらを分母にして率と食い違わせない。
  const opponentTotalMatches = opponentStat?.total_matches || stat?.total_matches || 0;

  const cards = useMemo<RecapCard[]>(() => {
    if (!stat || stat.total_matches === 0) return [];

    const list: RecapCard[] = [
      { kind: "summary", node: <RecapSummaryCard period={period} stat={stat} /> },
    ];

    if (topDecks.length > 0) {
      list.push({
        kind: "deck",
        node: (
          <RecapDeckCard
            period={period}
            decks={topDecks}
            totalMatches={stat.total_matches}
          />
        ),
      });
    }

    if (topOpponents.length > 0) {
      list.push({
        kind: "opponent",
        node: (
          <RecapOpponentCard
            period={period}
            opponents={topOpponents}
            totalMatches={opponentTotalMatches}
            envRate={envRate}
            envTotalVotes={env?.totalVotes ?? null}
          />
        ),
      });
    }

    // 連続記録は「いま何週続いているか」であって期間の集計ではない。
    // 過去の環境のふりかえりに現在値を混ぜると読み違えるため、環境別では出さない
    // （週次・月次は「直近」のふりかえりなので現在値と噛み合う）。
    // 途切れている人に「0週連続」を見せても意味がないので、続いている人だけ。
    if (period.kind !== "environment" && streak && streak.current_weeks > 0) {
      list.push({
        kind: "streak",
        node: <RecapStreakCard period={period} streak={streak} />,
      });
    }

    list.push({
      kind: "outro",
      node: <RecapOutroCard period={period} totalMatches={stat.total_matches} />,
    });

    return list;
  }, [stat, period, topDecks, topOpponents, opponentTotalMatches, envRate, env, streak]);

  const postContext: RecapPostContext | null = stat
    ? {
        period,
        stat,
        deck: topDeck ?? undefined,
        opponent: topOpponent ?? undefined,
        opponentTotalMatches,
        envRate,
        streak: streak ?? undefined,
      }
    : null;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-3 pt-3 pb-6">
      {/* 期間はここでは切り替えない。入口の一覧へ戻す導線と、いま見ている期間の名前だけ置く。
          期間名までを1つのリンクにして、矢印だけでなく名前をタップしても戻れるようにする。 */}
      <LinkButton
        href="/users/report"
        size="sm"
        variant="light"
        aria-label="バトルレポートの一覧へ戻る"
        // -ml-2 はボタン自身の余白ぶんを引き戻して、下に続く内容と左端を揃えるため
        className="-ml-2 h-11 max-w-full self-start gap-1 px-2 text-sm font-bold text-default-700"
        startContent={<LuChevronLeft className="h-4 w-4 shrink-0" />}
      >
        <span className="min-w-0 truncate">{periodTitle(period)}</span>
      </LinkButton>

      {hasError ? (
        <Card className="shadow-md">
          <CardBody className="py-10">
            <FetchError message="バトルレポートを取得できませんでした" onRetry={load} />
          </CardBody>
        </Card>
      ) : isLoading ? (
        <div className="flex flex-col items-center justify-center gap-2 py-24">
          <Spinner size="sm" />
          <span className="text-[11px] text-default-400">
            バトルレポートを作っています
          </span>
        </div>
      ) : cards.length === 0 ? (
        <EmptyPeriod period={period} />
      ) : (
        <div className="flex flex-col gap-8">
          {cards.map((card) => (
            <RecapSection
              key={card.kind}
              reduceMotion={shouldReduceMotion === true}
              onShare={() => {
                setShareTarget(card);
                setShareOpen(true);
              }}
            >
              {card.node}
            </RecapSection>
          ))}
        </div>
      )}

      {/* 1枚ずつのシェアとは別に、全ページをまとめて渡す。
          主役はレポートそのものなので、幅いっぱいの面を張らず、
          読み終わりに置いた控えめなボタンにしている。 */}
      {!hasError && !isLoading && cards.length > 1 && (
        <div className="flex justify-center pt-1">
          <Button
            size="md"
            radius="full"
            variant="bordered"
            className="h-11 border-default-200 px-6 text-sm font-bold text-default-600"
            startContent={<LuImages className="h-4 w-4" />}
            onPress={() => setShareAllOpen(true)}
          >
            {cards.length}枚まとめてシェア
          </Button>
        </div>
      )}

      {postContext && cards.length > 0 && (
        <PanelShareModal
          isOpen={shareAllOpen}
          onOpenChange={() => setShareAllOpen((open) => !open)}
          onClose={() => setShareAllOpen(false)}
          description={`${cards.length}枚すべてを画像にして、ポスト文と一緒にシェアできます。`}
          postText={buildRecapAllPostText(postContext)}
          filenamePrefix={`recap_${periodValue(period).replace(":", "_")}_all`}
          capture={{
            width: CARD_WIDTH,
            bare: true,
            desiredPixelRatio: SHARE_PIXEL_RATIO,
          }}
          sheets={cards.map((card) => ({ key: card.kind, node: card.node }))}
        />
      )}

      {postContext && shareTarget && (
        <PanelShareModal
          isOpen={shareOpen}
          onOpenChange={() => setShareOpen((open) => !open)}
          onClose={() => setShareOpen(false)}
          description="表示中の内容を画像にして、ポスト文と一緒にシェアできます。"
          postText={buildRecapPostText(shareTarget.kind, postContext)}
          filenamePrefix={`recap_${periodValue(period).replace(":", "_")}_${shareTarget.kind}`}
          // カードは実寸で組んであるので、端末幅に合わせず縦横比のまま書き出す
          capture={{
            width: CARD_WIDTH,
            bare: true,
            desiredPixelRatio: SHARE_PIXEL_RATIO,
          }}
        >
          {() => shareTarget.node}
        </PanelShareModal>
      )}
    </div>
  );
}

/*
 * カード1枚ぶんのセクション。
 *
 * 画面に入ったところで下からふわりと現れる。once を立てているので一度出たら
 * それきりで、上下に往復しても再生し直さない（点滅して見えるのを避ける）。
 * シェアはカードごとに紐づける。縦に流す構成では「いま見ているカード」が
 * 一意に決まらないため、ボタンをそのカードの上に置いて対象を示す。
 */
function RecapSection({
  reduceMotion,
  onShare,
  children,
}: {
  reduceMotion: boolean;
  onShare: () => void;
  children: ReactNode;
}) {
  return (
    <motion.section
      // モーション低減を選んでいる端末では動かさず、最初から見えている状態にする
      initial={reduceMotion ? false : { opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {/* pb-4 は、下辺からはみ出すボタンのぶんの逃げ */}
      <div className="relative pb-4">
        <RecapCardPreview>{children}</RecapCardPreview>

        {/* カードの下辺に半分かける形で浮かせる。カードの中に置くと、右下に数字が来る
            面(サマリーの勝率・相棒デッキの先攻勝率)で中身を隠してしまうため。
            どの面の色の上でも見えるよう白で置く。 */}
        <Button
          isIconOnly
          radius="full"
          aria-label="画像にしてシェアする"
          /*
           * 色はテーマに追従させない。レポートの面は固定色なので、その上に置くボタンも
           * 固定でないと釣り合わない（text-default-700 はダークで明るい灰になり、
           * 白い地の上でほとんど見えなくなる）。
           */
          style={{ backgroundColor: "#ffffff", color: "#3f3f46" }}
          // 締めのページは面が白いので、縁が無いとボタンが地に溶ける
          className="absolute bottom-0 right-4 h-11 w-11 min-w-11 shadow-lg ring-1 ring-black/10"
          onPress={onShare}
        >
          <LuShare2 className="h-4.5 w-4.5" />
        </Button>
      </div>
    </motion.section>
  );
}

// その期間に1戦も記録が無いとき。カードは作れないので、記録への導線だけ置く。
function EmptyPeriod({ period }: { period: RecapPeriod }) {
  return (
    <Card className="shadow-md">
      <CardBody className="flex flex-col gap-4 p-6">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-black text-foreground">
            {periodTitle(period)}の記録はまだありません
          </span>
          <span className="text-[11px] leading-relaxed text-default-500">
            勝敗と相手デッキだけなら10秒で残せます。1戦記録すると、この期間の
            レポートが作られます。
          </span>
        </div>

        <LinkButton href="/records/quick" color="primary" className="w-full">
          10秒で1戦を記録する
        </LinkButton>
      </CardBody>
    </Card>
  );
}
