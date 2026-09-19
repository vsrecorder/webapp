// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SWRConfig } from "swr";

import DeckUsagePanel from "@app/components/organisms/DeckUsage/DeckUsagePanel";

import { DeckUsageItemType } from "@app/types/deck_usage_stat";
import { EnvironmentType } from "@app/types/environment";

// jsdom の canvas は getContext を持たず、chart.js はチャートを作れずに落ちる。
// ここで見たいのは取得失敗時の分岐と凡例なので、円グラフ本体は描かない。
vi.mock("react-chartjs-2", () => ({
  Pie: () => null,
}));

// jsdom は ResizeObserver を持たない。HeroUI の Tabs が下線の位置を追うのに使う
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

const ENVIRONMENTS: EnvironmentType[] = [
  {
    id: "env1",
    title: "環境A",
    from_date: new Date("2026-01-01"),
    to_date: new Date("2026-06-30"),
  },
  {
    id: "env2",
    title: "環境B",
    from_date: new Date("2026-07-01"),
    to_date: new Date("2026-12-31"),
  },
];

function deck(name: string): DeckUsageItemType {
  return {
    deck_id: `id-${name}`,
    name,
    count: 10,
    usage_rate: 1,
    wins: 6,
    losses: 4,
    win_rate: 0.6,
    game_count: 10,
    go_first_count: 5,
    go_second_count: 5,
    go_first_rate: 0.5,
    go_first_wins: 3,
    go_first_win_rate: 0.6,
    go_second_wins: 3,
    go_second_win_rate: 0.6,
    pokemon_sprites: [],
  };
}

function stat(name: string) {
  return {
    user_id: "u1",
    year_month: "2026-09",
    environment_id: "env1",
    season: "",
    regulation_id: "1",
    total_records: 10,
    decks: [deck(name)],
  };
}

/*
 * デッキ使用率の取得だけを制御する fetch スタブ。
 * responses の先頭から順に「成功させるデータ or null(=500)」を取り出す。
 */
function stubFetch(
  responses: (ReturnType<typeof stat> | null)[],
  oldestEventDate?: string,
) {
  let call = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.includes("/oldest-record-event-date")) {
        return oldestEventDate
          ? Response.json({ event_date: oldestEventDate })
          : new Response("{}", { status: 404 });
      }
      if (!url.includes("/deck-usage")) {
        return new Response("{}", { status: 404 });
      }

      const body = responses[Math.min(call, responses.length - 1)];
      call += 1;
      return body
        ? Response.json(body)
        : new Response('{"message":"error"}', { status: 500 });
    }),
  );
}

function renderPanel() {
  return render(
    // SWR のキャッシュはモジュールをまたいで共有されるため、テストごとに切り離す
    <SWRConfig value={{ provider: () => new Map() }}>
      <DeckUsagePanel
        userId="u1"
        environments={ENVIRONMENTS}
        currentEnvironmentId="env1"
        standardRegulations={[]}
        championshipSeries={[]}
        sectionTitle="デッキ使用率"
      />
    </SWRConfig>,
  );
}

afterEach(() => {
  // vitest は globals: false のため、testing-library の自動 cleanup が働かない
  cleanup();
  vi.unstubAllGlobals();
});

describe("DeckUsagePanel の取得失敗", () => {
  it("失敗を「記録がまだありません」と区別して表示する", async () => {
    stubFetch([null]);
    renderPanel();

    await waitFor(() =>
      expect(screen.getByText("デッキ使用率を取得できませんでした")).toBeTruthy(),
    );
    // 記録が無いわけではないので、記録作成へ誘導しない
    expect(screen.queryByText(/対戦記録がまだありません/)).toBeNull();
  });

  it("失敗したら前の期間の集計を残さない", async () => {
    stubFetch([stat("環境Aのデッキ"), null]);
    renderPanel();

    await waitFor(() => expect(screen.getByText("環境Aのデッキ")).toBeTruthy());

    // 期間を切り替える(2本目の取得が失敗する)
    const periodSelect = document.querySelector<HTMLSelectElement>(
      'select[name="deck-usage-period"]',
    );
    fireEvent.change(periodSelect!, { target: { value: "env2" } });

    await waitFor(() =>
      expect(screen.getByText("デッキ使用率を取得できませんでした")).toBeTruthy(),
    );
    // 期間ラベルは環境Bなのに環境Aの数字が残る、という食い違いを作らない
    expect(screen.queryByText("環境Aのデッキ")).toBeNull();
  });

  it("「再読み込み」で取り直せる", async () => {
    stubFetch([null, stat("取り直したデッキ")]);
    renderPanel();

    await waitFor(() =>
      expect(screen.getByText("デッキ使用率を取得できませんでした")).toBeTruthy(),
    );

    fireEvent.click(screen.getByRole("button", { name: /再読み込み/ }));

    await waitFor(() => expect(screen.getByText("取り直したデッキ")).toBeTruthy());
  });
});

describe("DeckUsagePanel の月次の選択肢", () => {
  // 登録日より古い記録があると、登録日起点では選べない月ができてしまう。
  // 対戦相手のデッキ分析パネルと同じく、実際の最も古い記録の月まで遡らせる。
  it("記録された最も古い月まで遡る", async () => {
    stubFetch([stat("デッキ")], "2024-03-15");
    renderPanel();

    await waitFor(() => expect(screen.getByText("デッキ")).toBeTruthy());

    fireEvent.click(screen.getByRole("tab", { name: "月次" }));

    await waitFor(() =>
      expect(
        document.querySelector('select[name="deck-usage-period"] option[value="2024-03"]'),
      ).toBeTruthy(),
    );
  });
});
