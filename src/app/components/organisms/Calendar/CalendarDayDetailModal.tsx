"use client";

import { memo, useEffect, useState } from "react";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  Chip,
  Image,
  Skeleton,
} from "@heroui/react";

import {
  LuClipboardList,
  LuSwords,
  LuLayers,
  LuBookPlus,
  LuArchive,
  LuStickyNote,
  LuClock,
} from "react-icons/lu";

import { CalendarEvent } from "@app/types/calendar";
import { DeckPokemonSpriteType, MatchPokemonSpriteType } from "@app/types/pokemon_sprite";
import PokemonSprite from "@app/components/atoms/PokemonSprite";
import DeckCardDiff from "@app/components/organisms/Deck/DeckCardDiff";
import { useModalDragToClose } from "@app/hooks/useModalDragToClose";
import { closingPassthroughClassNames } from "@app/utils/modal";

type Props = {
  isOpen: boolean;
  onOpenChange: () => void;
  onClose: () => void;
  date: string | null;
  events: CalendarEvent[];
};

function formatDateLabel(date: string): string {
  const d = new Date(`${date}T00:00:00+09:00`);
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: "Asia/Tokyo",
  });
}

// 発生時刻(HH:mm:ss、日本時間)。時系列で並んでいることが一目でわかるように各行に表示する
function formatTimeLabel(createdAt: string): string {
  return new Date(createdAt).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Tokyo",
  });
}

// タイムラインの丸ノードの色。記録は種別ごとのアクセントカラー(記録カードと同じ)を使う
function dotColorClass(event: CalendarEvent): string {
  if (event.type === "record") return event.accent_color_class;
  if (event.type === "match_added") return "bg-warning";
  if (event.type === "deck_created") return "bg-success";
  if (event.type === "deck_code_added") return "bg-secondary";
  return "bg-default-400";
}

function eventKey(event: CalendarEvent): string {
  if (event.type === "record") return `record-${event.record_id}`;
  if (event.type === "match_added") return `match_added-${event.match_id}`;
  if (event.type === "deck_created") return `deck_created-${event.deck_id}`;
  if (event.type === "deck_code_added") return `deck_code_added-${event.deck_code_id}`;
  return `deck_archived-${event.deck_id}`;
}

// デッキにスプライトが登録されている場合のみ、先頭2体を表示する。
// サイズ・間隔はデッキ使用率分析・相手デッキ分布のリスト(size=32 / gap-0)と揃える
function DeckSprites({ sprites }: { sprites: DeckPokemonSpriteType[] }) {
  if (sprites.length === 0) return null;

  return (
    <div className="flex items-center gap-0 shrink-0">
      {sprites.slice(0, 2).map((sprite, index) => (
        <PokemonSprite key={sprite.id ?? index} id={sprite.id} size={32} />
      ))}
    </div>
  );
}

// 対戦相手のデッキスプライト。未登録の枠は unknown.png で埋め、常に2体分のスペースを確保する
function OpponentSprites({ sprites }: { sprites: MatchPokemonSpriteType[] }) {
  return (
    <div className="flex items-center gap-0 shrink-0">
      {[0, 1].map((index) => (
        <PokemonSprite key={index} id={sprites[index]?.id} size={32} />
      ))}
    </div>
  );
}

// 新バージョン作成時のデッキ画像。DisplayDeckCodes.tsx と同じ画像URL規約を使う
function DeckCodeThumbnail({ code }: { code: string }) {
  const [imageLoaded, setImageLoaded] = useState(false);

  if (!code) return null;

  return (
    <div className="relative w-full aspect-2/1 rounded-lg overflow-hidden">
      {!imageLoaded && <Skeleton className="absolute inset-0 rounded-lg" />}
      <Image
        radius="sm"
        shadow="none"
        alt={code}
        src={`https://xx8nnpgt.user.webaccel.jp/images/decks/${code}.jpg`}
        className="w-full h-full object-cover"
        onLoad={() => setImageLoaded(true)}
      />
    </div>
  );
}

function EventContent({ event }: { event: CalendarEvent }) {
  if (event.type === "record") {
    return (
      <div className="flex flex-col gap-2.5 rounded-xl bg-default-100 px-4 py-3">
        <div className="flex items-center gap-3">
          <LuClipboardList className="text-xl text-default-500 shrink-0 mr-2" />
          <div className="text-sm min-w-0">
            <div>
              <span className="font-bold">{event.event_title}</span>
              <span className="text-xs text-default-500 whitespace-nowrap">
                {" "}
                の記録を作成
              </span>
            </div>
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              <Chip
                size="sm"
                variant="flat"
                color={event.chip_color}
                className="h-5 text-[10px] font-bold"
              >
                {event.chip_label}
              </Chip>
              {event.venue_label && (
                <Chip
                  size="sm"
                  variant="flat"
                  color="default"
                  className="h-5 text-[10px] font-bold max-w-40 truncate"
                >
                  {event.venue_label}
                </Chip>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-divider" />

        <div className="flex flex-col gap-1.5">
          <span className="text-tiny font-bold text-default-400">使用デッキ</span>
          <div className="flex items-center gap-2 pl-3">
            <DeckSprites sprites={event.deck_pokemon_sprites} />
            <span className="text-sm font-bold text-default-600">
              {event.deck_name ? `『${event.deck_name}』` : "なし"}
            </span>
          </div>
          {/* ラベル〜デッキ情報より、デッキ情報〜デッキ画像の間を広くとる */}
          <div className="mt-1.5">
            <DeckCodeThumbnail code={event.deck_code} />
          </div>
        </div>
      </div>
    );
  }

  if (event.type === "match_added") {
    const resultLabel = event.default_victory_flg
      ? "不戦勝"
      : event.default_defeat_flg
        ? "不戦敗"
        : event.victory_flg
          ? "勝ち"
          : "負け";
    const resultColor = event.victory_flg ? "success" : "danger";

    return (
      <div className="flex flex-col gap-2.5 rounded-xl bg-default-100 px-4 py-3">
        <div className="flex items-center gap-3">
          <LuSwords className="text-xl text-default-500 shrink-0 mr-2" />
          <div className="text-sm min-w-0">
            <div>
              <span className="font-bold">{event.event_title}</span>
              <span className="text-xs text-default-500 whitespace-nowrap">
                {" "}
                の対戦結果を追加
              </span>
            </div>
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              <Chip
                size="sm"
                variant="flat"
                color={event.chip_color}
                className="h-5 text-[10px] font-bold"
              >
                {event.chip_label}
              </Chip>
              {event.venue_label && (
                <Chip
                  size="sm"
                  variant="flat"
                  color="default"
                  className="h-5 text-[10px] font-bold max-w-40 truncate"
                >
                  {event.venue_label}
                </Chip>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-divider" />

        <div className="flex flex-col gap-1.5">
          <span className="text-tiny font-bold text-default-400">使用デッキ</span>
          <div className="flex items-center gap-2 pl-3">
            <DeckSprites sprites={event.deck_pokemon_sprites} />
            <span className="text-sm font-bold text-default-600 truncate">
              {event.deck_name ? `『${event.deck_name}』` : "なし"}
            </span>
          </div>
        </div>

        <div className="border-t border-divider" />

        <div className="flex flex-col gap-1.5">
          <span className="text-tiny font-bold text-default-400">対戦相手</span>
          <div className="flex items-center gap-2 pl-3">
            <OpponentSprites sprites={event.opponents_pokemon_sprites} />
            <span className="text-sm font-bold text-default-600 truncate">
              {event.opponents_deck_info
                ? `『${event.opponents_deck_info}』`
                : "デッキ情報なし"}
            </span>
          </div>
          <div className="flex items-center gap-1 pl-3 flex-wrap">
            <Chip
              size="sm"
              variant="flat"
              radius="sm"
              color={resultColor}
              className="h-5 text-[10px] font-bold"
            >
              {resultLabel}
            </Chip>
            {event.go_first !== null && (
              <Chip
                size="sm"
                variant="flat"
                radius="sm"
                className="h-5 text-[10px] font-bold"
              >
                {event.go_first ? "先攻" : "後攻"}
              </Chip>
            )}
            {event.your_prize_cards !== null && event.opponents_prize_cards !== null && (
              <Chip
                size="sm"
                variant="flat"
                radius="sm"
                className="h-5 text-[10px] font-bold"
              >
                {event.your_prize_cards} - {event.opponents_prize_cards}
              </Chip>
            )}
          </div>
          {event.memo && (
            <div className="flex flex-col gap-1 pl-3 pt-1.5">
              <div className="flex items-center gap-1">
                <LuStickyNote className="text-xs text-default-400 shrink-0" />
                <span className="text-tiny font-bold text-default-400">メモ</span>
              </div>
              <div className="rounded-lg bg-warning-50 border border-warning-100 px-2.5 py-1.5">
                <span className="text-xs text-default-600 whitespace-pre-wrap wrap-break-word">
                  {event.memo}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (event.type === "deck_created") {
    return (
      <div className="flex flex-col gap-3 rounded-xl bg-default-100 px-4 py-3">
        <div className="flex items-center gap-3">
          <LuLayers className="text-xl text-success shrink-0" />
          {event.code && <DeckSprites sprites={event.pokemon_sprites} />}
          <div className="text-sm min-w-0">
            <span className="font-bold">{event.deck_name}</span>
            <span className="text-xs text-default-500"> を登録</span>
          </div>
        </div>
        {event.code && <DeckCodeThumbnail code={event.code} />}
      </div>
    );
  }

  if (event.type === "deck_code_added") {
    return (
      <div className="flex flex-col gap-3 rounded-xl bg-default-100 px-4 py-3">
        <div className="flex items-center gap-3">
          <LuBookPlus className="text-xl text-secondary shrink-0" />
          <DeckSprites sprites={event.pokemon_sprites} />
          <div className="text-sm min-w-0">
            <span className="font-bold">{event.deck_name}</span>
            <br />
            <span className="text-xs text-default-500">の新しいバージョンを作成</span>
          </div>
        </div>
        <DeckCodeThumbnail code={event.code} />
        {/* 直前のバージョンが無い(このデッキで最初のバージョン)場合は差分を出さない */}
        {event.previous_code && (
          <div className="border-t border-divider pt-2.5">
            <DeckCardDiff current_code={event.code} previous_code={event.previous_code} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-xl bg-default-100 px-4 py-3">
      <LuArchive className="text-xl text-default-400 shrink-0" />
      <DeckSprites sprites={event.pokemon_sprites} />
      <div className="text-sm min-w-0">
        <span className="font-bold">{event.deck_name}</span>
        <span className="text-xs text-default-500"> をアーカイブ</span>
      </div>
    </div>
  );
}

/*
 * タイムラインの1行。
 *
 * 行を少しずつ増やして描画するため(useProgressiveRenderCount)、増えるたびに
 * 既に描画済みの行まで作り直すと描画量が件数の二乗で膨らむ。memo で防ぐ。
 */
const EventRow = memo(function EventRow({
  event,
  isLast,
}: {
  event: CalendarEvent;
  isLast: boolean;
}) {
  return (
    <li className="flex gap-2.5">
      {/* タイムラインのガター。ドットと時刻ラベルを同じ高さ(h-4)のボックスで
          揃えることで水平方向に一列に並べ、リング(bg-content1)でラインとの
          重なりを切り抜いて見せる */}
      <div className="flex flex-col items-center w-2.5 shrink-0">
        <div className="flex items-center justify-center h-4 shrink-0">
          <span
            className={`w-2.5 h-2.5 rounded-full ring-4 ring-content1 shrink-0 ${dotColorClass(event)}`}
          />
        </div>
        {!isLast && <span className="w-px flex-1 mt-1.5 bg-divider" />}
      </div>
      <div className={`min-w-0 flex-1 ${isLast ? "pb-1" : "pb-5"}`}>
        <div className="flex items-center gap-1 h-4">
          <LuClock className="text-[11px] text-default-300 shrink-0" />
          <span className="text-tiny font-bold text-default-400">
            {formatTimeLabel(event.created_at)}
          </span>
        </div>
        <div className="mt-1.5">
          <EventContent event={event} />
        </div>
      </div>
    </li>
  );
});

// 開いた直後に描画する行数。スクロールせずに見える範囲をまかなえればよい。
const INITIAL_RENDER_COUNT = 6;
// 1フレームごとに追加で描画する行数。
const RENDER_CHUNK_SIZE = 6;

/*
 * 表示する行数を、フレームを跨いで少しずつ増やす。
 *
 * 大会の日など1日のイベントが多いと、開いた瞬間に全行を組み立てることになり
 * モーダルが出るまでに数百ms〜数秒かかっていた(イベント数に比例して増える)。
 * 最初は見える範囲だけを描き、残りは後続フレームに回すことで、
 * 開く操作を待たせず、描画中も操作を受け付けられるようにする。
 */
function useProgressiveRenderCount(total: number, isOpen: boolean): number {
  const [count, setCount] = useState(0);

  // 開くたびに最初からやり直す(閉じている間は何も描画しない)
  useEffect(() => {
    setCount(isOpen ? Math.min(INITIAL_RENDER_COUNT, total) : 0);
  }, [isOpen, total]);

  useEffect(() => {
    if (!isOpen || count === 0 || count >= total) return;

    const id = requestAnimationFrame(() => {
      setCount((c) => Math.min(c + RENDER_CHUNK_SIZE, total));
    });

    return () => cancelAnimationFrame(id);
  }, [isOpen, count, total]);

  return count;
}

export default function CalendarDayDetailModal({
  isOpen,
  onOpenChange,
  onClose,
  date,
  events,
}: Props) {
  const renderCount = useProgressiveRenderCount(events.length, isOpen);
  const attachHeader = useModalDragToClose(onClose);

  if (!date) return null;

  return (
    <Modal
      isOpen={isOpen}
      size="md"
      placement="bottom"
      hideCloseButton
      onOpenChange={onOpenChange}
      onClose={onClose}
      className="z-20 h-[calc(100dvh-128px)] max-h-[calc(100dvh-128px)] mt-26 my-0 rounded-b-none overscroll-contain"
      classNames={{
        base: "sm:max-w-full",
        closeButton: "text-xl",
        ...closingPassthroughClassNames(isOpen),
      }}
    >
      <ModalContent>
        {() => (
          <>
            <ModalHeader
              ref={attachHeader}
              className="px-3 py-3 flex flex-col gap-1 cursor-grab touch-none"
            >
              <div className="mx-auto h-1 w-32 mb-1.5 rounded-full bg-default-300" />
              <div>{formatDateLabel(date)} の活動ログ</div>
            </ModalHeader>
            <ModalBody className="px-3 pb-5 flex flex-col overflow-y-auto">
              {events.length === 0 ? (
                <div className="py-8 text-center text-sm text-default-400">
                  この日の記録はありません
                </div>
              ) : (
                <ol className="relative">
                  {events.slice(0, renderCount).map((event, index) => (
                    <EventRow
                      key={eventKey(event)}
                      event={event}
                      // 「描画済みの最終行」を基準にする。総件数(events.length)基準だと、
                      // 少しずつ描画している途中は最後の行の下にタイムラインの線だけが
                      // 伸びて見えてしまう。行が追加されたら前の最終行だけ描き直される
                      isLast={index === renderCount - 1}
                    />
                  ))}
                </ol>
              )}
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
