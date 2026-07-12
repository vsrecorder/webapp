"use client";

import { useCallback, useEffect, useState } from "react";
import { SetStateAction, Dispatch } from "react";

import { Card, Image, Link, Chip, Skeleton, useDisclosure } from "@heroui/react";

import { LuPencilLine } from "react-icons/lu";

import FetchError from "@app/components/molecules/FetchError";
import WinRateRing from "@app/components/organisms/Record/Hero/WinRateRing";
import IgnoreStatsBanner from "@app/components/organisms/Record/IgnoreStatsBanner";
import RecordHeroSkeleton from "@app/components/organisms/Record/Hero/RecordHeroSkeleton";
import EditTCGMeisterURLModal from "@app/components/organisms/Record/Modal/EditTCGMeisterURLModal";
import UpdateUsedDeckModal from "@app/components/organisms/Deck/Modal/UpdateUsedDeckModal";
import {
  getEventIconUrl,
  getChipColor,
  getEventTypeName,
  getEventVenueLabel,
  getEventAccentColor,
  cleanOfficialEventTitle,
  isExtraBattleDay,
} from "@app/components/organisms/Record/officialEventHelpers";

import { MatchStats } from "@app/utils/matchStats";
import { spriteImageUrl, spriteScaleClass } from "@app/utils/sprite";

import { RecordGetByIdResponseType } from "@app/types/record";
import { OfficialEventGetByIdResponseType } from "@app/types/official_event";
import { TonamelEventGetByIdResponseType } from "@app/types/tonamel_event";
import { UnofficialEventGetByIdResponseType } from "@app/types/unofficial_event";
import { EnvironmentType } from "@app/types/environment";
import { DeckGetByIdResponseType } from "@app/types/deck";

async function fetchOfficialEvent(id: number): Promise<OfficialEventGetByIdResponseType> {
  const res = await fetch(`/api/official_events/${id}`, {
    cache: "no-store",
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

async function fetchTonamelEvent(id: string): Promise<TonamelEventGetByIdResponseType> {
  const res = await fetch(`/api/tonamel_events/${id}`, {
    cache: "no-store",
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

async function fetchUnofficialEvent(
  id: string,
): Promise<UnofficialEventGetByIdResponseType> {
  const res = await fetch(`/api/unofficial_events/${id}`, {
    cache: "no-store",
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

async function fetchDeck(id: string): Promise<DeckGetByIdResponseType> {
  const res = await fetch(`/api/decks/${id}`, {
    cache: "no-store",
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

async function fetchEnvironment(date: string): Promise<EnvironmentType> {
  const res = await fetch(`/api/environments?date=${date.split("T")[0]}`, {
    cache: "no-store",
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

// 開催日文字列を「YYYY年M月D日(曜)」へ整形する
function formatEventDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

// イベント名にスペースや空白(半角/全角スペース・タブ等)が含まれる場合、
// その位置で改行して表示する。空白の連なりは1つの区切りとして扱う。
function renderEventTitle(title: string): React.ReactNode {
  const segments = title.split(/\s+/).filter((s) => s.length > 0);
  if (segments.length <= 1) return title;
  return segments.map((seg, i) => (
    <span key={i} className="block">
      {seg}
    </span>
  ));
}

// 左サイドバーのアクセントクラス → 背景グラデ左下グロー用のRGB。
// 左バーの色(bg-*)と戦績カードのグラデーションを同色にするための対応表。
const ACCENT_RGB: Record<string, string> = {
  "bg-yellow-400": "250, 204, 21",
  "bg-purple-500": "168, 85, 247",
  "bg-blue-300": "147, 197, 253",
  "bg-green-500": "34, 197, 94",
  "bg-teal-500": "20, 184, 166",
  "bg-slate-400": "148, 163, 184",
  "bg-pink-400": "244, 114, 182",
  "bg-orange-500": "249, 115, 22",
  "bg-default-400": "161, 161, 170",
  "bg-default-300": "212, 212, 216",
};

// ヒーロー内で共有する見た目の骨格。差分のみ props で受け取る。
type ShellProps = {
  iconNode: React.ReactNode;
  iconBoxClassName: string;
  title: string;
  // 指定した場合、アイコンとイベント名を外部リンクにする(Tonamel記録などで使用)
  titleHref?: string;
  // 指定した場合、アイコンとイベント名タップでこのハンドラを呼ぶ(TCGマイスターURL編集など)。
  // titleHref と同時指定時は titleHref を優先する。
  onTitleClick?: () => void;
  date: string;
  chips: React.ReactNode;
  action?: React.ReactNode;
  stats: MatchStats;
  ignoreStatsFlg: boolean;
  // 使用デッキ行(登録済みの場合のみ)。ヒーロー下段(対戦結果の上)に表示する
  deckSlot?: React.ReactNode;
  // 対戦結果(対戦一覧)。ヒーロー最下段に表示する。
  // かつての「勝敗の推移」の位置を、より情報量のある対戦結果へ置き換える。
  matchesSlot?: React.ReactNode;
  // 記録一覧カードの左サイドバーと同じ、種別ごとのアクセント色(bg-*)
  accentColorClass: string;
};

function HeroShell({
  iconNode,
  iconBoxClassName,
  title,
  titleHref,
  onTitleClick,
  date,
  chips,
  action,
  stats,
  ignoreStatsFlg,
  deckSlot,
  matchesSlot,
  accentColorClass,
}: ShellProps) {
  const hasStats = stats.total > 0;
  // 背景グラデ：負け越し(勝率50%未満)のときは負け色、それ以外は勝ち色
  const bgClass =
    hasStats && stats.winRate < 50 ? "record-hero-bg-loss" : "record-hero-bg";

  // 背景グラデ左下のグローを左サイドバーと同色にする。対応表に無い場合は
  // CSS側の従来色(青)へフォールバックさせるため変数を指定しない。
  const accentRgb = ACCENT_RGB[accentColorClass];
  const heroStyle = accentRgb
    ? ({ "--hero-accent-rgb": accentRgb } as React.CSSProperties)
    : undefined;

  return (
    <Card
      shadow="sm"
      style={heroStyle}
      className={`${bgClass} relative w-full overflow-hidden`}
    >
      {/* 種別ごとのアクセント(記録一覧カードと同じ配色)をカード外周全体の枠線として表示。
          色は heroStyle で設定済みの --hero-accent-rgb を使い、対応表に無い場合は
          従来色(青)へフォールバックする。カードの角丸に合わせるため rounded-[inherit] を指定。 */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] border-[3px]"
        style={{ borderColor: `rgb(${accentRgb ?? "59, 130, 246"})` }}
      />
      {/* 集計対象外の記録はヒーロー最上部にバナーを段差なく差し込む。
          シェア画像には含めない(data-capture-hide で除外) */}
      {ignoreStatsFlg && (
        <div data-capture-hide="true">
          <IgnoreStatsBanner flush />
        </div>
      )}

      <div className="px-4.5 py-4.5">
        <div className="flex items-start gap-3">
          {/* 左：イベント情報 */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-default-400">{date}</span>
              {action}
            </div>

            {(() => {
              // アイコン＋イベント名の中身は共通。リンク/タップ/静的で外側だけ切り替える
              const iconTitle = (
                <>
                  <div
                    className={`flex h-11.25 w-11.25 shrink-0 items-center justify-center overflow-hidden rounded-xl ring-1 ring-inset ring-black/5 ${iconBoxClassName}`}
                  >
                    {iconNode}
                  </div>
                  <h3 className="min-w-0 text-base font-bold leading-tight wrap-break-word">
                    {renderEventTitle(title)}
                  </h3>
                </>
              );
              const rowClass =
                "mt-1 flex items-center gap-2.5 transition-opacity hover:opacity-80";

              if (titleHref) {
                return (
                  <Link
                    isExternal
                    href={titleHref}
                    color="foreground"
                    className={rowClass}
                  >
                    {iconTitle}
                  </Link>
                );
              }
              if (onTitleClick) {
                return (
                  <button
                    type="button"
                    onClick={onTitleClick}
                    className={`${rowClass} w-full text-left`}
                  >
                    {iconTitle}
                  </button>
                );
              }
              return <div className="mt-1 flex items-center gap-2.5">{iconTitle}</div>;
            })()}

            <div className="mt-2 flex flex-wrap items-center gap-1.5">{chips}</div>
          </div>

          {/* 右：戦績(対戦がある場合のみ) */}
          {hasStats && (
            <div className="flex shrink-0 flex-col items-center gap-2">
              <WinRateRing winRate={stats.winRate} size={86} />
              <div className="text-[15px] font-bold tabular-nums">
                <span className="text-success">{stats.wins}</span>
                <span className="text-[0.62em] font-bold text-default-500">勝</span>{" "}
                <span className="text-danger">{stats.losses}</span>
                <span className="text-[0.62em] font-bold text-default-500">敗</span>
              </div>
            </div>
          )}
        </div>

        {/* 使用デッキ(登録済みの場合のみ) */}
        {deckSlot}

        {/* 対戦結果(親から受け取る)。かつて「勝敗の推移」があった位置に配置する */}
        {matchesSlot && (
          <div className="mt-3.5 flex w-full flex-col gap-1.5 border-t border-divider pt-3">
            <span className="text-[9px] font-bold tracking-wide text-default-400">
              対戦結果
            </span>
            {/* 戦績カードのグラデーションと各行の勝敗グラデーションが干渉して
                見づらくなるのを防ぐため、対戦結果は不透明なサーフェスの
                パネルに収めて視覚的に分離する */}
            <div className="overflow-hidden rounded-xl border border-divider bg-content1">
              {matchesSlot}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

type Props = {
  record: RecordGetByIdResponseType;
  setRecord: Dispatch<SetStateAction<RecordGetByIdResponseType | null>>;
  // 対戦一覧から集計した戦績(親で管理し、対戦の追加・更新・削除に即追従させる)
  stats: MatchStats;
  // 公式イベントで TCGマイスターURL の編集ボタンを表示するか(詳細ページのみ true)
  enableEditTCGMeisterURL?: boolean;
  // 使用デッキ行のタップで使用デッキ編集モーダルを開けるようにするか(詳細ページのみ true)
  enableEditUsedDeck?: boolean;
  // 対戦結果(対戦一覧)。ヒーロー最下段に融合して表示する。
  // 記録詳細ページ・記録情報モーダルから <Matches> を渡す。
  matchesSlot?: React.ReactNode;
  // イベント・使用デッキの取得が完了して実データを描画できる状態かを通知する。
  // シェア画像のキャプチャで、スケルトン状態のまま撮影されるのを防ぐために使う。
  onReadyChange?: (ready: boolean) => void;
  // 使用デッキ行を描画しない(シェア画像で「使用デッキを表示しない」オプションON時に使う)。
  hideDeck?: boolean;
};

/*
 * 記録詳細ページ・記録情報モーダルの最上部に置くヒーロー。
 * イベント情報(公式/Tonamel/自由形式)と、対戦から集計した勝率リング・勝敗・
 * 勝敗の推移を1つのカードへ融合する。集計対象外の記録は最上部にバナーを表示する。
 * 戦績(stats)は親から受け取り、対戦一覧の変更に追従させる。
 */
export default function RecordHero({
  record,
  setRecord,
  stats,
  enableEditTCGMeisterURL = false,
  enableEditUsedDeck = false,
  matchesSlot,
  onReadyChange,
  hideDeck = false,
}: Props) {
  const [officialEvent, setOfficialEvent] =
    useState<OfficialEventGetByIdResponseType | null>(null);
  const [tonamelEvent, setTonamelEvent] =
    useState<TonamelEventGetByIdResponseType | null>(null);
  const [unofficialEvent, setUnofficialEvent] =
    useState<UnofficialEventGetByIdResponseType | null>(null);
  const [environment, setEnvironment] = useState<EnvironmentType | null>(null);
  const [deck, setDeck] = useState<DeckGetByIdResponseType | null>(null);
  // 使用デッキの取得中フラグ。デッキ変更時に古いデッキが一瞬残らないよう、
  // 取得完了までデッキ行をローディング表示にするために使う。
  const [loadingDeck, setLoadingDeck] = useState(false);

  const [loadingEvent, setLoadingEvent] = useState(true);
  const [error, setError] = useState(false);

  const {
    isOpen: isOpenForTCGMeisterURLModal,
    onOpen: onOpenForTCGMeisterURLModal,
    onOpenChange: onOpenChangeForTCGMeisterURLModal,
  } = useDisclosure();

  const {
    isOpen: isOpenForUsedDeckModal,
    onOpen: onOpenForUsedDeckModal,
    onOpenChange: onOpenChangeForUsedDeckModal,
  } = useDisclosure();

  const isOfficial = record.official_event_id !== 0;
  const isTonamel = record.tonamel_event_id !== "";
  const isUnofficial = record.unofficial_event_id !== "";

  // イベント情報を種別に応じて取得する（失敗時のリロードから再利用）
  const loadEvent = useCallback(async () => {
    setError(false);
    setLoadingEvent(true);

    try {
      if (isOfficial) {
        const data = await fetchOfficialEvent(record.official_event_id);
        data.title = cleanOfficialEventTitle(data.title);
        setOfficialEvent(data);
      } else if (isTonamel) {
        const data = await fetchTonamelEvent(record.tonamel_event_id);
        setTonamelEvent(data);
      } else if (isUnofficial) {
        const data = await fetchUnofficialEvent(record.unofficial_event_id);
        setUnofficialEvent(data);
      }
    } catch (err) {
      console.log(err);
      setError(true);
    } finally {
      setLoadingEvent(false);
    }
  }, [
    isOfficial,
    isTonamel,
    isUnofficial,
    record.official_event_id,
    record.tonamel_event_id,
    record.unofficial_event_id,
  ]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  // 使用デッキを取得する(登録済みの記録のみ。ヒーロー下段に名前とスプライトを表示)
  useEffect(() => {
    if (!record.deck_id) {
      setDeck(null);
      setLoadingDeck(false);
      return;
    }
    let ignore = false;
    setLoadingDeck(true);
    fetchDeck(record.deck_id)
      .then((data) => {
        if (!ignore) setDeck(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!ignore) setLoadingDeck(false);
      });
    return () => {
      ignore = true;
    };
  }, [record.deck_id]);

  // Tonamel/自由形式は開催日時点の対戦環境を別途取得する(公式はイベント側が保持)
  useEffect(() => {
    if (isOfficial) return;

    const dateStr =
      record.event_date && !record.event_date.startsWith("0001-01-01")
        ? record.event_date
        : unofficialEvent?.date && !unofficialEvent.date.startsWith("0001-01-01")
          ? unofficialEvent.date
          : record.created_at?.toString();
    if (!dateStr) return;

    let ignore = false;
    fetchEnvironment(dateStr)
      .then((data) => {
        if (!ignore) setEnvironment(data);
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [isOfficial, record.event_date, record.created_at, unofficialEvent?.date]);

  // イベント・使用デッキの取得が完了したら親へ通知する(シェア画像のスケルトン撮影防止)。
  // 使用デッキは未登録なら取得不要。登録済みは現在の deck_id と一致するまで待つ。
  useEffect(() => {
    if (!onReadyChange) return;
    // 使用デッキを描画しない場合はデッキの取得完了を待つ必要はない
    const deckReady =
      hideDeck || !record.deck_id || (!loadingDeck && deck?.id === record.deck_id);
    onReadyChange(!loadingEvent && !error && deckReady);
  }, [onReadyChange, loadingEvent, error, loadingDeck, deck, record.deck_id, hideDeck]);

  if (error) {
    return <FetchError onRetry={loadEvent} />;
  }

  if (loadingEvent) {
    return <RecordHeroSkeleton />;
  }

  // 使用デッキ行(各イベント種別で共通)。使用デッキを主役として、大きめスプライト
  // (w-12 h-12)＋大きめのデッキ名で独立バンドとして見せる。
  // 編集ボタンは勝率リング(size=86)と同じ幅の枠へ中央寄せし、リング中心の真下
  // (縦のライン)に並べる。行全体もタップで編集モーダルを開ける。
  const deckRowInner = deck ? (
    <>
      {/* 見出しは日付・対戦結果と統一感を出すため左上に配置する */}
      <span className="text-[9px] font-bold tracking-wide text-default-400">
        使用デッキ
      </span>
      <div className="pl-6 flex w-full items-center gap-3">
        {/* 大きめスプライト(2枚は隣接) */}
        <div className="flex shrink-0 items-center">
          <Image
            alt={deck.pokemon_sprites[0]?.id ?? "unknown"}
            src={spriteImageUrl(deck.pokemon_sprites[0]?.id)}
            radius="none"
            className={`h-12 w-12 origin-bottom object-contain ${spriteScaleClass(
              deck.pokemon_sprites[0]?.id,
            )}`}
          />
          <Image
            alt={deck.pokemon_sprites[1]?.id ?? "unknown"}
            src={spriteImageUrl(deck.pokemon_sprites[1]?.id)}
            radius="none"
            className={`h-12 w-12 origin-bottom object-contain ${spriteScaleClass(
              deck.pokemon_sprites[1]?.id,
            )}`}
          />
        </div>
        {/* デッキ名(主役サイズ) */}
        <div className="min-w-0 flex-1 truncate text-base font-bold">{deck.name}</div>
        {/* 編集ボタン(大きめ)。勝率リングと同じ幅の枠へ中央寄せして縦ラインを揃える */}
        {enableEditUsedDeck && (
          <div className="flex w-21.5 shrink-0 justify-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-default-100 text-default-500">
              <LuPencilLine className="h-5 w-5" />
            </span>
          </div>
        )}
      </div>
    </>
  ) : null;

  const deckRowClass = "mt-3.5 flex w-full flex-col gap-1.5";

  // 取得中、または保持しているデッキが record の現在の deck_id と一致しない
  // (＝変更直後でまだ新しいデッキを取得できていない)場合はローディング表示にする。
  const isDeckLoading = !!record.deck_id && (loadingDeck || deck?.id !== record.deck_id);

  // 使用デッキ取得中のローディング行(実表示と同じ骨格でガタつきを抑える)
  const deckLoadingRow = (
    <div className={deckRowClass}>
      <Skeleton className="h-2.5 w-12 rounded" />
      <div className="pl-6 flex w-full items-center gap-3">
        <div className="flex shrink-0 items-center">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <Skeleton className="h-12 w-12 rounded-lg" />
        </div>
        <div className="min-w-0 flex-1">
          <Skeleton className="h-4 w-40 max-w-full rounded-md" />
        </div>
        {enableEditUsedDeck && (
          <div className="flex w-21.5 shrink-0 justify-center">
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        )}
      </div>
    </div>
  );

  const deckNode = hideDeck ? null : record.deck_id ? (
    <>
      {enableEditUsedDeck && (
        <UpdateUsedDeckModal
          record={record}
          setRecord={setRecord}
          isOpen={isOpenForUsedDeckModal}
          onOpenChange={onOpenChangeForUsedDeckModal}
        />
      )}
      {isDeckLoading ? (
        deckLoadingRow
      ) : deck ? (
        enableEditUsedDeck ? (
          <button
            type="button"
            onClick={onOpenForUsedDeckModal}
            className={`${deckRowClass} text-left transition-opacity hover:opacity-80`}
          >
            {deckRowInner}
          </button>
        ) : (
          <div className={deckRowClass}>{deckRowInner}</div>
        )
      ) : null}
    </>
  ) : null;

  // ---- 公式イベント ----
  if (isOfficial && officialEvent) {
    const dateStr =
      record.event_date && !record.event_date.startsWith("0001-01-01")
        ? record.event_date
        : record.created_at.toString();
    const venue = getEventVenueLabel(officialEvent);

    return (
      <>
        <EditTCGMeisterURLModal
          record={record}
          setRecord={setRecord}
          isOpen={isOpenForTCGMeisterURLModal && enableEditTCGMeisterURL}
          onOpenChange={onOpenChangeForTCGMeisterURLModal}
        />
        <HeroShell
          accentColorClass={getEventAccentColor(officialEvent)}
          iconBoxClassName="bg-default-50"
          iconNode={
            <Image
              alt={officialEvent.title}
              src={getEventIconUrl(officialEvent)}
              radius="none"
              className="h-9 w-9 object-contain"
            />
          }
          title={officialEvent.title}
          // 編集可能な詳細ページ: アイコン＋イベント名タップでTCGマイスターURL編集モーダルを開く。
          // それ以外(情報モーダル等)でURL登録済みなら、タップで外部リンクを開く。
          onTitleClick={enableEditTCGMeisterURL ? onOpenForTCGMeisterURLModal : undefined}
          titleHref={
            !enableEditTCGMeisterURL && record.tcg_meister_url
              ? record.tcg_meister_url
              : undefined
          }
          date={formatEventDate(dateStr)}
          chips={
            <>
              <Chip
                size="sm"
                variant="flat"
                color={getChipColor(officialEvent)}
                className="h-5 text-[10px] font-bold"
              >
                {getEventTypeName(officialEvent)}
              </Chip>
              {officialEvent.environment_title &&
                !isExtraBattleDay(officialEvent) && (
                  <Chip
                    size="sm"
                    variant="flat"
                    color="default"
                    className="h-5 max-w-30"
                    classNames={{ content: "text-[10px] truncate min-w-0" }}
                  >
                    {`『${officialEvent.environment_title}』`}
                  </Chip>
                )}
              {venue && (
                <Chip
                  size="sm"
                  variant="flat"
                  color="default"
                  className="h-5 max-w-30"
                  classNames={{ content: "text-[10px] truncate min-w-0" }}
                >
                  {venue}
                </Chip>
              )}
            </>
          }
          stats={stats}
          ignoreStatsFlg={record.ignore_stats_flg}
          deckSlot={deckNode}
          matchesSlot={matchesSlot}
        />
      </>
    );
  }

  // ---- Tonamel ----
  if (isTonamel && tonamelEvent) {
    const dateStr =
      record.event_date && !record.event_date.startsWith("0001-01-01")
        ? record.event_date
        : record.created_at.toString();

    return (
      <HeroShell
        accentColorClass="bg-orange-500"
        iconBoxClassName="bg-orange-500"
        iconNode={<span className="text-xl font-black text-white">T</span>}
        title={tonamelEvent.title}
        titleHref={`https://tonamel.com/competition/${record.tonamel_event_id}`}
        date={formatEventDate(dateStr)}
        chips={
          <>
            <Chip
              size="sm"
              variant="flat"
              className="h-5 bg-orange-100 text-[10px] font-bold text-orange-500"
            >
              Tonamel
            </Chip>
            {environment?.title && (
              <Chip
                size="sm"
                variant="flat"
                color="default"
                className="h-5 max-w-30"
                classNames={{ content: "text-[10px] truncate" }}
              >
                {`『${environment.title}』`}
              </Chip>
            )}
          </>
        }
        stats={stats}
        ignoreStatsFlg={record.ignore_stats_flg}
        deckSlot={deckNode}
        matchesSlot={matchesSlot}
      />
    );
  }

  // ---- 自由形式 ----
  if (isUnofficial) {
    const dateStr =
      record.event_date && !record.event_date.startsWith("0001-01-01")
        ? record.event_date
        : unofficialEvent?.date && !unofficialEvent.date.startsWith("0001-01-01")
          ? unofficialEvent.date
          : record.created_at.toString();

    return (
      <HeroShell
        accentColorClass="bg-default-400"
        iconBoxClassName="bg-default-100"
        iconNode={<LuPencilLine className="h-6 w-6 text-default-500" />}
        title={unofficialEvent?.title ?? "無題のイベント"}
        date={formatEventDate(dateStr)}
        chips={
          <>
            <Chip
              size="sm"
              variant="flat"
              className="h-5 gap-0.5 bg-default-200 pl-1.5 text-[10px] font-bold text-default-600"
            >
              自由形式
            </Chip>
            {environment?.title && (
              <Chip
                size="sm"
                variant="flat"
                color="default"
                className="h-5 max-w-30"
                classNames={{ content: "text-[10px] truncate" }}
              >
                {`『${environment.title}』`}
              </Chip>
            )}
          </>
        }
        stats={stats}
        ignoreStatsFlg={record.ignore_stats_flg}
        deckSlot={deckNode}
        matchesSlot={matchesSlot}
      />
    );
  }

  return null;
}
