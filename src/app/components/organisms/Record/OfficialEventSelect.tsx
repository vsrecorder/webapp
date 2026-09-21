"use client";

import { useEffect, useMemo, useRef } from "react";
import useSWR from "swr";
import WindowedSelect from "react-windowed-select";
import {
  components as reactSelectComponents,
  GroupBase,
  OptionProps,
} from "react-select";
import { Card, CardBody } from "@heroui/react";
import { CgSearch } from "react-icons/cg";
import { LuBookmark, LuCalendar, LuHouse, LuMapPin } from "react-icons/lu";

import { useReactSelectTheme } from "@app/components/molecules/Select/useReactSelectTheme";
import { reactSelectControlStyle } from "@app/components/molecules/Select/reactSelectStyles";
import ScrollingText from "@app/components/molecules/ScrollingText";
import {
  OfficialEventOption,
  toOfficialEventOption,
} from "@app/components/organisms/Record/officialEventOption";
import {
  OfficialEventResponseType,
  RecordCreateOfficialEventType,
} from "@app/types/official_event";
import { officialEventListUrl } from "@app/utils/officialEventList";

/*
 * 種別アイコンは HeroUI の <Image> を使わない。読み込み完了まで opacity-0 で、
 * キャッシュ済みの画像だと load を取りこぼして透明のまま残ることがある
 * (小さなPNGにフェードインも要らない)。素の <img> で出す。
 */

/*
 * 開催日で絞った公式イベントの選択欄(検索バー＋選んだイベントのプレビュー)。
 *
 * 記録の作成(RecordCreate)・クイック作成(QuickRecordCreate)・記録のイベント情報編集
 * (EditEventInfoModal)が共有する。選択肢の整形は officialEventOption、
 * 種別アイコンは officialEventHelpers に寄せてあるので、どれも二重管理にならない。
 */

// 失敗レスポンスのボディをそのまま返すと、選択肢を組み立てる map がレンダー中に例外になり
// ページ全体が落ちる。取得できなかったことは SWR の error として扱い、
// 「エラーが発生しました」を選択肢の代わりに出す。
async function fetcher(url: string): Promise<RecordCreateOfficialEventType[]> {
  const res = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });

  if (!res.ok) {
    throw new Error("Failed to fetch");
  }

  const ret: OfficialEventResponseType = await res.json();

  return ret.official_events;
}

/*
 * 候補の1件。iOS で1回目のタップが落ちるため、click ではなく touchend で確定させる。
 *
 * iOS Safari は「候補をタップ → 検索欄の blur → キーボードが閉じてビューポートが伸びる
 * → click」の順でイベントを出す。click が来る頃にはメニュー(menuPosition="fixed")が
 * 動いていて、指を離した位置に目的の候補が無いため選択が落ちる。候補をタップしても
 * メニューが閉じないのはこのため(2回目はキーボードが閉じた後でレイアウトが動かず効く)。
 * Android はキーボードでビューポートが動かないので元から1回で選べる。
 *
 * touchend はレイアウトが動く前に来るので、ここで確定させれば1回目から選べる。
 * 指が動いていたらリスト送りなので何もしない。
 */
const TAP_MOVE_THRESHOLD = 5; // react-select が control のドラッグ判定に使うのと同じ

function TouchFriendlyOption(props: OptionProps<unknown, boolean, GroupBase<unknown>>) {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  return (
    <reactSelectComponents.Option
      {...props}
      innerProps={{
        ...props.innerProps,
        onTouchStart: (event) => {
          const touch = event.touches[0];
          touchStartRef.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
        },
        onTouchEnd: (event) => {
          const start = touchStartRef.current;
          touchStartRef.current = null;

          if (!start || props.isDisabled) return;

          const touch = event.changedTouches[0];
          if (!touch) return;

          if (
            Math.abs(touch.clientX - start.x) > TAP_MOVE_THRESHOLD ||
            Math.abs(touch.clientY - start.y) > TAP_MOVE_THRESHOLD
          ) {
            return;
          }

          // touchend で確定したので、後から来る click で二重に選ばない
          event.preventDefault();
          props.selectOption(props.data);
        },
      }}
    />
  );
}

// 毎レンダー新しいオブジェクトを渡すと react-select が中の部品を作り直すため固定する
const selectComponents = { Option: TouchFriendlyOption };

type Props = {
  // 公式イベントを絞り込む開催日(YYYY-MM-DD)
  date: string;
  selectedId: number | null;
  onChange: (option: OfficialEventOption | null) => void;
  // 検索メニューを閉じたときの通知。モーダル内で使う場合に、フォーカスを
  // 受け皿へ移してソフトウェアキーボードを閉じるために使う。
  onMenuClose?: () => void;
  // react-select の instanceId。同じページに2つ置く場合と、SSR済みのHTMLと
  // id を合わせたい場合に指定する。
  instanceId?: string;
  /*
   * false の間は取得しない。公式イベントのタブを見ているときだけ取りに行くために使う。
   *
   * この一覧は土日で1,400件を超える(gzip でも90KB台)。本番のログ7日ぶんでは、
   * 作られた記録194件のうち65件(34%)が自由形式で、その分がまるごと無駄になっていた。
   * 一度取れば SWR のキャッシュに残るので、タブを行き来しても取り直さない。
   */
  enabled?: boolean;
  // サーバ側で先読みした候補と、それが対象とする開催日。開催日が一致するときだけ使う
  // (fallbackData はキーに紐づかないので、日付を変えた直後に前の日の候補を出してしまう)。
  initialEvents?: RecordCreateOfficialEventType[];
  initialEventsDate?: string;
  // URL 指定などで最初から選んでおくイベント。候補が届いた時点で一度だけ選ぶ。
  presetId?: number;
};

export default function OfficialEventSelect({
  date,
  selectedId,
  onChange,
  onMenuClose,
  instanceId = "official-event-select",
  enabled = true,
  initialEvents,
  initialEventsDate,
  presetId,
}: Props) {
  const reactSelectTheme = useReactSelectTheme();

  const url = officialEventListUrl(date);

  /*
   * 再検証を切るのは、初期データがあるのにマウント直後へ同じ内容の取得
   * (土日は1,400件超)を重ねないため。公式イベントの一覧は上流でも5分
   * キャッシュしている程度の更新頻度で(officialEventListServer.ts の
   * REVALIDATE_SECONDS)、記録を作っている間に変わることはまず無い。
   */
  const { data, isLoading, error } = useSWR<RecordCreateOfficialEventType[], Error>(
    enabled ? url : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      fallbackData:
        initialEventsDate && initialEventsDate === date ? initialEvents : undefined,
    },
  );

  // イベント一覧の整形(正規表現・日付ローカライズ)はコストが高いため、
  // データが更新されたときだけ再計算する。これを怠ると、些細な state 変更による
  // 再レンダーごとに全件分の整形が走り重くなる。
  const options = useMemo<OfficialEventOption[]>(
    () => (data ?? []).map(toOfficialEventOption),
    [data],
  );

  const selected = options.find((o) => o.id === selectedId) ?? null;

  /*
   * URL 指定のイベント(presetId)は、その候補が届いた時点で一度だけ選ぶ。
   * 開催日を変えたら選び直しになるので、渡された開催日が変わった時点で諦める。
   *
   * ここは再マウントで巻き戻る(HeroUI のタブは選ばれていないパネルを破棄する)。
   * 既に選ばれているときに選び直しを上書きしないよう、選択済みなら諦める。
   * 呼び出し側も、一度選ばれたら presetId に 0 を渡すこと(RecordCreate 参照)。
   */
  const presetRef = useRef<{ id: number; date: string }>({ id: presetId ?? 0, date });

  useEffect(() => {
    const preset = presetRef.current;

    if (!preset.id) return;

    if (preset.date !== date || selectedId != null) {
      preset.id = 0;
      return;
    }

    const option = options.find((o) => o.id === preset.id);

    if (!option) return;

    preset.id = 0;
    onChange(option);
  }, [date, options, onChange, selectedId]);

  let optionsMessage = "対象のイベントがありません";
  if (error) optionsMessage = "エラーが発生しました";
  else if (isLoading) optionsMessage = "検索中...";
  else if (data?.length === 0) optionsMessage = "イベントがありません";

  return (
    <div className="flex flex-col gap-1">
      <WindowedSelect
        instanceId={instanceId}
        theme={reactSelectTheme}
        components={selectComponents}
        placeholder={
          <div className="flex items-center gap-2">
            <div className="text-xl">
              <CgSearch />
            </div>
            <span className="text-sm">例）町田市</span>
          </div>
        }
        isClearable={true}
        isSearchable={true}
        noOptionsMessage={() => optionsMessage}
        options={options}
        value={selected}
        onChange={(option) => onChange((option as OfficialEventOption) ?? null)}
        maxMenuHeight={485}
        windowThreshold={100}
        menuPosition="fixed"
        onMenuClose={onMenuClose}
        menuPortalTarget={typeof document !== "undefined" ? document.body : null}
        styles={{
          control: reactSelectControlStyle,
          menuPortal: (base) => ({ ...base, zIndex: 9999 }),
          // メニューがコントロール幅を超えて横に広がりページ全体のレイアウトを
          // 崩さないよう、明示的に横方向のはみ出しをクリップする
          menu: (base) => ({ ...base, maxWidth: "100%", overflow: "hidden" }),
        }}
        formatOptionLabel={(option, { context }) => {
          const opt = option as OfficialEventOption;

          if (context === "menu") {
            return (
              <div className="text-sm border p-2 w-full">
                <div className="flex items-center gap-3 w-full min-w-0">
                  <div className="flex items-center justify-center shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={opt.image_alt}
                      src={opt.image_src}
                      className="h-18 w-18 object-contain"
                    />
                  </div>
                  <div className="grid gap-0.5 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="shrink-0">
                        <LuBookmark color="gray" />
                      </span>
                      <ScrollingText text={opt.title} className="flex-1 min-w-0 text-sm" />
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <span>
                        <LuCalendar color="gray" />
                      </span>
                      <span className="truncate">{opt.event_datetime}</span>
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="shrink-0">
                        <LuHouse color="gray" />
                      </span>
                      <ScrollingText text={opt.shop_name} className="flex-1 min-w-0 text-sm" />
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="shrink-0">
                        <LuMapPin color="gray" />
                      </span>
                      <ScrollingText text={opt.address} className="flex-1 min-w-0 text-sm" />
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <ScrollingText text={`${opt.title} - ${opt.shop_name}`} className="text-sm" />
          );
        }}
      />

      <div className="pt-1">
        <Card radius="none" shadow="sm">
          {/* overflow-visible は iOS のスクロール不能対策(モーダル内で使う場合に効く)。
              HeroUI の CardBody 既定 overflow-y-auto は、溢れていなくても
              react-aria にスワイプを殺されるため打ち消しておく。 */}
          <CardBody className="overflow-visible">
            <div className="pl-1 pr-1 flex items-center gap-5 w-full min-w-0">
              <div className="flex items-center justify-center gap-5 min-w-0">
                <div className="z-0 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt={selected ? selected.image_alt : "ポケモンカードゲーム"}
                    src={
                      selected
                        ? selected.image_src
                        : "https://xx8nnpgt.user.webaccel.jp/images/icons/pokemon_card_game.png"
                    }
                    className="h-18 w-18 object-contain"
                  />
                </div>
                <div className="flex flex-col gap-2 min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="shrink-0">
                      <LuBookmark color="gray" />
                    </span>
                    <ScrollingText
                      text={selected ? selected.title : "イベント名"}
                      className="flex-1 min-w-0 text-xs text-default-600"
                    />
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="shrink-0">
                      <LuCalendar color="gray" />
                    </span>
                    <span className="text-xs text-default-600 truncate">
                      {selected ? selected.event_datetime : "イベント日時"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="shrink-0">
                      <LuHouse color="gray" />
                    </span>
                    <ScrollingText
                      text={selected ? selected.shop_name : "イベント主催者"}
                      className="flex-1 min-w-0 text-xs text-default-600"
                    />
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="shrink-0">
                      <LuMapPin color="gray" />
                    </span>
                    <ScrollingText
                      text={selected ? selected.address : "イベント会場"}
                      className="flex-1 min-w-0 text-xs text-default-600"
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
