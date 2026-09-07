// 検証用の一時ページ(コミットしない)
"use client";

import RecordHero from "@app/components/organisms/Record/Hero/RecordHero";
import TonamelEventRecord from "@app/components/organisms/Record/TonamelEventRecord";
import { summarizeMatches } from "@app/utils/matchStats";

import type { RecordGetByIdResponseType, RecordType } from "@app/types/record";
import type { MatchGetResponseType } from "@app/types/match";

const EVENTS = {
  GJv2A: {
    id: "GJv2A",
    title: "第19回ポケカカードラッシュCS（3人チーム戦/822人規模）",
    description: "",
    image:
      "https://img.tonamel.com/upload_images/organize_competition/SEYTD/d8cb78e9a067d37254246159a5e3c798b7d7a9383c86ce1294560c09b1333987.png",
  },
  VfweL: {
    id: "VfweL",
    title: "ポケモンカードゲーム トレーナーズリーグ",
    description: "",
    image:
      "https://tonamel.com/assets/99597b148d-c516361ef6-007a33aac7-22c88ffdd5/banners/competitions/cover.jpg",
  },
};

// 記録詳細のヒーローはイベントを自分で取りに行くので、その1本だけ差し替える
if (typeof window !== "undefined" && !(window as unknown as { __mocked?: boolean }).__mocked) {
  (window as unknown as { __mocked?: boolean }).__mocked = true;
  const orig = window.fetch.bind(window);
  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    const m = url.match(/\/api\/tonamel_events\/(\w+)/);
    if (m && EVENTS[m[1] as keyof typeof EVENTS]) {
      return new Response(JSON.stringify(EVENTS[m[1] as keyof typeof EVENTS]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return orig(input as RequestInfo, init);
  }) as typeof window.fetch;
}

const TAGS = [
  {
    id: "tag-placement",
    created_at: new Date("2026-08-30T10:00:00+09:00"),
    name: "ベスト4",
    color: "#B9975B",
    text_color: "#FFFFFF",
    preset_flg: true,
  },
];

function makeRecord(eventId: keyof typeof EVENTS): RecordGetByIdResponseType {
  return {
    id: `devtest-${eventId}`,
    created_at: new Date("2026-08-30T10:00:00+09:00"),
    official_event_id: 0,
    tonamel_event_id: eventId,
    friend_id: "",
    user_id: "devtest-user",
    deck_id: "",
    deck_code_id: "",
    private_flg: false,
    ignore_stats_flg: false,
    regulation_id: 1,
    tcg_meister_url: "",
    memo: "",
    event_date: "2026-08-30T00:00:00+09:00",
    unofficial_event_id: "",
    tags: TAGS,
  };
}

function makeRecordData(eventId: keyof typeof EVENTS): RecordType {
  return {
    cursor: "c1",
    data: { ...makeRecord(eventId), deck_id: "devtest-deck" },
    details: {
      tonamel_event: EVENTS[eventId],
      deck: {
        id: "devtest-deck",
        name: "リザードンex／ピジョットex",
        pokemon_sprites: [
          { id: "6", position: 1 },
          { id: "18", position: 2 },
        ],
      },
      matches: {
        total: 5,
        wins: 4,
        losses: 1,
        draws: 0,
        has_group_match: true,
        has_bo3: false,
      },
    },
  };
}

const stats = summarizeMatches([
  { victory_flg: true, draw_flg: false, group_match_flg: false, group_match_victory_flg: false },
  { victory_flg: true, draw_flg: false, group_match_flg: false, group_match_victory_flg: false },
  { victory_flg: false, draw_flg: false, group_match_flg: false, group_match_victory_flg: false },
  { victory_flg: true, draw_flg: false, group_match_flg: false, group_match_victory_flg: false },
  { victory_flg: true, draw_flg: false, group_match_flg: false, group_match_victory_flg: false },
] as unknown as MatchGetResponseType[]);

function Section({
  eventId,
  caption,
}: {
  eventId: keyof typeof EVENTS;
  caption: string;
}) {
  return (
    <div data-testid={`section-${eventId}`} className="flex w-full flex-col gap-3">
      <h2 className="px-1 text-sm font-bold text-default-600">{caption}</h2>

      <div className="flex flex-col gap-1">
        <span className="px-1 text-[0.6875rem] font-bold text-default-500">
          記録一覧のカード（ライト12% / ダーク10%）
        </span>
        <TonamelEventRecord
          recordData={makeRecordData(eventId)}
          enableDisplayRecordModal={false}
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className="px-1 text-[0.6875rem] font-bold text-default-500">
          記録詳細のイベント情報パネル（ライト12% / ダーク10%）
        </span>
        <RecordHero record={makeRecord(eventId)} setRecord={() => {}} stats={stats} />
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <div className="app-dot-bg flex w-full flex-col items-center gap-6 p-2">
      <Section eventId="GJv2A" caption="A: 主催者アップロードのサムネイル" />
      <Section eventId="VfweL" caption="B: カバー未設定（Tonamel既定のオレンジ地）" />
    </div>
  );
}
