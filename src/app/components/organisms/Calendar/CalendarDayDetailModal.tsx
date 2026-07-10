"use client";

import { useRef, useState } from "react";

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
import { spriteImageUrl, spriteScaleClass } from "@app/utils/sprite";

const UNKNOWN_SPRITE_URL =
  "https://xx8nnpgt.user.webaccel.jp/images/pokemon-sprites/unknown.png";

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

// デッキにスプライトが登録されている場合のみ、先頭2体を表示する
function DeckSprites({ sprites }: { sprites: DeckPokemonSpriteType[] }) {
  if (sprites.length === 0) return null;

  return (
    <div className="flex items-center shrink-0">
      {sprites.slice(0, 2).map((sprite, index) => (
        <Image
          key={sprite.id ?? index}
          alt={sprite.id ?? "unknown"}
          src={spriteImageUrl(sprite.id)}
          radius="none"
          className={`w-6 h-6 object-contain ${spriteScaleClass(sprite.id)} origin-bottom`}
        />
      ))}
    </div>
  );
}

// 対戦相手のデッキスプライト。未登録の枠は unknown.png で埋め、常に2体分のスペースを確保する
function OpponentSprites({ sprites }: { sprites: MatchPokemonSpriteType[] }) {
  return (
    <div className="flex items-center shrink-0">
      {[0, 1].map((index) => {
        const sprite = sprites[index];
        return sprite ? (
          <Image
            key={sprite.id}
            alt={sprite.id}
            src={spriteImageUrl(sprite.id)}
            radius="none"
            className={`w-6 h-6 object-contain ${spriteScaleClass(sprite.id)} origin-bottom`}
          />
        ) : (
          <Image
            key={index}
            alt="unknown"
            src={UNKNOWN_SPRITE_URL}
            radius="none"
            className="w-6 h-6 object-contain scale-150 origin-bottom"
          />
        );
      })}
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
          <DeckCodeThumbnail code={event.deck_code} />
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
          <span className="text-tiny font-bold text-default-400">対戦相手</span>
          <div className="flex items-center gap-2 pl-3">
            <OpponentSprites sprites={event.opponents_pokemon_sprites} />
            <span className="text-sm font-bold text-default-600 truncate">
              {event.opponents_deck_info ? `『${event.opponents_deck_info}』` : "デッキ情報なし"}
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
            <span className="text-xs text-default-500"> の新しいバージョンを作成</span>
          </div>
        </div>
        <DeckCodeThumbnail code={event.code} />
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

export default function CalendarDayDetailModal({
  isOpen,
  onOpenChange,
  onClose,
  date,
  events,
}: Props) {
  const startY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY.current === null) return;

    const diff = e.touches[0].clientY - startY.current;

    if (diff > 30) {
      startY.current = null;
      onClose();
    }
  };

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
      }}
    >
      <ModalContent>
        {() => (
          <>
            <ModalHeader
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
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
                  {events.map((event, index) => {
                    const isLast = index === events.length - 1;

                    return (
                      <li key={eventKey(event)} className="flex gap-2.5">
                        {/* タイムラインのガター。ドットと時刻ラベルを同じ高さ(h-4)のボックスで
                            揃えることで水平方向に一列に並べ、リング(bg-content1)でラインとの
                            重なりを切り抜いて見せる */}
                        <div className="flex flex-col items-center w-2.5 shrink-0">
                          <div className="flex items-center justify-center h-4 shrink-0">
                            <span
                              className={`w-2.5 h-2.5 rounded-full ring-4 ring-content1 shrink-0 ${dotColorClass(event)}`}
                            />
                          </div>
                          {!isLast && (
                            <span className="w-px flex-1 mt-1.5 bg-divider" />
                          )}
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
                  })}
                </ol>
              )}
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
