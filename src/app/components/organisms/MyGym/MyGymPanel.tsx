"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Button, Card, CardBody, Chip, Image, useDisclosure } from "@heroui/react";
import { LuChevronDown, LuHouse, LuPencil, LuPlus } from "react-icons/lu";

import FetchError from "@app/components/molecules/FetchError";
import MyGymEditModal from "@app/components/organisms/MyGym/MyGymEditModal";
import MyGymEventDetailModal from "@app/components/organisms/MyGym/MyGymEventDetailModal";
import MyGymShopRow from "@app/components/organisms/MyGym/MyGymShopRow";
import {
  getEventTimeRange,
  getMyGymEventRange,
  groupEventsByDate,
  MY_GYM_EVENT_RANGE_DAYS,
} from "@app/components/organisms/MyGym/myGymHelpers";
import {
  cleanOfficialEventTitle,
  getEventAccentColor,
  getEventIconUrl,
  getEventVenueLabel,
} from "@app/components/organisms/Record/officialEventHelpers";

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

// 読み込み中(骨格)と取得失敗(エラーカード)でパネルが占める高さ。
// 両方に同じ値を持たせて、失敗しても・失敗から骨格へ戻っても寸法が変わらないようにする。
// 値は骨格の中身(h-7 + h-4 + h-12 + h-12 と gap-2.5 3つ = 170px)に
// CardBody の p-3(上下12px)を足したもの。
const PLACEHOLDER_HEIGHT = "h-48.5";

function MyGymPanelSkeleton() {
  return (
    <Card className={`w-full shadow-md ${PLACEHOLDER_HEIGHT}`}>
      <CardBody className="flex flex-col gap-2.5 p-3">
        <div className="h-7 w-full animate-pulse rounded-lg bg-default-100" />
        <div className="h-4 w-24 animate-pulse rounded-full bg-default-100" />
        <div className="h-12 w-full animate-pulse rounded-xl bg-default-100" />
        <div className="h-12 w-full animate-pulse rounded-xl bg-default-100" />
      </CardBody>
    </Card>
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

export default function MyGymPanel() {
  // 期間は描画のたびに作り直すとキーが変わって再取得が走るため、初回に1度だけ決める。
  // 日付が変わっても再マウントまで前日の範囲を使うが、開始日は「今日」なので
  // 表示されるのは常に未来のイベントで、実害は末尾が1日短くなることだけ。
  const [{ startDate, endDate }] = useState(getMyGymEventRange);
  // 登録店舗の一覧は既定で畳んでおく。日々見たいのは予定の方で、
  // 「どこを登録しているか」は畳んだ見出しの件数で足りることが多い。
  const [gymsExpanded, setGymsExpanded] = useState(false);
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
  );

  const events = useMemo(() => data?.official_events ?? [], [data]);
  const groups = useMemo(() => groupEventsByDate(events), [events]);

  // 出し分けは「表示できるデータがあるか」で決める。error だけを見て差し替えると、
  // 一度描けたパネルが再検証(タブ復帰・再接続・失敗時の自動リトライ)の失敗で
  // 小さなエラーカードに置き換わり、リトライが通るたびに高さが行き来してしまう。
  // 初回取得の失敗も、自動リトライ中は isLoading が真に戻る(SWR は
  // キャッシュが無い間だけ isLoading を立てる)ため、骨格とエラーカードの寸法が
  // 揃っていないと数秒おきにパネルの高さが変わる。両者を同じ高さで置く。
  if (!data) {
    if (isLoading) return <MyGymPanelSkeleton />;

    return (
      <FetchError
        message="Myジムの取得に失敗しました"
        onRetry={() => mutate()}
        compact
        className={PLACEHOLDER_HEIGHT}
      />
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
            <>
              {/* 予定は全件描く。2週間ぶんは20件を超えることがあるため、
                  パネルごと縦に伸ばさずこの中だけをスクロールさせる。
                  中にフォーカスできる要素が無いため、tabIndex を与えないと
                  キーボードだけの操作でここをスクロールできない。 */}
              <div
                tabIndex={0}
                role="group"
                aria-label="Myジムの予定"
                // overscroll-contain は、一覧を端まで送ってもページ側へスクロールを
                // 伝播させないため(指を離さず続けるとホームごと動いてしまう)
                className="flex max-h-62 flex-col gap-3 overflow-y-auto overscroll-contain"
              >
                {groups.map((group) => (
                  <div key={group.dateKey} className="flex flex-col gap-1.5">
                    <span className="text-[0.6875rem] font-bold text-default-500">
                      {group.label}
                    </span>
                    {group.events.map((event) => (
                      <MyGymEventRow
                        key={event.id}
                        event={event}
                        onSelect={handleSelectEvent}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </>
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
