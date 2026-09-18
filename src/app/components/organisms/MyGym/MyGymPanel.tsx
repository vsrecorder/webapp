"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { Button, Card, CardBody, Chip, Image, useDisclosure } from "@heroui/react";
import { LuChevronDown, LuHouse, LuPencil, LuPlus } from "react-icons/lu";

import FetchError from "@app/components/molecules/FetchError";
import MyGymEditModal from "@app/components/organisms/MyGym/MyGymEditModal";
import MyGymEventDetailModal from "@app/components/organisms/MyGym/MyGymEventDetailModal";
import MyGymShopRow from "@app/components/organisms/MyGym/MyGymShopRow";
import {
  getEventTimeRange,
  groupEventsByDate,
  isEventGroupExpanded,
  MY_GYM_EVENT_RANGE_DAYS,
} from "@app/components/organisms/MyGym/myGymHelpers";
import { MyGymEventRange, getMyGymEventRange } from "@app/utils/myGymEventRange";
import {
  cleanOfficialEventTitle,
  getEventAccentColor,
  getEventIconUrl,
  getEventVenueLabel,
} from "@app/components/organisms/Record/officialEventHelpers";

import MyGymPanelSkeleton from "@app/components/organisms/MyGym/Skeleton/MyGymPanelSkeleton";
import { useClientValue } from "@app/hooks/useClientValue";
import { readClientCookie, writeClientCookie } from "@app/utils/clientCookie";
import {
  currentMyGymSkeleton,
  DEFAULT_MY_GYM_SKELETON,
  formatMyGymSkeleton,
  MY_GYM_SKELETON_COOKIE,
  MY_GYM_SKELETON_COOKIE_MAX_AGE,
  myGymSkeletonHeightRem,
  parseMyGymSkeleton,
} from "@app/utils/myGymSkeleton";

import { OfficialEventType } from "@app/types/official_event";
import { UserGymOfficialEventGetResponseType } from "@app/types/user_gym";

async function fetcher(url: string): Promise<UserGymOfficialEventGetResponseType> {
  const res = await fetch(url, {
    cache: "no-store",
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) throw new Error("Failed to fetch");

  return res.json();
}

/*
 * 畳んだ日付行の右側に並べる会場チップ。その日の会場を、行に入るだけ出す。
 *
 * 入りきらないぶんは flex-wrap で2行目へ送り、1行ぶんの高さ(h-5)で切って隠す。
 * 何個入るかは店舗名の長さで変わる(実データで10〜14文字)ので、出す数を決め打ちに
 * すると短い店舗名の日で右が空いたままになる。隠れた数は描いてから数えて「+N」で出す。
 *
 * 「+N」は列の外に絶対配置し、その場所(pr-6)を常に空けておく。列の中に入れると
 * 数が変わるたびに列の幅が動き、入る個数と「+N」が互いを書き換えて落ち着かない。
 */
function VenueChips({ venues }: { venues: string[] }) {
  const listRef = useRef<HTMLDivElement>(null);
  const [hiddenCount, setHiddenCount] = useState(0);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    // 2行目へ送られた(= 隠れた)チップを数える。ResizeObserver は observe した時点でも
    // 一度呼ばれるので、初回の計測もここで済む
    const count = () => {
      const chips = [...list.children] as HTMLElement[];
      if (chips.length === 0) return;

      const firstTop = chips[0].offsetTop;

      setHiddenCount(chips.filter((chip) => chip.offsetTop > firstTop).length);
    };

    const observer = new ResizeObserver(count);
    observer.observe(list);

    return () => observer.disconnect();
  }, [venues]);

  if (venues.length === 0) return null;

  return (
    <div className="relative flex min-w-0 flex-1 justify-end pr-6">
      <div
        ref={listRef}
        className="flex h-5 flex-wrap items-center justify-end gap-1 overflow-hidden"
      >
        {venues.map((venue) => (
          <Chip
            key={venue}
            size="sm"
            variant="flat"
            color="default"
            /*
              入らないものは縮めずに列ごと隠し、「+N」に集約する(切れた名前が並ぶと
              どの店か読み取れない)。ただし1つ目が列より長いときだけは逃げ場が無いので、
              max-w-full で列に収めて末尾を省略する。これが無いと右寄せのぶん
              左端から切れて、店名の頭が読めなくなる(320px 幅で発生)。
              min-w-0 は Chip の base が持つ min-w-min の打ち消し。
            */
            className="h-5 min-w-0 max-w-full shrink-0"
            classNames={{ content: "truncate text-[0.625rem] font-bold" }}
          >
            {venue}
          </Chip>
        ))}
      </div>

      {hiddenCount > 0 && (
        <span className="absolute right-0 top-1/2 -translate-y-1/2 text-[0.625rem] font-bold text-default-400">
          +{hiddenCount}
        </span>
      )}
    </div>
  );
}

// イベント1件の行。
//
// 見た目は記録カード(RecordCardBase)に揃えてある。左端の種別アクセントバーと、
// 会場名を flat なチップで出す形はアプリ共通の語彙で、同じ「公式イベント」を
// 別の場所で違う見え方にしないためにここでも踏襲する。
// アイコン・アクセント色・会場名の判定も記録カードと同じヘルパーに委ねる。
//
// 行全体が詳細モーダルを開くボタン。行に収まるのはタイトル・時刻・会場だけなので、
// 住所や定員、記録作成への導線はモーダル側で見せる。
function MyGymEventRow({
  event,
  onSelect,
}: {
  event: OfficialEventType;
  onSelect: (event: OfficialEventType) => void;
}) {
  const time = getEventTimeRange(event);
  const venue = getEventVenueLabel(event);

  return (
    <button
      type="button"
      onClick={() => onSelect(event)}
      className="flex w-full overflow-hidden rounded-xl bg-default-50 text-left transition-colors active:bg-default-100"
    >
      <div className={`w-1 shrink-0 ${getEventAccentColor(event)}`} />

      <div className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-1.5">
        <Image
          src={getEventIconUrl(event)}
          alt=""
          width={28}
          height={28}
          radius="sm"
          className="shrink-0"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-xs font-bold text-default-700">
            {cleanOfficialEventTitle(event.title)}
          </span>

          {/* 時刻と会場。時刻は tabular-nums で桁を揃え、行ごとに数字が踊らないようにする */}
          <div className="flex min-w-0 items-center gap-1.5">
            {time && (
              <span className="shrink-0 text-[0.6875rem] font-bold tabular-nums text-default-500">
                {time.start} ~{" "}
                {time.end ?? (
                  // 終了時刻が無いイベントも「HH:MM ~ HH:MM」ぶんの幅を取る。
                  // 見えない時刻を同じ書体で置いて幅だけを借りることで、隣の会場チップが
                  // 行ごとに左右へずれない(固定幅を決め打ちすると書体依存でずれる)。
                  <span aria-hidden className="invisible">
                    00:00
                  </span>
                )}
              </span>
            )}
            {venue && (
              <Chip
                size="sm"
                variant="flat"
                color="default"
                // base の min-w-min を打ち消して、狭い行でもチップ側が縮めるようにする
                // (打ち消さないと店舗名の全幅が確保され、タイトルの方が潰れる)
                className="h-5 min-w-0"
                classNames={{ content: "truncate text-[0.625rem] font-bold" }}
              >
                {venue}
              </Chip>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

type Props = {
  // サーバ描画(dashboardServer)で取った値。あればこれを出し、取りに行かない
  initialEvents?: UserGymOfficialEventGetResponseType;
  // その期間。初期値があるときはこの期間で描く(自分で決め直すと日付境界でずれて初期値が無駄になる)
  initialRange?: MyGymEventRange;
};

export default function MyGymPanel({ initialEvents, initialRange }: Props) {
  // 期間は描画のたびに作り直すとキーが変わって再取得が走るため、初回に1度だけ決める。
  // 日付が変わっても再マウントまで前日の範囲を使うが、開始日は「今日」なので
  // 表示されるのは常に未来のイベントで、実害は末尾が1日短くなることだけ。
  const [{ startDate, endDate }] = useState(() => initialRange ?? getMyGymEventRange());
  // 登録店舗の一覧は既定で畳んでおく。日々見たいのは予定の方で、
  // 「どこを登録しているか」は畳んだ見出しの件数で足りることが多い。
  const [gymsExpanded, setGymsExpanded] = useState(false);
  // 予定の日付ごとの開閉。利用者が触った日付だけを覚える(既定は isEventGroupExpanded)
  const [eventGroupOverrides, setEventGroupOverrides] = useState<Record<string, boolean>>(
    {},
  );
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  // タップされたイベント。閉じるアニメーションの間も中身を描き続けたいので、
  // 閉じるときには null に戻さず、次に開くまで最後のイベントを持ち続ける。
  const [selectedEvent, setSelectedEvent] = useState<OfficialEventType | null>(null);
  const {
    isOpen: isEventOpen,
    onOpen: onEventOpen,
    onOpenChange: onEventOpenChange,
  } = useDisclosure();

  const handleSelectEvent = (event: OfficialEventType) => {
    setSelectedEvent(event);
    onEventOpen();
  };

  const { data, isLoading, mutate } = useSWR<UserGymOfficialEventGetResponseType>(
    `/api/users/my_gyms/official_events?start_date=${startDate}&end_date=${endDate}`,
    fetcher,
    {
      // サーバで取れていればそれを出し、マウント時には取り直さない(他のパネルと同じ扱い)。
      // 店舗の登録・解除(MyGymEditModal)は mutate() で取り直すので、その経路は変わらない
      fallbackData: initialEvents,
      revalidateOnMount: initialEvents == null,
    },
  );

  const events = useMemo(() => data?.official_events ?? [], [data]);
  const groups = useMemo(() => groupEventsByDate(events), [events]);

  /*
   * 読み込み中・取得失敗のときに取る場所。このパネルは中身で高さが3倍以上変わるので、
   * 前回このユーザーのホームが描いた形(cookie)に合わせる(utils/myGymSkeleton)。
   * cookie の値は文字列のまま受け取ってから組み立てる。useClientValue に毎回
   * 新しいオブジェクトを返す関数を渡すと描画が止まらなくなる。
   */
  const storedShapeValue = useClientValue(
    () => readClientCookie(MY_GYM_SKELETON_COOKIE),
    null,
  );
  const storedShape = useMemo(
    () => parseMyGymSkeleton(storedShapeValue ?? undefined) ?? DEFAULT_MY_GYM_SKELETON,
    [storedShapeValue],
  );

  // 実際に描けた形を次回の骨格のために残す。依存は文字列にして、
  // 同じ形のまま描き直しても書き込みが走らないようにする
  const shapeValue = data
    ? formatMyGymSkeleton(currentMyGymSkeleton(data.user_gyms ?? [], groups.length))
    : null;

  useEffect(() => {
    if (shapeValue == null) return;

    writeClientCookie(
      MY_GYM_SKELETON_COOKIE,
      shapeValue,
      MY_GYM_SKELETON_COOKIE_MAX_AGE,
    );
  }, [shapeValue]);

  // 出し分けは「表示できるデータがあるか」で決める。error だけを見て差し替えると、
  // 一度描けたパネルが再検証(タブ復帰・再接続・失敗時の自動リトライ)の失敗で
  // 小さなエラーカードに置き換わり、リトライが通るたびに高さが行き来してしまう。
  // 初回取得の失敗も、自動リトライ中は isLoading が真に戻る(SWR は
  // キャッシュが無い間だけ isLoading を立てる)ため、骨格とエラーカードの寸法が
  // 揃っていないと数秒おきにパネルの高さが変わる。両者を同じ高さで置く。
  if (!data) {
    if (isLoading) return <MyGymPanelSkeleton shape={storedShape} />;

    // エラーカードも骨格と同じ場所を取る(失敗しても・失敗から骨格へ戻っても寸法が変わらない)。
    // FetchError はクラスしか受けないので、高さは外側の器で与える
    return (
      <div style={{ height: `${myGymSkeletonHeightRem(storedShape)}rem` }}>
        <FetchError
          message="Myジムの取得に失敗しました"
          onRetry={() => mutate()}
          compact
          className="h-full"
        />
      </div>
    );
  }

  const userGyms = data.user_gyms ?? [];

  const editModal = (
    <MyGymEditModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      userGyms={userGyms}
      limit={data.limit}
      onChanged={() => mutate()}
    />
  );

  // 未登録のときはパネル全体を登録への導線にする
  if (userGyms.length === 0) {
    return (
      <>
        <Card className="w-full shadow-md">
          <CardBody className="flex flex-col items-center gap-3 px-4 py-6 text-center">
            <LuHouse className="h-6 w-6 text-default-400" />
            <div className="flex flex-col gap-1">
              <span className="text-sm font-bold text-default-700">
                よく行く店舗を登録しませんか？
              </span>
              <span className="text-xs text-default-500">
                Myジムを登録すると、その店舗の
                <br />
                イベント予定をここにまとめて表示します
              </span>
            </div>
            <Button
              size="sm"
              color="primary"
              variant="flat"
              radius="full"
              className="font-bold"
              startContent={<LuPlus className="h-4 w-4" />}
              onPress={onOpen}
            >
              Myジムを登録する
            </Button>
          </CardBody>
        </Card>
        {editModal}
      </>
    );
  }

  return (
    <>
      <Card className="w-full shadow-md">
        <CardBody className="flex flex-col gap-2.5 p-3">
          {/* 登録中の店舗と編集への導線。
              店舗の見せ方(家アイコン + 店舗名 + 都道府県・住所)は設定モーダルの
              「登録中のMyジム」と揃えてある。同じ店舗を2つの画面で別の形に見せると、
              どちらが同じものを指しているのか読み替えが要るため。 */}
          {/* 登録店舗。既定は畳んでおき、畳んでいる間は件数だけを見出しに出す。
              (店舗の見せ方そのものは設定モーダルと同じ MyGymShopRow に集約してある) */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-1">
              <button
                type="button"
                onClick={() => setGymsExpanded((v) => !v)}
                aria-expanded={gymsExpanded}
                // タップ対象は見出しの文字とシェブロンの範囲だけにする。行いっぱいに
                // 広げると、右側の何も無いところを触っただけで開閉してしまう。
                // 縦は押しやすさのぶん広げ、負のマージンで行の高さは変えない。
                className="-my-1 flex shrink-0 items-center gap-1.5 py-1 text-left"
              >
                <LuChevronDown
                  className={`h-3.5 w-3.5 shrink-0 text-default-400 transition-transform ${
                    gymsExpanded ? "rotate-180" : ""
                  }`}
                />
                <span className="shrink-0 text-[0.5625rem] font-bold uppercase tracking-widest text-default-400">
                  登録中のMyジム
                </span>
                {!gymsExpanded && (
                  <span className="shrink-0 text-[0.6875rem] font-bold text-default-500">
                    {userGyms.length}店舗
                  </span>
                )}
              </button>
              <Button
                isIconOnly
                size="sm"
                variant="light"
                aria-label="Myジムを編集する"
                onPress={onOpen}
                className="-my-1 shrink-0"
              >
                <LuPencil className="h-4 w-4" />
              </Button>
            </div>

            {gymsExpanded && (
              <div className="flex flex-col gap-1.5">
                {userGyms.map((userGym) => (
                  <MyGymShopRow key={userGym.shop.id} shop={userGym.shop} />
                ))}
              </div>
            )}
          </div>

          {events.length === 0 ? (
            <span className="py-4 text-center text-xs text-default-500">
              今後{MY_GYM_EVENT_RANGE_DAYS}日間に予定されているイベントはありません
            </span>
          ) : (
            /* 予定は日付ごとに畳み、既定では日付と件数だけを並べる。
               1週間ぶんで20件を超えることがあるが、ここを内部スクロールにすると、
               ホームを下へ送る指がこの帯に乗ったときにスワイプがパネル側へ吸われ、
               ホームが動かなくなる(ホーム上から4番目の節なので、下まで読むなら
               ほぼ必ずこの帯を通る)。縦のスクロールはページの1軸だけに戻し、
               見せる量は利用者の開閉に委ねる。 */
            <div className="flex flex-col gap-3">
              {groups.map((group, index) => {
                const expanded = isEventGroupExpanded(
                  eventGroupOverrides,
                  group.dateKey,
                  index,
                );

                return (
                  <div key={group.dateKey} className="flex flex-col gap-1.5">
                    {/* 日付見出しがそのまま開閉のボタン。行に他の要素が無いので幅いっぱいで
                        受ける。縦は padding を行の高さに含める(負のマージンで打ち消すと
                        判定が隣の行と接して押し間違えやすい)。
                        件数は開閉にかかわらず出す。畳んだ行にだけ数字があると、
                        日付の列で数字の有無がまだらになって週の予定量を追いにくい。 */}
                    <button
                      type="button"
                      onClick={() =>
                        setEventGroupOverrides((prev) => ({
                          ...prev,
                          [group.dateKey]: !expanded,
                        }))
                      }
                      aria-expanded={expanded}
                      // min-h-8 は会場チップ(h-5 = 20px)に py-1.5 が乗った高さ。
                      // 開くとチップを引っ込めるので、これが無いと開閉のたびに行が縮む
                      className="flex min-h-8 w-full items-center gap-1.5 py-1.5 text-left"
                    >
                      <LuChevronDown
                        className={`h-3.5 w-3.5 shrink-0 text-default-400 transition-transform ${
                          expanded ? "rotate-180" : ""
                        }`}
                      />
                      <span className="shrink-0 text-[0.6875rem] font-bold text-default-500">
                        {group.label}
                      </span>
                      <span className="shrink-0 text-[0.6875rem] font-bold text-default-400">
                        {group.events.length}件
                      </span>

                      {/* 開いている日は下にイベント行が並んで会場も読めるので、
                          畳んでいるあいだだけ出す */}
                      {!expanded && <VenueChips venues={group.venues} />}
                    </button>

                    {expanded &&
                      group.events.map((event) => (
                        <MyGymEventRow
                          key={event.id}
                          event={event}
                          onSelect={handleSelectEvent}
                        />
                      ))}
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>
      {editModal}
      <MyGymEventDetailModal
        isOpen={isEventOpen}
        onOpenChange={onEventOpenChange}
        event={selectedEvent}
      />
    </>
  );
}
