"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import NextLink from "next/link";

import { Card, CardBody, Chip, Link as HeroLink } from "@heroui/react";

import { A11y, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/pagination";

import ZoomableDeckImage from "@app/components/atoms/ZoomableDeckImage";
import FetchError from "@app/components/molecules/FetchError";

import {
  UserPlayerCityleagueResultType,
  UserPlayerCityleagueResultsGetResponseType,
} from "@app/types/user_player";
import {
  saveCityleagueResultsHeight,
  useCityleagueResultsHeight,
} from "@app/utils/cityleagueResultsHeightCache";
import {
  cityleagueLeagueTitle,
  cityleagueRankBadgeClass,
  cityleagueRankBorderClass,
  cityleagueRankLabel,
} from "@app/utils/cityleagueRank";

type Props = {
  // 表示対象のシーズン識別子(championship_series.id から "series_" を除いたもの)。
  // 呼び出し元(DesignationPanel)のシーズン選択と同じ値を渡す。
  season: string;
  // 上のシーズン識別子に対応する表示名(例「チャンピオンシップシリーズ2026」)。
  // シーズン選択はカード上端にあり、ここまでスクロールすると画面外に出てしまうため、
  // 「どのシーズンの成績か」をこのセクション単体でも読めるようにする。
  seasonLabel?: string;
};

// デッキ画像を主役にしたいので、入賞カードだけは親カード(DesignationPanel の
// CardBody = p-4)の左右パディングを打ち消して、パネルの幅いっぱいまで広げる。
// 見出しや空状態は他のセクションと縦のラインを揃えたいため、この打ち消しは掛けない。
//
// Swiper 本体には付けられない。swiper/css が `.swiper { margin-left/right: auto }` を
// 単一クラスで当てており、Tailwind の負マージンと詳細度が並ぶため打ち消されて
// 右へ16pxはみ出す(実測済み)。素の div で包んでそちらに掛ける。
const BLEED = "-mx-4";

function ResultCard({ result }: { result: UserPlayerCityleagueResultType }) {
  const date = new Date(result.date).toLocaleString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  // 店舗名は「ポケモンカードステーション・」で始まるものが多く、そのまま出すと
  // 幅の大半を接頭辞が占めてしまうため、一覧側(CityleagueResult)と同じく落とす。
  const shopName = result.shop_name.replace(/ポケモンカードステーション・/g, "");
  const leagueTitle = cityleagueLeagueTitle(result.league_type);

  return (
    <Card
      shadow="sm"
      className={`w-full border-2 border-default-100 ${cityleagueRankBorderClass(result.rank)}`}
    >
      <CardBody className="flex flex-col gap-2 p-3">
        {/* 1行目: 大会名(例「シティリーグ2026 シーズン4」)と開催日。
            日付は ml-auto で右端に固定する。大会名は official_events を引けなかった
            入賞では空になるが、その場合も日付の位置は動かさない。 */}
        <div className="flex items-baseline gap-2">
          {result.event_title && (
            <span className="min-w-0 truncate text-tiny font-bold text-default-400">
              {result.event_title}
            </span>
          )}
          <span className="ml-auto shrink-0 text-tiny font-bold text-default-400">
            {date}
          </span>
        </div>

        {/* 2行目: 順位。flex-col の子は既定で幅いっぱいに伸びるため self-start で内容幅に留める。 */}
        {cityleagueRankLabel(result.rank, true) && (
          <div
            className={`inline-flex self-start items-center gap-1 rounded-full px-3 py-1 text-sm font-bold shadow-sm ${cityleagueRankBadgeClass(
              result.rank,
            )}`}
          >
            {cityleagueRankLabel(result.rank, true)}
          </div>
        )}

        {/* 3行目以降: 会場名とタグ */}
        <div className="flex min-w-0 flex-col gap-1">
          {shopName && <span className="truncate text-base font-bold">{shopName}</span>}
          <div className="flex flex-wrap items-start gap-1">
            {result.prefecture_name && (
              <Chip size="sm" radius="md" variant="bordered">
                <small className="font-bold">{result.prefecture_name}</small>
              </Chip>
            )}
            {leagueTitle && (
              <Chip size="sm" radius="md" variant="bordered">
                <small className="font-bold">{leagueTitle}リーグ</small>
              </Chip>
            )}
            {result.environment_title && (
              <Chip size="sm" radius="md" variant="bordered">
                <small className="font-bold">『{result.environment_title}』</small>
              </Chip>
            )}
          </div>
        </div>

        {result.deck_code ? (
          <div className="flex flex-col gap-1">
            <ZoomableDeckImage code={result.deck_code} />
            <span className="text-center text-tiny text-default-400">
              デッキコード {result.deck_code}
            </span>
          </div>
        ) : (
          // 公式サイトにデッキコードの登録が無い入賞もあるため、その場合は
          // 画像を出さずに理由を書く(空の枠だけが残ると不具合に見える)。
          <div className="rounded-lg bg-default-100 py-6 text-center text-tiny text-default-500">
            デッキコードが登録されていません
          </div>
        )}

        <div className="text-center">
          <HeroLink
            as={NextLink}
            showAnchorIcon
            underline="always"
            href={`/cityleague_results/${result.official_event_id}`}
            className="text-tiny"
          >
            このイベントの結果を見る
          </HeroLink>
        </div>
      </CardBody>
    </Card>
  );
}

// プレイヤーズクラブ連携済みユーザ向けに、選択中のシーズンで入賞したシティリーグの
// デッキをスワイパーで表示する。連携の有無は呼び出し元で判定し、連携済みのときだけ描画する。
export default function PlayerCityleagueResults({ season, seasonLabel }: Props) {
  const [results, setResults] = useState<UserPlayerCityleagueResultType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  // 読み込み中に確保する高さ。前回このシーズンで描画できた高さを使う(初回は既定値)
  const placeholderHeight = useCityleagueResultsHeight(season);
  const contentRef = useRef<HTMLDivElement>(null);

  const loadResults = useCallback(async () => {
    setError(false);
    setIsLoading(true);

    try {
      const res = await fetch(
        `/api/usersplayers/cityleague_results?season=${encodeURIComponent(season)}`,
        { cache: "no-store" },
      );

      // 未連携・存在しないシーズンは、BFF(/api/usersplayers/cityleague_results)側で
      // 0件の200に正規化済みなのでここでは分岐しない(fail2banの404カウント対策。
      // 理由はそのルートハンドラのコメントを参照)。
      if (!res.ok) {
        throw new Error("Failed to fetch");
      }

      const data: UserPlayerCityleagueResultsGetResponseType = await res.json();

      setResults(data.results ?? []);
    } catch (err) {
      console.log(err);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, [season]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  // 描画できた高さを次回のために覚えておく。Swiper は autoHeight で描画後に高さが
  // 決まるので、1フレーム待ってから測る(デッキ画像は aspect-2/1 なので読み込み前でも
  // 高さは確定している)。エラー時は本来の高さではないので保存しない。
  useEffect(() => {
    if (isLoading || error) return;

    const frame = requestAnimationFrame(() => {
      const height = contentRef.current?.getBoundingClientRect().height ?? 0;
      saveCityleagueResultsHeight(season, Math.round(height));
    });

    return () => cancelAnimationFrame(frame);
  }, [isLoading, error, season, results]);

  return (
    // min-w-0: Swiper のスライド幅は親の幅から決まるが、flex の子は既定で
    // min-width:auto(=中身の最大幅)まで伸びる。デッキ画像やデッキコードの長い行が
    // そのまま幅になってカードの外へはみ出すため、ここで縮めるようにしておく。
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-end justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <h3 className="text-[10px] font-bold uppercase tracking-wide text-default-400">
            入賞したシティリーグ
          </h3>
          {seasonLabel && (
            <span className="truncate text-xs font-bold text-default-600">
              {seasonLabel}
            </span>
          )}
        </div>
        {!isLoading && !error && results.length > 0 && (
          <span className="shrink-0 text-[10px] font-bold text-default-400 tabular-nums">
            {results.length}件
          </span>
        )}
      </div>

      {/* 読み込み中の高さを実体に合わせるため、描画後の高さをここで測る */}
      <div ref={contentRef}>
        {isLoading ? (
          <div
            style={{ height: placeholderHeight }}
            className={`animate-pulse rounded-xl bg-default-100 ${BLEED}`}
          />
        ) : error ? (
          <FetchError
            message="入賞したシティリーグの取得に失敗しました"
            onRetry={loadResults}
            compact
          />
        ) : results.length === 0 ? (
          <div className="rounded-xl bg-default-50 px-3 py-6 text-center text-xs text-default-400">
            このシーズンの入賞はまだありません
          </div>
        ) : (
          <div className={BLEED}>
            <Swiper
              modules={[A11y, Pagination]}
              // 一覧側(CityleagueResult)は slidesPerView="auto" だが、あちらは Swiper が
              // ブロック要素の中にいて幅が確定する。ここは flex の中に置くため auto だと
              // スライド幅が中身依存になりカードからはみ出す。1枚固定で幅を親から取る。
              slidesPerView={1}
              // デッキコードが登録されていない入賞は画像のぶんカードが短くなる。既定では
              // 一番高いスライドに全体の高さが揃い、短いカードの下に大きな空白が残るため、
              // スライドごとの高さに追従させる(デッキ画像は aspect-2/1 で読み込み前から
              // 高さが決まるので、画像の読み込みで高さが飛ぶことはない)。
              autoHeight={true}
              loop={false}
              speed={500}
              pagination={{ clickable: true }}
              className="w-full"
            >
              {results.map((result) => (
                <SwiperSlide
                  key={`${result.official_event_id}-${result.rank}`}
                  className="px-1.5 pt-1 pb-8"
                >
                  <ResultCard result={result} />
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        )}
      </div>
    </div>
  );
}
