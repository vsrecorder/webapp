"use client";

import { useRef } from "react";

import { Modal, ModalContent, ModalHeader, ModalBody, Chip, Image } from "@heroui/react";

import { LuClipboardList, LuLayers, LuBookPlus, LuArchive } from "react-icons/lu";

import { CalendarEvent } from "@app/types/calendar";
import { DeckPokemonSpriteType } from "@app/types/pokemon_sprite";
import { spriteImageUrl, spriteScaleClass } from "@app/utils/sprite";

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

// 発生時刻(HH:mm、日本時間)。時系列で並んでいることが一目でわかるように各行に表示する
function formatTimeLabel(createdAt: string): string {
  return new Date(createdAt).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  });
}

// タイムラインの丸ノードの色。記録は種別ごとのアクセントカラー(記録カードと同じ)を使う
function dotColorClass(event: CalendarEvent): string {
  if (event.type === "record") return event.accent_color_class;
  if (event.type === "deck_created") return "bg-success";
  if (event.type === "deck_code_added") return "bg-secondary";
  return "bg-default-400";
}

function eventKey(event: CalendarEvent): string {
  if (event.type === "record") return `record-${event.record_id}`;
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

function EventContent({ event }: { event: CalendarEvent }) {
  if (event.type === "record") {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-default-100 px-4 py-3">
        <LuClipboardList className="text-xl text-default-500 shrink-0 mr-2" />
        <div className="text-sm min-w-0">
          <Chip
            size="sm"
            variant="flat"
            color={event.chip_color}
            className="h-5 text-[10px] font-bold mb-1"
          >
            {event.chip_label}
          </Chip>
          <div>
            <span className="font-bold">{event.event_title}</span>
            <span className="text-default-500"> の記録を作成</span>
          </div>
        </div>
      </div>
    );
  }

  if (event.type === "deck_created") {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-default-100 px-4 py-3">
        <LuLayers className="text-xl text-success shrink-0" />
        <DeckSprites sprites={event.pokemon_sprites} />
        <div className="text-sm min-w-0">
          <span className="font-bold">『{event.deck_name}』</span>
          <span className="text-default-500">を登録</span>
        </div>
      </div>
    );
  }

  if (event.type === "deck_code_added") {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-default-100 px-4 py-3">
        <LuBookPlus className="text-xl text-secondary shrink-0" />
        <DeckSprites sprites={event.pokemon_sprites} />
        <div className="text-sm min-w-0">
          <span className="font-bold">『{event.deck_name}』</span>
          <span className="text-default-500">の新しいバージョンを作成</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-xl bg-default-100 px-4 py-3">
      <LuArchive className="text-xl text-default-400 shrink-0" />
      <DeckSprites sprites={event.pokemon_sprites} />
      <div className="text-sm min-w-0">
        <span className="font-bold">『{event.deck_name}』</span>
        <span className="text-default-500">をアーカイブ</span>
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
      classNames={{ base: "sm:max-w-full" }}
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
              <div>{formatDateLabel(date)}</div>
            </ModalHeader>
            <ModalBody className="px-3 pb-5 max-h-[60dvh] overflow-y-auto">
              {events.length === 0 ? (
                <div className="py-8 text-center text-sm text-default-400">
                  この日の記録はありません
                </div>
              ) : (
                <ol className="relative">
                  {events.map((event, index) => (
                    <li
                      key={eventKey(event)}
                      className={`border-s-2 ${
                        index === events.length - 1
                          ? "border-transparent"
                          : "border-divider"
                      }`}
                    >
                      <div className="pb-4">
                        <div className="flex items-center gap-2 pb-2">
                          <div
                            className={`-translate-x-1/2 w-3 h-3 rounded-full shrink-0 ${dotColorClass(event)}`}
                          />
                          <span className="text-tiny font-bold text-default-400">
                            {formatTimeLabel(event.created_at)}
                          </span>
                        </div>
                        <div className="pl-2">
                          <EventContent event={event} />
                        </div>
                      </div>
                    </li>
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
