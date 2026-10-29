"use client";

import { memo, startTransition, useEffect, useMemo, useState } from "react";

import { Tabs, Tab } from "@heroui/react";

import CityleagueEventLinkList from "@app/components/organisms/Cityleague/CityleagueEventLinkList";
import CityleagueResult from "@app/components/organisms/Cityleague/CityleagueResult";

import { useReturnTargetItem } from "@app/hooks/useReturnTargetItem";
import { CityleagueResultType } from "@app/types/cityleague_result";
import { DeckArchetypeMap } from "@app/types/deck_archetype";
import { OfficialEventType } from "@app/types/official_event";
import { countEventsByLeagueTitle } from "@app/utils/cityleagueLeagueCount";
import {
  CITYLEAGUE_DATE_SCROLL_TO_ID_KEY,
  CITYLEAGUE_DATE_SCROLL_TO_LEAGUE_KEY,
  cityleagueDateResultAnchorId,
  clearCityleagueDateScrollTarget,
  markCityleagueDateScrollTarget,
} from "@app/utils/cityleagueScrollRestore";
import { scrollBackToAnchor } from "@app/utils/returnTarget";

type Props = {
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
            onOpenDetail={() => markCityleagueDateScrollTarget(event.id, event.league_title)}
            deferSwiper={index >= EAGER_SWIPER_COUNT}
          />
        </div>
      ))}
    </div>
  );
});

// 開催日ページの結果を、リーグ区分で絞り込めるようにするタブ。
// その日に実際に登録されているリーグ区分だけを並べる(開催の無い区分のタブは出さない)。
export default function CityleagueDateEventTabs({ events, results, deckArchetypes }: Props) {
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
   * 個別ページから戻ってきたとき、開いたカードのタブに合わせてその位置まで戻す(一覧と同じ)。
   * 受け取るのは、このページが現れた時点で既に書かれていた控えだけ(useReturnTargetItem)。
   */
  const savedScrollId = useReturnTargetItem(CITYLEAGUE_DATE_SCROLL_TO_ID_KEY);
  const savedScrollLeague = useReturnTargetItem(CITYLEAGUE_DATE_SCROLL_TO_LEAGUE_KEY);
  const pendingScrollId =
    savedScrollId !== null &&
    items.some((item) => item.result.official_event_id === Number(savedScrollId))
      ? Number(savedScrollId)
      : null;
  const restoreLeague =
    pendingScrollId !== null &&
    leagueCounts.some((item) => item.leagueTitle === savedScrollLeague)
      ? savedScrollLeague
      : null;

  // 利用者が選んだタブ。選ぶまでは、戻り先のタブか先頭のタブ
  const [chosenKey, setChosenKey] = useState<string | null>(null);
  const selectedKey = chosenKey ?? restoreLeague ?? firstKey;

  /*
   * 一度開いたタブ(列を残しておくタブ)と、その列を数枚ずつ描き足すか。
   * 利用者がタブを押して初めて開いた列だけを描き足しにする。初期表示と戻ってきたときの列は全部描く。
   * 新しいタブを開いたら、その描画の中で足す(描画中の更新。effect で足すと1回ぶん空の列が出る)。
   */
  const [mountedPanels, setMountedPanels] = useState<Map<string, boolean>>(
    () => new Map([[firstKey, false]]),
  );
  if (showCards && !mountedPanels.has(selectedKey)) {
    setMountedPanels(new Map(mountedPanels).set(selectedKey, chosenKey === selectedKey));
  }

  useEffect(() => {
    if (savedScrollId === null) return;

    // 別の開催日で控えたもの(このページに無い大会)は使わずに消す。残すと、次にその日を開いたとき
    // 戻ってきたわけでもないのに途中まで送られる
    if (pendingScrollId === null) {
      clearCityleagueDateScrollTarget();
      return;
    }

    // 戻り先のタブのカードはこの描画で並んでいるので、フレームを1つ待ってから測る。
    // 控えを消すと戻り先のタブ(restoreLeague)も消えるので、先に選んだタブとして持ち直す
    const frame = requestAnimationFrame(() => {
      if (restoreLeague) setChosenKey(restoreLeague);
      clearCityleagueDateScrollTarget();
      scrollBackToAnchor(cityleagueDateResultAnchorId(pendingScrollId), 80);
    });

    return () => cancelAnimationFrame(frame);
  }, [savedScrollId, pendingScrollId, restoreLeague]);

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
