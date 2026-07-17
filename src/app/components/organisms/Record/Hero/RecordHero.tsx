"use client";

import { useCallback, useEffect, useState } from "react";
import { SetStateAction, Dispatch } from "react";

import { Card, Image, Link, Chip, Skeleton, useDisclosure } from "@heroui/react";

import { LuEyeOff, LuPencilLine } from "react-icons/lu";

import FetchError from "@app/components/molecules/FetchError";
import RecordStatPanel from "@app/components/organisms/Record/Hero/RecordStatPanel";
import {
  HERO_INFO_COL_CLASS,
  heroColRowStyle,
} from "@app/components/organisms/Record/Hero/heroColumns";
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
  shouldShowEnvironmentChip,
} from "@app/components/organisms/Record/officialEventHelpers";

import { MatchStats } from "@app/utils/matchStats";
import PokemonSprite from "@app/components/atoms/PokemonSprite";

import { RecordGetByIdResponseType } from "@app/types/record";
import { OfficialEventGetByIdResponseType } from "@app/types/official_event";
import { TonamelEventGetByIdResponseType } from "@app/types/tonamel_event";
import { UnofficialEventGetByIdResponseType } from "@app/types/unofficial_event";
import { EnvironmentType } from "@app/types/environment";
import { DeckGetByIdResponseType } from "@app/types/deck";

import { safeExternalUrl } from "@app/utils/url";

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
  // 戦績パネルの裏面(貢献度)を表示するか / その切り替え
  showSynergy?: boolean;
  onToggleSynergy?: () => void;
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
  showSynergy,
  onToggleSynergy,
  ignoreStatsFlg,
  deckSlot,
  matchesSlot,
  accentColorClass,
}: ShellProps) {
  const hasStats = stats.total > 0;

  // 背景グラデ左下のグローを左サイドバーと同色にする。対応表に無い場合は
  // CSS側の従来色(青)へフォールバックさせるため変数を指定しない。
  const accentRgb = ACCENT_RGB[accentColorClass];
  const heroStyle = accentRgb
    ? ({ "--hero-accent-rgb": accentRgb } as React.CSSProperties)
    : undefined;

  return (
    <div className="flex w-full flex-col gap-3">
      {/* 集計対象外の記録は、戦績カードとは切り離した独立カードとしてその上部に表示する。
          シェア画像には含めない(data-capture-hide で除外) */}
      {ignoreStatsFlg && (
        <div data-capture-hide="true">
          <IgnoreStatsBanner />
        </div>
      )}

      <Card
        shadow="sm"
        style={heroStyle}
        className="record-hero-bg relative w-full overflow-hidden"
      >
        {/* 種別ごとのアクセント(記録一覧カードと同じ配色)をカード上部の枠線としてのみ表示。
            色は heroStyle で設定済みの --hero-accent-rgb を使い、対応表に無い場合は
            従来色(青)へフォールバックする。カードの角丸に合わせるため rounded-[inherit] を指定。 */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] border-t-[3px]"
          style={{ borderTopColor: `rgb(${accentRgb ?? "59, 130, 246"})` }}
        />

        <div className="px-3 py-3">
          {/* 上段は左右2カラム。左カラムは「上：イベント情報／下：使用デッキ」の縦積み、
            右カラムは戦績パネル。items-stretch で両カラムの高さを揃え、低い方が
            引き伸ばされることで左右のバランスが取れる。
            幅比と間隔は heroColumns.ts で一元管理する(比率の変更もそこだけでよい)。 */}
          <div className="flex items-stretch" style={heroColRowStyle}>
            {/* 左：イベント情報(上)＋使用デッキ(下) */}
            <div className={`${HERO_INFO_COL_CLASS} flex flex-col`}>
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

              {/* 使用デッキ(登録済みの場合のみ)。mt-auto で左カラムの最下部へ寄せ、
                右の戦績パネルと下端を揃える */}
              {deckSlot && <div className="mt-auto pt-3.5">{deckSlot}</div>}
            </div>

            {/* 右：戦績パネル(対戦がある場合のみ) */}
            {hasStats && (
              <RecordStatPanel
                stats={stats}
                showSynergy={showSynergy}
                onToggleSynergy={onToggleSynergy}
              />
            )}
          </div>

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
    </div>
  );
}

type Props = {
  record: RecordGetByIdResponseType;
  setRecord: Dispatch<SetStateAction<RecordGetByIdResponseType | null>>;
  // 対戦一覧から集計した戦績(親で管理し、対戦の追加・更新・削除に即追従させる)
  stats: MatchStats;
  // 戦績パネルの裏面(貢献度)を表示するか。表示状態は親で管理する。
  // シェア画像は別インスタンスの RecordHero を画面外に描画して撮るため、
  // 状態を親で持たないと画面と同じ面を撮れない。
  showSynergy?: boolean;
  // 戦績パネルのタップで裏表を切り替える。未指定ならパネルはタップできない
  // (シェア画像のキャプチャ用インスタンスでは渡さない)。
  onToggleSynergy?: () => void;
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
  // 使用デッキ行を描画しない(シェア画像で「使用デッキを表示する」オプションOFF時に使う)。
  hideDeck?: boolean;
  // 公式イベントの会場(店舗名)チップを描画しない
  // (シェア画像で「会場を表示する」オプションOFF時に使う)。
  hideVenue?: boolean;
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
  showSynergy = false,
  onToggleSynergy,
  enableEditTCGMeisterURL = false,
  enableEditUsedDeck = false,
  matchesSlot,
  onReadyChange,
  hideDeck = false,
  hideVenue = false,
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

  // 使用デッキ行(各イベント種別で共通)。左カラムの最下部に置き、右の戦績パネルと
  // 左右で釣り合わせる。左カラムの幅は戦績パネルのぶん狭いため、スプライトは h-10 w-10、
  // 編集の鉛筆は見出し横の小アイコンに寄せて、デッキ名の横幅を最優先で確保する。
  // 行全体がタップで編集モーダルを開ける(鉛筆はその見た目上の手がかり)。
  const deckRowInner = deck ? (
    <>
      {/* 見出しは日付・対戦結果と統一感を出すため左上に配置する */}
      <div className="flex items-center gap-1">
        <span className="text-[9px] font-bold tracking-wide text-default-400">
          使用デッキ
        </span>
        {enableEditUsedDeck && <LuPencilLine className="h-2.5 w-2.5 text-default-400" />}
      </div>
      <div className="flex w-full items-center gap-2">
        {/* スプライト(2枚は隣接) */}
        <div className="flex shrink-0 items-center">
          <PokemonSprite id={deck.pokemon_sprites[0]?.id} size={40} />
          <PokemonSprite id={deck.pokemon_sprites[1]?.id} size={40} />
        </div>
        {/* デッキ名 */}
        <div className="min-w-0 flex-1 truncate text-sm font-bold">{deck.name}</div>
      </div>
    </>
  ) : null;

  const deckRowClass = "flex w-full flex-col gap-1";

  // 取得中、または保持しているデッキが record の現在の deck_id と一致しない
  // (＝変更直後でまだ新しいデッキを取得できていない)場合はローディング表示にする。
  const isDeckLoading = !!record.deck_id && (loadingDeck || deck?.id !== record.deck_id);

  // 使用デッキ取得中のローディング行(実表示と同じ骨格でガタつきを抑える)
  const deckLoadingRow = (
    <div className={deckRowClass}>
      <Skeleton className="h-2.5 w-12 rounded" />
      <div className="flex w-full items-center gap-2">
        <div className="flex shrink-0 items-center">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
        <div className="min-w-0 flex-1">
          <Skeleton className="h-4 w-24 max-w-full rounded-md" />
        </div>
      </div>
    </div>
  );

  // 「使用デッキを表示する」OFF時の行。使用デッキの部分を単に消すと、その記録に
  // そもそもデッキが登録されていないのか、意図的に伏せているのかが伝わらないため、
  // 同じ場所に「非公開」であることを明示する(デッキ名・スプライトは出さない)。
  const deckHiddenRow = (
    <div className={deckRowClass}>
      <div className="flex items-center gap-1">
        <span className="text-[9px] font-bold tracking-wide text-default-400">
          使用デッキ
        </span>
      </div>
      <div className="flex w-full items-center gap-2">
        {/* スプライト2枚(40px × 2)と同じ幅・高さの枠にして、実表示との行の高さを揃える */}
        <div className="flex h-10 w-20 shrink-0 items-center justify-center rounded-lg bg-default-100">
          <LuEyeOff className="h-4 w-4 text-default-400" />
        </div>
        <div className="min-w-0 flex-1 truncate text-sm font-bold text-default-400">
          非公開
        </div>
      </div>
    </div>
  );

  const deckNode = !record.deck_id ? null : hideDeck ? (
    deckHiddenRow
  ) : (
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
  );

  // ---- 公式イベント ----
  if (isOfficial && officialEvent) {
    const dateStr =
      record.event_date && !record.event_date.startsWith("0001-01-01")
        ? record.event_date
        : record.created_at.toString();
    const venue = hideVenue ? "" : getEventVenueLabel(officialEvent);

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
            !enableEditTCGMeisterURL ? safeExternalUrl(record.tcg_meister_url) : undefined
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
              {officialEvent.environment_title && shouldShowEnvironmentChip(officialEvent) && (
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
          showSynergy={showSynergy}
          onToggleSynergy={onToggleSynergy}
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
        showSynergy={showSynergy}
        onToggleSynergy={onToggleSynergy}
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
        showSynergy={showSynergy}
        onToggleSynergy={onToggleSynergy}
        ignoreStatsFlg={record.ignore_stats_flg}
        deckSlot={deckNode}
        matchesSlot={matchesSlot}
      />
    );
  }

  return null;
}
