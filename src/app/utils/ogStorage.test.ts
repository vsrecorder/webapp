import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * OGP画像の用意を、ページの描画が待たされない形に保つためのテスト。
 *
 * ここで待つと、そのページの初回描画がオブジェクトストレージへの往復ぶん遅くなる。
 * 存在を覚えている ensuredKeys はプロセスが再起動すると空になるため、
 * シティリーグ個別ページ(7,802件)はデプロイのたびに、各ページの初回アクセスで1往復していた
 * (本番実測: キャッシュが温まった状態の TTFB 0.11〜0.15秒に対し、初回 0.25〜1.02秒)。
 */

// vi.mock のファクトリはファイル先頭へ巻き上げられるため、そこから参照する値も
// vi.hoisted で一緒に巻き上げる
const { send } = vi.hoisted(() => ({ send: vi.fn() }));

class FakeNotFound extends Error {
  constructor() {
    super("not found");
    // ogStorage の isNotFoundError は name でも判定する
    this.name = "NotFound";
  }
}

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class {
    send = send;
  },
  HeadObjectCommand: class {
    constructor(readonly input: unknown) {}
  },
  PutObjectCommand: class {
    constructor(readonly input: unknown) {}
  },
  NotFound: class extends Error {},
}));

// 実体の読み書き先はモジュールの読み込み時に固まるので、import より先に入れる
process.env.SAKURA_OBJECTSTORAGE_CDN_URL = "https://cdn.test";
process.env.SAKURA_OBJECTSTORAGE_BUCKET_NAME = "test-bucket";

async function loadModule() {
  vi.resetModules();

  return await import("@app/utils/ogStorage");
}

// マイクロタスクとタイマーを1周させ、裏で始まった処理をそこまで進める
async function flush() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("ogImageUrlFor", () => {
  beforeEach(() => {
    send.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("オブジェクトストレージの応答を待たずにURLを返す", async () => {
    const { ogImageUrlFor } = await loadModule();
    // 解決しない送信。待っていたらここで止まる
    send.mockImplementation(() => new Promise(() => {}));
    const render = vi.fn(async () => Buffer.from("png"));

    const url = ogImageUrlFor("cityleague_results/952758", render);

    expect(url).toBe("https://cdn.test/images/ogp/cityleague_results/952758-v2.png");
  });

  it("画像の描画(satori)は呼び出しの中では走らせない", async () => {
    const { ogImageUrlFor } = await loadModule();
    send.mockImplementation(() => new Promise(() => {}));
    const render = vi.fn(async () => Buffer.from("png"));

    ogImageUrlFor("cityleague_results/952758", render);

    // 存在確認が終わるまで描画には進まない(=描画の経路からは切り離されている)
    expect(render).not.toHaveBeenCalled();
  });

  it("同じ画像に続けてアクセスしても、確認は1回しか走らせない", async () => {
    const { ogImageUrlFor } = await loadModule();
    send.mockImplementation(() => new Promise(() => {}));
    const render = vi.fn(async () => Buffer.from("png"));

    ogImageUrlFor("cityleague_results/952758", render);
    ogImageUrlFor("cityleague_results/952758", render);
    ogImageUrlFor("cityleague_results/952758", render);
    await flush();

    expect(send).toHaveBeenCalledTimes(1);
  });

  it("実体が無ければ、裏で生成してアップロードする", async () => {
    const { ogImageUrlFor } = await loadModule();
    send
      .mockRejectedValueOnce(new FakeNotFound()) // HeadObject: 無い
      .mockResolvedValueOnce({}); // PutObject: 置けた
    const render = vi.fn(async () => Buffer.from("png"));

    ogImageUrlFor("cityleague_results/952758", render);
    await flush();

    expect(render).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("裏の処理が失敗しても、URLは返るし例外も漏らさない", async () => {
    const { ogImageUrlFor } = await loadModule();
    send.mockRejectedValue(new Error("network unreachable"));
    const render = vi.fn(async () => Buffer.from("png"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const url = ogImageUrlFor("cityleague_results/952758", render);
    await flush();

    expect(url).toBe("https://cdn.test/images/ogp/cityleague_results/952758-v2.png");
    expect(consoleError).toHaveBeenCalled();
  });

  it("一度確認できた画像は、次からは確認しに行かない", async () => {
    const { ogImageUrlFor } = await loadModule();
    send.mockResolvedValue({}); // HeadObject: ある
    const render = vi.fn(async () => Buffer.from("png"));

    ogImageUrlFor("cityleague_results/952758", render);
    await flush();
    ogImageUrlFor("cityleague_results/952758", render);
    await flush();

    expect(send).toHaveBeenCalledTimes(1);
  });

  describe("描画関数が「まだ描けない」(null)と答えたとき", () => {
    const MINUTE = 60 * 1000;

    it("置かず、失敗のログも出さない", async () => {
      const { ogImageUrlFor } = await loadModule();
      send.mockRejectedValue(new FakeNotFound()); // HeadObject: 無い
      const render = vi.fn(async () => null);
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

      ogImageUrlFor("cityleague_results/dates/2026-09-28-n2-r2", render);
      await flush();

      expect(render).toHaveBeenCalledWith({ giveUp: false });
      // HeadObject の 1 回だけで、PutObject は送らない
      expect(send).toHaveBeenCalledTimes(1);
      expect(consoleError).not.toHaveBeenCalled();
    });

    it("数分おいてから描き直し、置けたら次からは確認しない", async () => {
      const { ogImageUrlFor } = await loadModule();
      const now = vi.spyOn(Date, "now").mockReturnValue(0);
      send.mockImplementation(async (command: { input: unknown }) => {
        // HeadObject は無い、PutObject は置けた
        if ((command.input as { Body?: unknown }).Body === undefined) throw new FakeNotFound();
        return {};
      });
      const render = vi
        .fn<(options: { giveUp: boolean }) => Promise<Buffer | null>>()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(Buffer.from("png"));
      const name = "cityleague_results/dates/2026-09-28-n2-r2";

      ogImageUrlFor(name, render);
      await flush();
      // すぐに開き直しても描き直さない
      now.mockReturnValue(1 * MINUTE);
      ogImageUrlFor(name, render);
      await flush();
      expect(render).toHaveBeenCalledTimes(1);

      now.mockReturnValue(6 * MINUTE);
      ogImageUrlFor(name, render);
      await flush();
      expect(render).toHaveBeenCalledTimes(2);
      expect(render).toHaveBeenLastCalledWith({ giveUp: false });

      const sent = send.mock.calls.length;
      ogImageUrlFor(name, render);
      await flush();
      expect(send.mock.calls.length).toBe(sent);
    });

    it("最初に断られてから 3 時間を過ぎたら giveUp で描かせる", async () => {
      const { ogImageUrlFor } = await loadModule();
      const now = vi.spyOn(Date, "now").mockReturnValue(0);
      send.mockRejectedValueOnce(new FakeNotFound());
      const render = vi.fn(async ({ giveUp }: { giveUp: boolean }) =>
        giveUp ? Buffer.from("png") : null,
      );
      const name = "cityleague_results/dates/2026-09-28-n2-r2";

      ogImageUrlFor(name, render);
      await flush();

      // 3 時間に満たないうちは待たせる
      now.mockReturnValue(170 * MINUTE);
      send.mockRejectedValueOnce(new FakeNotFound());
      ogImageUrlFor(name, render);
      await flush();
      expect(render).toHaveBeenLastCalledWith({ giveUp: false });

      now.mockReturnValue(181 * MINUTE);
      send.mockRejectedValueOnce(new FakeNotFound()).mockResolvedValueOnce({});
      ogImageUrlFor(name, render);
      await flush();
      expect(render).toHaveBeenLastCalledWith({ giveUp: true });
      // 最後は PutObject まで送る
      expect(send).toHaveBeenCalledTimes(4);
    });
  });
});
