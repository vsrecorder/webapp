import { afterEach, describe, expect, it, vi } from "vitest";

import { NextRequest } from "next/server";

/*
 * アイコン画像のアップロード(POST /api/users/{id}/images)の認可とアカウントごとの回数制限。
 * 公開ストレージへの書き込み(S3)は差し替え、送ろうとした回数だけを見る。
 */
const auth = vi.fn();
vi.mock("@app/auth", () => ({ auth: () => auth() }));

const send = vi.fn();
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class {
    send(...args: unknown[]) {
      return send(...args);
    }
  },
  PutObjectCommand: class {
    constructor(public readonly input: unknown) {}
  },
}));

const { POST } = await import("@app/api/users/[id]/images/route");

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01, 0x02]);

function upload(id: string, body: Uint8Array<ArrayBuffer> = PNG) {
  const form = new FormData();
  form.append("image", new File([body], `${id}.png`, { type: "image/png" }));

  const request = new NextRequest(`http://localhost/api/users/${id}/images`, {
    method: "POST",
    body: form,
  });

  return POST(request, { params: Promise.resolve({ id }) });
}

function signInAs(uid: string) {
  auth.mockResolvedValue({ user: { id: uid } });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/users/{id}/images", () => {
  it("未ログインは 401 で、ストレージへは書かない", async () => {
    auth.mockResolvedValue(null);

    const res = await upload("user-anon");

    expect(res.status).toBe(401);
    expect(send).not.toHaveBeenCalled();
  });

  it("他人の ID には 403 を返し、ストレージへは書かない", async () => {
    signInAs("user-a");

    const res = await upload("user-b");

    expect(res.status).toBe(403);
    expect(send).not.toHaveBeenCalled();
  });

  it("1 アカウント 1 時間 10 回までで、11 回目は 429 と Retry-After を返す", async () => {
    signInAs("user-limit");
    send.mockResolvedValue({});

    for (let i = 0; i < 10; i++) {
      const res = await upload("user-limit");
      expect(res.status).toBe(200);
    }

    const res = await upload("user-limit");

    expect(res.status).toBe(429);
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(Number(res.headers.get("Retry-After"))).toBeLessThanOrEqual(3600);
    expect(send).toHaveBeenCalledTimes(10);
  });

  it("回数は利用者ごとに数え、他人の上限には巻き込まれない", async () => {
    send.mockResolvedValue({});

    signInAs("user-heavy");
    for (let i = 0; i < 11; i++) {
      await upload("user-heavy");
    }

    signInAs("user-light");
    const res = await upload("user-light");

    expect(res.status).toBe(200);
  });

  it("他人の ID を指定した 403 は、その人の回数を減らさない", async () => {
    send.mockResolvedValue({});

    signInAs("user-attacker");
    for (let i = 0; i < 20; i++) {
      expect((await upload("user-victim")).status).toBe(403);
    }

    signInAs("user-victim");
    const res = await upload("user-victim");

    expect(res.status).toBe(200);
  });

  it("PNG でない本文は 400 で、ストレージへは書かない", async () => {
    signInAs("user-notpng");

    const res = await upload("user-notpng", new Uint8Array([0x47, 0x49, 0x46, 0x38]));

    expect(res.status).toBe(400);
    expect(send).not.toHaveBeenCalled();
  });
});
