// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useRecordCard } from "@app/components/organisms/Record/useRecordCard";

import { RecordType } from "@app/types/record";
import { notifyDeckCodeSpritesChanged } from "@app/utils/deckCodeSpriteClient";

// 通知はカレンダーと「記録中」のバーも取り直させるが、ここではカードの追随だけを見る
vi.mock("@app/utils/recordingNowClient", () => ({ refreshRecordingNow: () => {} }));

const deckSprites = [
  { id: "0887", position: 1 },
  { id: "0477", position: 2 },
];
const versionSprites = [
  { id: "0887", position: 1 },
  { id: "0006", position: 2 },
];

// 一覧 API が周辺情報(details)を付けた記録。カードは自分では何も取りに行かない
function makeRecord(id: string, deckCodeSprites?: typeof versionSprites): RecordType {
  return {
    cursor: id,
    data: {
      id,
      deck_id: "deck1",
      deck_code_id: "dc1",
      official_event_id: 0,
      tonamel_event_id: "",
      unofficial_event_id: "ue1",
      tags: [],
    },
    details: {
      deck: { id: "deck1", name: "ドラパルト", pokemon_sprites: deckSprites },
      matches: { total: 0, wins: 0, losses: 0, draws: 0, has_group_match: false, has_bo3: false },
      ...(deckCodeSprites
        ? { deck_code: { id: "dc1", pokemon_sprites: deckCodeSprites } }
        : {}),
    },
  } as unknown as RecordType;
}

// 記録は描画の外で作って渡す。描画のたびに作り直すと、フックが「一覧の取り直しで記録が
// 差し替わった」とみなして state を入れ直し続ける
function renderCard(recordData: RecordType) {
  return renderHook(() => useRecordCard({ recordData, eventLoading: false }));
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useRecordCard のスプライト", () => {
  it("表示中にバージョンのスプライトが変わったら、取り直さずにその場で追随する", () => {
    const { result } = renderCard(makeRecord("r1", []));

    // 未設定のバージョンはデッキのスプライト
    expect(result.current.deckSprites).toEqual(deckSprites);

    act(() => {
      notifyDeckCodeSpritesChanged({ id: "dc1", pokemon_sprites: versionSprites });
    });
    expect(result.current.deckSprites).toEqual(versionSprites);

    // 未設定に戻したらデッキのスプライトへ戻る
    act(() => {
      notifyDeckCodeSpritesChanged({ id: "dc1", pokemon_sprites: [] });
    });
    expect(result.current.deckSprites).toEqual(deckSprites);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("別のバージョンの変更では変わらない", () => {
    const { result } = renderCard(makeRecord("r1", versionSprites));

    act(() => {
      notifyDeckCodeSpritesChanged({ id: "dc2", pokemon_sprites: [{ id: "0025", position: 1 }] });
    });

    expect(result.current.deckSprites).toEqual(versionSprites);
  });

  it("一覧 API がバージョンを付けられなかったカードが並んでも、取得は1本を分け合う", async () => {
    fetchMock.mockImplementation(async (url: string) => ({
      ok: true,
      json: async () => ({ id: url.split("/").pop(), pokemon_sprites: versionSprites }),
    }));

    const first = renderCard(makeRecord("r1"));
    const second = renderCard(makeRecord("r2"));

    await waitFor(() => expect(first.result.current.deckSprites).toEqual(versionSprites));
    await waitFor(() => expect(second.result.current.deckSprites).toEqual(versionSprites));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/deckcodes/dc1");
  });
});
