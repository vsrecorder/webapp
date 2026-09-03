"use client";

import { useCallback, useEffect, useState } from "react";
import { SetStateAction, Dispatch } from "react";

import { Card, Image, Link, Chip, Skeleton, useDisclosure } from "@heroui/react";

import { LuClock, LuMapPin, LuPencilLine, LuScrollText, LuSwords } from "react-icons/lu";

import FetchError from "@app/components/molecules/FetchError";
import RecordStatPanel from "@app/components/organisms/Record/Hero/RecordStatPanel";
import RecordStatPanelSkeleton from "@app/components/organisms/Record/Hero/RecordStatPanelSkeleton";
import {
  HERO_INFO_COL_CLASS,
  heroColRowStyle,
} from "@app/components/organisms/Record/Hero/heroColumns";
import IgnoreStatsBanner from "@app/components/organisms/Record/IgnoreStatsBanner";
import RecordHeroSkeleton, {
  SectionLabelSkeleton,
} from "@app/components/organisms/Record/Hero/RecordHeroSkeleton";
import EditTCGMeisterURLModal from "@app/components/organisms/Record/Modal/EditTCGMeisterURLModal";
import UpdateUsedDeckModal from "@app/components/organisms/Deck/Modal/UpdateUsedDeckModal";
import {
  getEventIconUrl,
  getEventVenueLabel,
  getEventAccentColor,
  cleanOfficialEventTitle,
  shouldShowEnvironmentChip,
} from "@app/components/organisms/Record/officialEventHelpers";

import TagChips from "@app/components/molecules/TagChips";
import RecordMetaRows, {
  type RecordMetaRow,
} from "@app/components/organisms/Record/RecordMetaRows";

import { tagTextColor } from "@app/utils/tagColor";

import { MatchStats } from "@app/utils/matchStats";
import PokemonSprite from "@app/components/atoms/PokemonSprite";
import { getDeckSpriteBySlot } from "@app/utils/deckSprite";

import { RecordGetByIdResponseType } from "@app/types/record";
import { OfficialEventGetByIdResponseType } from "@app/types/official_event";
import { TonamelEventGetByIdResponseType } from "@app/types/tonamel_event";
import { UnofficialEventGetByIdResponseType } from "@app/types/unofficial_event";
import { DeckGetByIdResponseType } from "@app/types/deck";
import { TagType } from "@app/types/tag";
import { REGULATION_ID_STANDARD, regulationDisplay } from "@app/types/regulation";

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

// 開催日文字列を「YYYY年M月D日(曜)」へ整形する
function formatEventDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

// 開始時刻を「HH:MM」へ整形する。未設定(ゼロ値)・不正値のときは空文字を返し、
// 呼び出し側でその行ごと落とせるようにする。
function formatEventTime(value: Date | string | undefined | null): string {
  if (!value) return "";

  const str = String(value);
  // APIは未設定の日時にゼロ値(0001-01-01)を返す
  if (str.startsWith("0001-01-01")) return "";

  const date = new Date(str);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
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

// 補足行の上限。これを超えるとイベントパネルが戦績パネルより明らかに高くなり、
// 上段が「対になった2枚」に見えなくなる(390px 幅で戦績パネルは約172px)。
const HERO_META_MAX = 4;

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
  // イベントの事実(会場・開始時刻・リーグ・対戦環境など)。優先度の高い順に渡すと、
  // 上から HERO_META_MAX 行までを補足行として並べる。
  meta?: RecordMetaRow[];
  // 記録に付与されたタグ。大会順位(優勝・ベスト4 など)はパネル右上のメダルバッジへ、
  // それ以外はチップ行へ振り分ける。
  tags?: TagType[];
  action?: React.ReactNode;
  stats: MatchStats;
  // 対戦一覧をまだ取得中か。stats は対戦一覧から集計するため、取得中は total が 0 で
  // 「対戦0件の記録」と見分けが付かない。取得中は戦績パネルの骨格を置いて枠を確保する。
  loadingStats?: boolean;
  // 戦績パネルの裏面(貢献度)を表示するか / その切り替え
  showSynergy?: boolean;
  onToggleSynergy?: () => void;
  ignoreStatsFlg: boolean;
  // 使用デッキ(登録済みの場合のみ)。上段2カラムの下に全幅の帯として表示する
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
  meta,
  tags,
  action,
  stats,
  loadingStats,
  showSynergy,
  onToggleSynergy,
  ignoreStatsFlg,
  deckSlot,
  matchesSlot,
  accentColorClass,
}: ShellProps) {
  const hasStats = stats.total > 0;

  // 補足行は上限まで。行の取捨は組み立て側の優先順に委ね、ここでは切るだけにする。
  const metaRows = (meta ?? []).slice(0, HERO_META_MAX);

  /*
   * 大会順位のタグはメダルバッジとしてパネル右上へ引き上げる。
   * 「優勝」はその記録でいちばん誇らしい情報なのに、チップ行では「調整中」のような
   * 自分用ラベルと同じ見た目で並んでしまい埋もれていた。
   *
   * 記録に付くプリセットタグは大会順位だけなので preset_flg で判別できる
   * (もう一つのプリセット群 ACE SPEC はデッキ・デッキコード・対戦結果に付くもので、
   *  記録の TagSelector は presetCategory="placement" しか出さない)。
   * 順位は TagSelector 側で排他選択にしてあるので通常は1つだが、それ以前に付けた
   * 記録は複数持ちうる。その場合はバッジを1つに絞り、残りはチップ行へ回す。
   */
  const placementTag = (tags ?? []).find((tag) => tag.preset_flg);
  const chipTags = (tags ?? []).filter((tag) => tag !== placementTag);

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
          {/* 上段は左右2カラム。左カラムはイベント情報、右カラムは戦績パネル。
            items-stretch で両カラムの高さを揃え、低い方が引き伸ばされることで
            左右のバランスが取れる。
            幅比と間隔は heroColumns.ts で一元管理する(比率の変更もそこだけでよい)。 */}
          <div className="flex items-stretch" style={heroColRowStyle}>
            {/* 左：イベント情報。右の戦績パネルと同じ枠線・角丸・面にして、上段を
              「左＝イベント / 右＝戦績」の対になった2枚として読ませる。
              グローは戦績パネル(右上・勝率色)と対称になるよう左上からアクセント色を差す。 */}
            <div
              className={`${HERO_INFO_COL_CLASS} relative flex flex-col overflow-hidden rounded-2xl border border-divider bg-content1/60 px-2.5 py-2.5`}
            >
              {/* アクセントのグロー(パネル背景)。中身は relative なラッパーで前面に置く */}
              <span
                aria-hidden
                className="record-event-glow pointer-events-none absolute inset-0"
              />

              {/* 大会順位のメダルバッジ。パネルの角に貼り付いたリボンとして見せる。
                色はタグ自身が持つ配色(シティリーグ入賞バッジと揃えてサーバ側で決めている)を使い、
                万一色を持たないプリセットが来ても既定色で成立させる。 */}
              {placementTag && (
                <span
                  // 幅の上限はパネルの 45%。バッジは絶対配置で日付を押しのけないため、
                  // 上限が無いと長い順位名(「予選抜けベスト16」など)が 320px 端末で
                  // 日付に重なる。45% なら実在する順位名(最長「ベスト16」)は truncate されない。
                  className={`absolute top-0 right-0 z-10 flex max-w-[45%] items-center rounded-tr-2xl rounded-bl-xl px-2.5 py-1.5 text-[0.8125rem] leading-none font-bold ${
                    placementTag.color ? "" : "bg-default-200 text-default-700"
                  }`}
                  style={
                    placementTag.color
                      ? {
                          backgroundColor: placementTag.color,
                          color: tagTextColor(
                            placementTag.color,
                            placementTag.text_color,
                          ),
                        }
                      : undefined
                  }
                >
                  <span className="truncate">{placementTag.name}</span>
                </span>
              )}

              <div className="relative flex items-center justify-between gap-2">
                <span className="text-[0.6875rem] font-medium text-default-400">
                  {date}
                </span>
                {action}
              </div>

              {/* 使用デッキを全幅の区画へ移したぶん、左カラムは戦績パネルより低くなりやすい。
                日付はパネル上端に揃えたまま、イベント名とチップの塊だけを残りの高さの
                中央へ置き、勝率リングとの視覚的な釣り合いを取る(my-auto)。
                左カラムの方が高いときは余白が無いので、この指定は効かない。 */}
              <div className="relative my-auto">
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
                  return (
                    <div className="mt-1 flex items-center gap-2.5">{iconTitle}</div>
                  );
                })()}

                {/* イベントの事実(会場・時刻・対戦環境)。記録一覧のカードと同じ部品を使う */}
                <RecordMetaRows rows={metaRows} className="mt-2 empty:hidden" />

                {/* チップ行はラベル(イベント種別・自分用のタグ)だけにする。事実は上の補足行、
                  大会順位は右上のメダルバッジが持つ。
                  どちらも無ければ行ごと消えて mt-2 の余白も残らない(empty:hidden)。 */}
                <div className="mt-2 flex flex-wrap items-center gap-1.5 empty:hidden">
                  {chips}
                  <TagChips tags={chipTags} />
                </div>
              </div>
            </div>

            {/* 右：戦績パネル。対戦一覧の取得中は骨格を置いて枠を先に確保する
              (取得できてから描くと、その間だけイベント欄が全幅になり、
              届いた瞬間にパネルが割り込んでカードが組み替わる)。
              取得が終わって対戦0件と確定した記録では、従来どおりパネルを出さない。 */}
            {hasStats ? (
              <RecordStatPanel
                stats={stats}
                showSynergy={showSynergy}
                onToggleSynergy={onToggleSynergy}
              />
            ) : loadingStats ? (
              <RecordStatPanelSkeleton />
            ) : null}
          </div>

          {/* 使用デッキ(登録済みの場合のみ)。かつては左カラムの最下部に置いていたが、
            左カラムは戦績パネルのぶん狭く、デッキ名がほぼ必ず省略されていた。
            対戦結果と同じ全幅の区画として独立させ、カード幅いっぱいを名前に使わせる。 */}
          {deckSlot && (
            <div className="mt-3.5 w-full border-t border-divider pt-3">{deckSlot}</div>
          )}

          {/* 対戦結果(親から受け取る)。かつて「勝敗の推移」があった位置に配置する */}
          {matchesSlot && (
            <div className="mt-3.5 flex w-full flex-col gap-1.5 border-t border-divider pt-3">
              <span className="text-[0.5625rem] font-bold tracking-wide text-default-400">
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
  // 対戦一覧をまだ取得中か。戦績パネルの出現でカードが組み替わるのを防ぐために使う。
  // シェア画像のキャプチャ用インスタンスでは渡さない(骨格を撮ってしまうため)。
  loadingStats?: boolean;
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
  // 対戦結果を編集できる画面か(詳細ページのみ true)。実体の対戦結果は matchesSlot として
  // 親から渡ってくるのでここでは使わず、ローディング中の骨格の形を実体へ寄せるためだけに使う。
  enableEditMatches?: boolean;
  // 対戦結果(対戦一覧)。ヒーロー最下段に融合して表示する。
  // 記録詳細ページ・記録情報モーダルから <Matches> を渡す。
  matchesSlot?: React.ReactNode;
  // イベント・使用デッキの取得が完了して実データを描画できる状態かを通知する。
  // シェア画像のキャプチャで、スケルトン状態のまま撮影されるのを防ぐために使う。
  onReadyChange?: (ready: boolean) => void;
  // 使用デッキの区画を描画しない(シェア画像で「使用デッキを表示する」オプションOFF時に使う)。
  // 見出しごと消えるため、画像には使用デッキが「あったこと」自体が残らない。
  hideDeck?: boolean;
  // 公式イベントの会場(店舗名)チップを描画しない
  // (シェア画像で「会場を表示する」オプションOFF時に使う)。
  hideVenue?: boolean;
  // 値が変わるとイベント情報を取り直す。自由形式イベントの編集は参照先IDが
  // 変わらないため、record の変化だけでは新しいイベント名を取得できない。
  eventRefreshKey?: number;
  // true の間はデータが揃っていてもスケルトンを出し続ける。
  // モーダルの入場アニメーション中に実データへの差し替え(大きなコミット)が走ると
  // シートの動きが止まるため、着地までの間これを立てて差し替えを遅延させる。
  holdSkeleton?: boolean;
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
  loadingStats = false,
  showSynergy = false,
  onToggleSynergy,
  enableEditTCGMeisterURL = false,
  enableEditUsedDeck = false,
  enableEditMatches = false,
  matchesSlot,
  onReadyChange,
  hideDeck = false,
  hideVenue = false,
  eventRefreshKey = 0,
  holdSkeleton = false,
}: Props) {
  const [officialEvent, setOfficialEvent] =
    useState<OfficialEventGetByIdResponseType | null>(null);
  const [tonamelEvent, setTonamelEvent] =
    useState<TonamelEventGetByIdResponseType | null>(null);
  const [unofficialEvent, setUnofficialEvent] =
    useState<UnofficialEventGetByIdResponseType | null>(null);
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
    // eventRefreshKey は取り直しのトリガーとしてのみ使う(loadEvent 内では参照しない)
  }, [loadEvent, eventRefreshKey]);

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

  if (loadingEvent || holdSkeleton) {
    // 補足行はイベント側のデータから作るため、公式イベントだけ本数がある。
    // 参照先IDは取得前から分かるので、骨格の行数を実体に寄せておく。
    return (
      <RecordHeroSkeleton
        metaRows={isOfficial ? 3 : 0}
        matchesEditable={enableEditMatches}
      />
    );
  }

  // 使用デッキの中身を収める不透明パネル。対戦結果と同じ枠線・角丸・面にして、
  // カード背景のグラデーションから切り離す。
  const deckPanelClass =
    "flex w-full items-center gap-2.5 rounded-xl border border-divider bg-content1 px-2.5 py-2";

  // 使用デッキ行(各イベント種別で共通)。対戦結果と同じ「見出し＋不透明パネル」の
  // 区画としてカード全幅に置く。左カラム内に畳んでいた頃はデッキ名の実効幅が
  // 150px 程度しかなく、10文字前後でほぼ必ず省略されていた。
  // 名前は2行まで折り返す(それでも収まらない極端な長さだけ省略)。
  // 行全体がタップで編集モーダルを開ける(右端の鉛筆はその見た目上の手がかり)。
  const deckRowInner = deck ? (
    <>
      {/* 見出しは日付・対戦結果と統一感を出すため左上に配置する */}
      <span className="text-[0.5625rem] font-bold tracking-wide text-default-400">
        使用デッキ
      </span>
      <div className={deckPanelClass}>
        {/* スプライト(2枚は隣接) */}
        <div className="flex shrink-0 items-center">
          <PokemonSprite
            id={getDeckSpriteBySlot(deck.pokemon_sprites, 1)?.id}
            size={44}
          />
          <PokemonSprite
            id={getDeckSpriteBySlot(deck.pokemon_sprites, 2)?.id}
            size={44}
          />
        </div>
        {/* デッキ名 */}
        <span className="line-clamp-2 min-w-0 flex-1 text-sm font-bold leading-snug wrap-break-word">
          {deck.name}
        </span>
        {enableEditUsedDeck && (
          <LuPencilLine className="h-3.5 w-3.5 shrink-0 text-default-400" />
        )}
      </div>
    </>
  ) : null;

  const deckRowClass = "flex w-full flex-col gap-1.5";

  // 取得中、または保持しているデッキが record の現在の deck_id と一致しない
  // (＝変更直後でまだ新しいデッキを取得できていない)場合はローディング表示にする。
  const isDeckLoading = !!record.deck_id && (loadingDeck || deck?.id !== record.deck_id);

  // 使用デッキ取得中のローディング行(実表示と同じ骨格でガタつきを抑える)
  const deckLoadingRow = (
    <div className={deckRowClass}>
      {/* 見出しは実体と同じ行の高さ(13.5px)にする。h-2.5 のバーだけだと 3.5px 低くなる */}
      <SectionLabelSkeleton text="使用デッキ" />
      <div className={deckPanelClass}>
        {/* スプライト2枚の間隔は対戦結果の骨格(MatchSkeleton)と同じ gap-1.5 にする */}
        <div className="flex shrink-0 items-center gap-1.5">
          <Skeleton className="h-11 w-11 rounded-lg" />
          <Skeleton className="h-11 w-11 rounded-lg" />
        </div>
        <div className="min-w-0 flex-1">
          <Skeleton className="h-4 w-32 max-w-full rounded-md" />
        </div>
      </div>
    </div>
  );

  // 「使用デッキを表示する」OFF時は区画ごと描画しない。かつては同じ場所に
  // 「非公開」の行を出していたが、シェア画像では伏せたこと自体を写したくないため、
  // 見出しごと消して他の区画が詰まるようにする。
  const deckNode =
    !record.deck_id || hideDeck ? null : (
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

  // 記録側のレギュレーション。大半の記録がスタンダードで、毎回出しても情報にならないため、
  // それ以外(エクストラ・殿堂・その他)のときだけ行にする。
  const regulationRow: RecordMetaRow | null =
    record.regulation_id && record.regulation_id !== REGULATION_ID_STANDARD
      ? {
          icon: <LuScrollText className="h-3 w-3" />,
          text: regulationDisplay(record.regulation_id).name,
        }
      : null;

  // ---- 公式イベント ----
  if (isOfficial && officialEvent) {
    const dateStr =
      record.event_date && !record.event_date.startsWith("0001-01-01")
        ? record.event_date
        : record.created_at.toString();
    const venue = hideVenue ? "" : getEventVenueLabel(officialEvent);

    // 補足行の候補を優先度順に積む。上限(HERO_META_MAX)は HeroShell 側で切るので、
    // ここでは「値があるものを優先度順に並べる」ことだけを考えればよい。
    // 会場を伏せる(シェア画像)ときは1行目が落ち、後ろの行が繰り上がる。
    const startLabel = formatEventTime(officialEvent.started_at);
    const capacityLabel =
      officialEvent.capacity > 0 ? `定員 ${officialEvent.capacity}人` : "";
    // 開始時刻は「10:00 〜」の形にする(終了時刻は出さない)
    const scheduleText = [startLabel && `${startLabel} 〜`, capacityLabel]
      .filter(Boolean)
      .join(" ・ ");

    const officialMeta: RecordMetaRow[] = [
      venue ? { icon: <LuMapPin className="h-3 w-3" />, text: venue } : null,
      scheduleText ? { icon: <LuClock className="h-3 w-3" />, text: scheduleText } : null,
      officialEvent.environment_title && shouldShowEnvironmentChip(officialEvent)
        ? {
            icon: <LuSwords className="h-3 w-3" />,
            text: `『${officialEvent.environment_title}』`,
          }
        : null,
      regulationRow,
    ].filter((row): row is RecordMetaRow => row !== null);

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
          // 公式イベントは種別チップを持たないため、チップ行はタグだけになる
          // (会場・対戦環境は補足行へ移した)
          chips={null}
          meta={officialMeta}
          tags={record.tags}
          stats={stats}
          loadingStats={loadingStats}
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
          <Chip
            size="sm"
            variant="flat"
            className="h-5 bg-orange-100 text-[0.625rem] font-bold text-orange-500"
          >
            Tonamel
          </Chip>
        }
        meta={[regulationRow].filter((row): row is RecordMetaRow => row !== null)}
        tags={record.tags}
        stats={stats}
        loadingStats={loadingStats}
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
          <Chip
            size="sm"
            variant="flat"
            className="h-5 gap-0.5 bg-default-200 pl-1.5 text-[0.625rem] font-bold text-default-600"
          >
            自由形式
          </Chip>
        }
        meta={[regulationRow].filter((row): row is RecordMetaRow => row !== null)}
        tags={record.tags}
        stats={stats}
        loadingStats={loadingStats}
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
