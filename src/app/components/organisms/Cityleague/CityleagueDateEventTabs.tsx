"use client";

import {
  memo,
  startTransition,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";

import { Tabs, Tab } from "@heroui/react";

import CityleagueEventLinkList from "@app/components/organisms/Cityleague/CityleagueEventLinkList";
import CityleagueResult from "@app/components/organisms/Cityleague/CityleagueResult";

import { useReturnTargetItem } from "@app/hooks/useReturnTargetItem";
import { CityleagueResultType } from "@app/types/cityleague_result";
import { DeckArchetypeMap } from "@app/types/deck_archetype";
import { OfficialEventType } from "@app/types/official_event";
import { countEventsByLeagueTitle } from "@app/utils/cityleagueLeagueCount";
import {
  CITYLEAGUE_DATE_RETURN_KEY,
  cityleagueDateResultAnchorId,
  clearCityleagueDateReturn,
  markCityleagueDateReturn,
  parseCityleagueDateReturn,
} from "@app/utils/cityleagueScrollRestore";
import { hasReturnedHereSince } from "@app/utils/returnNavigation";
import { scrollBackToAnchor } from "@app/utils/returnTarget";

type Props = {
  // 開催日 "YYYY-MM-DD"。戻り位置の控えがこの日のものかを見分ける
  dateParam: string;
  events: OfficialEventType[];
  /*
   * その日の結果(cityleagueDateResultsServer)。渡されたら、一覧と同じ結果カード(入賞デッキ入り)を並べる。
   * 取れなかった(null)・1件も無いときは、店舗名のリンクの一覧に戻す(個別ページへは辿れる)。
   */
  results?: CityleagueResultType[] | null;
  deckArchetypes?: DeckArchetypeMap;
};

type Item = {
  result: CityleagueResultType;
  event: OfficialEventType;
};

/*
 * 初めて開いたタブで、1回に描き足すカードの枚数。
 *
 * 結果カードは1枚ごとに Swiper と画像を持ち、まとめて描くと重い。本番ビルド・CPU 4倍の実測
 * (2026-10-29、10/18 のオープン 35件)では、タブを押してから描き終わるまで 0.9 秒、
 * 0.4 秒を超える長いタスクが出ていた(押しても反応しないように見える)。数枚ずつ描き足して、
 * 1回の処理を短くする。
 */
const CARD_BATCH = 4;

/*
 * 最初から Swiper を作るカードの枚数(残りは画面に近づいてから。CityleagueResult の deferSwiper)。
 * 開いた時点で画面に入る先頭のカードまで遅らせると、表示した直後に作り直すことになるため。
 */
const EAGER_SWIPER_COUNT = 3;

/*
 * 離れるときに控えるカードを選ぶ境目(画面上端からの距離)。上部の固定ヘッダーに隠れている
 * カードは見ていたカードではないので、下端がこれより下にある最初のカードを選ぶ。
 */
const ANCHOR_MIN_BOTTOM = 80;

// 戻ったときに控えたカードの高さが分からなければ、ヘッダーのすぐ下に置く
const RETURN_FALLBACK_TOP = 80;

// 個別ページへ進むときの一覧の控えは書かせない(このページは自分が外れるときに控える)
function skipListReturn() {}

type TopCard = {
  anchorEventId: number;
  // 画面上の高さ
  top: number;
};

// 画面の上端にあるカード(見えているタブの中で、下端が固定ヘッダーより下にある最初の1枚)
function findTopVisibleCard(): TopCard | null {
  const cards = document.querySelectorAll<HTMLElement>('[id^="cityleague-date-result-"]');

  for (const card of cards) {
    const rect = card.getBoundingClientRect();
    if (rect.width === 0) continue;
    if (rect.bottom > ANCHOR_MIN_BOTTOM) {
      return {
        anchorEventId: Number(card.id.slice("cityleague-date-result-".length)),
        top: rect.top,
      };
    }
  }

  return null;
}

type PanelProps = {
  items: Item[];
  deckArchetypes?: DeckArchetypeMap;
  // 数枚ずつ描き足すか。false なら最初から全部描く(初期表示・戻ってきたときのタブ)
  progressive: boolean;
};

/*
 * 1つのリーグのカードの列。
 *
 * 一度開いたタブの列は、別のタブへ移っても捨てずに隠しておく(外側の hidden)。戻ったときに
 * カードを作り直さずに済む。memo にしてあるので、タブを移るだけではこの列は描き直されない。
 */
const DateResultPanel = memo(function DateResultPanel({
  items,
  deckArchetypes,
  progressive,
}: PanelProps) {
  /*
   * 描いているカードの枚数。初期値だけを progressive で決める。
   * 初期表示のタブはサーバ描画と同じく全部描く(HTML に全部載せる。クローラが個別ページへ辿れる)。
   * 戻ってきたときのタブも全部描く(開いたカードがまだ描かれていないと、その位置へ戻せない)。
   */
  const [limit, setLimit] = useState(() =>
    progressive ? Math.min(CARD_BATCH, items.length) : items.length,
  );

  useEffect(() => {
    if (limit >= items.length) return;

    // 描いた分を画面に出してから次を足す。足す描画は割り込み可能にして、タブの操作やスクロールを待たせない
    const timer = setTimeout(() => {
      startTransition(() => setLimit((count) => Math.min(count + CARD_BATCH, items.length)));
    }, 0);

    return () => clearTimeout(timer);
  }, [limit, items.length]);

  return (
    <div className="flex flex-col w-full gap-3">
      {items.slice(0, limit).map(({ result, event }, index) => (
        <div key={result.official_event_id} id={cityleagueDateResultAnchorId(event.id)}>
          <CityleagueResult
            event_result={result}
            official_event={event}
            deck_archetypes={deckArchetypes}
            onOpenDetail={skipListReturn}
            deferSwiper={index >= EAGER_SWIPER_COUNT}
          />
        </div>
      ))}
    </div>
  );
});

// 開催日ページの結果を、リーグ区分で絞り込めるようにするタブ。
// その日に実際に登録されているリーグ区分だけを並べる(開催の無い区分のタブは出さない)。
export default function CityleagueDateEventTabs({
  dateParam,
  events,
  results,
  deckArchetypes,
}: Props) {
  const pathname = usePathname();

  const eventsById = useMemo(() => new Map(events.map((event) => [event.id, event])), [events]);

  // カードを並べるのは、結果があって店舗名などが引ける大会だけ
  const items = useMemo(
    () =>
      (results ?? []).flatMap((result) => {
        const event = eventsById.get(result.official_event_id);
        return event ? [{ result, event }] : [];
      }),
    [results, eventsById],
  );
  const showCards = items.length > 0;

  // リーグごとのカードの列。列の配列を描画のたびに作り直すと、memo した列が毎回描き直される
  const itemsByLeague = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const item of items) {
      const list = map.get(item.event.league_title) ?? [];
      list.push(item);
      map.set(item.event.league_title, list);
    }
    return map;
  }, [items]);

  // タブの件数は、並べるものから数える(カードとリンクで数が食い違わないように)
  const leagueCounts = countEventsByLeagueTitle(showCards ? items.map((item) => item.event) : events);
  const firstKey = leagueCounts[0].leagueTitle;

  /*
   * 別のページから戻ってきたら、離れたときのタブとカードの位置まで戻す(控えは離れる直前に書く。下の effect)。
   * 受け取るのは、このページが現れた時点で既に書かれていた控えだけ(useReturnTargetItem)。
   * 使うのは、戻ってきたとき(ブラウザの戻る/進む・ページ内の戻るリンク)だけ。控えを置いたまま
   * 別の経路(下部ナビ・ヘッダーなど)で開き直したときは、ふつうに先頭から見せる(utils/returnNavigation)。
   */
  const savedReturn = useReturnTargetItem(CITYLEAGUE_DATE_RETURN_KEY);
  const returnState = useMemo(() => parseCityleagueDateReturn(savedReturn), [savedReturn]);
  const isOwnReturn = returnState?.date === dateParam;
  const pendingScrollId =
    returnState !== null &&
    isOwnReturn &&
    items.some((item) => item.result.official_event_id === returnState.anchorEventId) &&
    hasReturnedHereSince(returnState.savedAt, pathname ?? undefined)
      ? returnState.anchorEventId
      : null;
  const restoreLeague =
    pendingScrollId !== null &&
    leagueCounts.some((item) => item.leagueTitle === returnState?.league)
      ? (returnState?.league ?? null)
      : null;

  // 利用者が選んだタブ。選ぶまでは、戻り先のタブか先頭のタブ
  const [chosenKey, setChosenKey] = useState<string | null>(null);
  const selectedKey = chosenKey ?? restoreLeague ?? firstKey;

  /*
   * 一度開いたタブ(列を残しておくタブ)と、その列を数枚ずつ描き足すか。
   * 利用者がタブを押して初めて開いた列だけを描き足しにする。初期表示と戻ってきたときの列は全部描く。
   * 新しいタブを開いたら、その描画の中で足す(描画中の更新。effect で足すと1回ぶん空の列が出る)。
   */
  /*
   * 最初の列は今のタブ(初期表示は先頭のタブ。クライアント側の移動で戻ってきたときは、最初の描画から
   * 戻り先のタブ)。先頭のタブで始めると、戻り先が別のタブのとき使わない列まで全部描くことになる。
   */
  const [mountedPanels, setMountedPanels] = useState<Map<string, boolean>>(
    () => new Map([[selectedKey, false]]),
  );
  if (showCards && !mountedPanels.has(selectedKey)) {
    setMountedPanels(new Map(mountedPanels).set(selectedKey, chosenKey === selectedKey));
  }

  useEffect(() => {
    // 別の開催日の控えは消さない(開催日A → 開催月 → 開催日B と進んで2回戻ったとき、Aで使う)
    if (savedReturn === null || (returnState !== null && !isOwnReturn)) return;

    // この日の控えでも、戻ってきたのでなければ(開き直したなら)使わずに消す。読めない控えも消す。
    // 残すと、このページから別のページへ進んで戻ったとき(このときは戻ってきたことになる)に古い位置へ送られる
    if (pendingScrollId === null) {
      clearCityleagueDateReturn();
      return;
    }

    // 戻り先のタブのカードはこの描画で並んでいるので、フレームを1つ待ってから測る。ページ遷移の
    // 先頭リセット(useScrollResetOnNavigation)もこれより先に済んでいる。
    // 控えを消すと戻り先のタブ(restoreLeague)も消えるので、先に選んだタブとして持ち直す
    const frame = requestAnimationFrame(() => {
      if (restoreLeague) setChosenKey(restoreLeague);
      clearCityleagueDateReturn();
      scrollBackToAnchor(cityleagueDateResultAnchorId(pendingScrollId), RETURN_FALLBACK_TOP);
    });

    return () => cancelAnimationFrame(frame);
  }, [savedReturn, returnState, isOwnReturn, pendingScrollId, restoreLeague]);

  /*
   * このページから離れたら、戻ってきたときのために今のタブと画面上端のカードを控える。
   *
   * リンクの押下ではなく、この部品が外れるときに控える。ユーザーメニュー・通知・記録中のバーは
   * router.push で移り、下部ナビもスクロールの慣性中に押すと click を出さずに touchend で移るので、
   * リンクの押下を拾うだけでは控えられない経路があった。
   *
   * 控える位置は、外れるときに測るのではなく、スクロールのたびに覚えておいた値を使う。ブラウザの
   * 戻る/進むで離れるときは、先頭リセット(useScrollResetOnNavigation)が popstate の中でページが
   * 外れるより先に走り、外れる時点ではもう先頭にいる(実測。リスナーの順番では先回りできなかった)。
   * リセットのスクロールイベントは次のフレームまで届かないので、覚えた値は離れる前のまま残る。
   * 念のため、別のページへの popstate を受けたら、以後のスクロールでは覚え直さない。
   * タブを切り替えたときも、見えるカードが変わるので覚え直す。
   */
  const selectedKeyRef = useRef(selectedKey);
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    selectedKeyRef.current = selectedKey;
    pathnameRef.current = pathname;
  });
  const topCardRef = useRef<TopCard | null>(null);
  const leavingRef = useRef(false);

  useEffect(() => {
    if (!showCards) return;

    const remember = () => {
      if (!leavingRef.current) topCardRef.current = findTopVisibleCard();
    };
    const handlePopState = () => {
      // モーダルを閉じるためのバックのように、このページにとどまる popstate は除く
      if (window.location.pathname !== pathnameRef.current) leavingRef.current = true;
    };

    remember();
    window.addEventListener("scroll", remember, { passive: true });
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("scroll", remember);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [showCards, selectedKey]);

  useLayoutEffect(() => {
    if (!showCards) return;

    return () => {
      const topCard = topCardRef.current;
      if (!topCard) return;

      markCityleagueDateReturn(
        { date: dateParam, league: selectedKeyRef.current, anchorEventId: topCard.anchorEventId },
        topCard.top,
      );
    };
  }, [showCards, dateParam]);

  return (
    <div className="flex flex-col gap-3">
      <Tabs
        fullWidth
        size="sm"
        selectedKey={selectedKey}
        onSelectionChange={(key) => setChosenKey(key as string)}
        classNames={{ tabContent: "font-bold" }}
      >
        {leagueCounts.map((item) => (
          <Tab key={item.leagueTitle} title={`${item.leagueTitle} ${item.count}件`} />
        ))}
      </Tabs>

      {showCards ? (
        [...mountedPanels].map(([leagueTitle, progressive]) => (
          <div key={leagueTitle} hidden={leagueTitle !== selectedKey}>
            <DateResultPanel
              items={itemsByLeague.get(leagueTitle) ?? []}
              deckArchetypes={deckArchetypes}
              progressive={progressive}
            />
          </div>
        ))
      ) : (
        <CityleagueEventLinkList
          events={events.filter((event) => event.league_title === selectedKey)}
          showDateLink={false}
        />
      )}
    </div>
  );
}
