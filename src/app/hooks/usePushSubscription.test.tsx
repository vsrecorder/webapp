// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { usePushSubscription } from "@app/hooks/usePushSubscription";

// 実装と同じキー。再同期の日付であると同時に「自分でオフにしていない」印も兼ねる
const RESYNC_KEY = "vsrec:push:resynced-on";

// base64url であればよい(urlBase64ToUint8Array が atob で復号できる形)
const VAPID_KEY =
  "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";

const UA_ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

function makeSubscription(endpoint: string): PushSubscription {
  return {
    endpoint,
    toJSON: () => ({ endpoint, keys: { p256dh: "p256dh-value", auth: "auth-value" } }),
    unsubscribe: vi.fn().mockResolvedValue(true),
  } as unknown as PushSubscription;
}

// SW・PushManager・Notification の最小モック。
// 見たいのは「getSubscription が null を返したときに subscribe を呼ぶかどうか」だけ。
function stubPushEnvironment(options: {
  existing: PushSubscription | null;
  permission: NotificationPermission;
  // /api/users/push/subscribe が返す was_revoked(サーバ側で失効扱いだったか)
  wasRevoked?: boolean;
}) {
  const subscribe = vi.fn().mockResolvedValue(makeSubscription("https://push.example/new"));
  const registration = {
    pushManager: {
      getSubscription: vi.fn().mockResolvedValue(options.existing),
      subscribe,
    },
  };

  Object.defineProperty(navigator, "serviceWorker", {
    value: { ready: Promise.resolve(registration) },
    configurable: true,
  });
  vi.stubGlobal("PushManager", class {});
  vi.stubGlobal("Notification", { permission: options.permission });

  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ was_revoked: options.wasRevoked ?? false }),
  });
  vi.stubGlobal("fetch", fetchMock);

  const unsubscribe = options.existing
    ? (options.existing.unsubscribe as ReturnType<typeof vi.fn>)
    : vi.fn();

  return { subscribe, fetchMock, unsubscribe };
}

function subscribeCalls(fetchMock: ReturnType<typeof vi.fn>): unknown[][] {
  return fetchMock.mock.calls.filter((call) => call[0] === "/api/users/push/subscribe");
}

beforeEach(() => {
  localStorage.clear();
  vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", VAPID_KEY);
  Object.defineProperty(navigator, "userAgent", { value: UA_ANDROID, configurable: true });
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("usePushSubscription の購読の自動復旧", () => {
  it("許諾済みなのに購読が消えていたら、作り直してサーバへ登録する", async () => {
    // 昨日まで購読していた端末。日付が残っている = 自分でオフにしたわけではない
    localStorage.setItem(RESYNC_KEY, "2020-01-01");
    const { subscribe, fetchMock } = stubPushEnvironment({
      existing: null,
      permission: "granted",
    });

    const { result } = renderHook(() => usePushSubscription());
    await waitFor(() => expect(result.current.ready).toBe(true));

    expect(subscribe).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current.subscribed).toBe(true));
    // 作り直した購読は endpoint が変わっているので、日次の間引きに関係なく送る
    expect(subscribeCalls(fetchMock)).toHaveLength(1);
  });

  it("自分でオフにした端末(印が消えている)では作り直さない", async () => {
    const { subscribe, fetchMock } = stubPushEnvironment({
      existing: null,
      permission: "granted",
    });

    const { result } = renderHook(() => usePushSubscription());
    await waitFor(() => expect(result.current.ready).toBe(true));

    expect(subscribe).not.toHaveBeenCalled();
    expect(result.current.subscribed).toBe(false);
    expect(subscribeCalls(fetchMock)).toHaveLength(0);
  });

  it("許諾されていなければ作り直さない", async () => {
    localStorage.setItem(RESYNC_KEY, "2020-01-01");
    const { subscribe } = stubPushEnvironment({ existing: null, permission: "default" });

    const { result } = renderHook(() => usePushSubscription());
    await waitFor(() => expect(result.current.ready).toBe(true));

    expect(subscribe).not.toHaveBeenCalled();
    expect(result.current.subscribed).toBe(false);
  });

  // サーバ側が失効させた購読は、登録し直して revoked_at が消えても endpoint 自体は
  // 死んでいることが多い。端末には購読オブジェクトが残るため端末だけでは気付けず、
  // 放っておくと「設定上はオンなのに一通も届かない」状態が続く
  it("サーバ側で失効していたと返されたら、購読を作り直して登録し直す", async () => {
    localStorage.setItem(RESYNC_KEY, "2020-01-01");
    const existing = makeSubscription("https://push.example/revoked");
    const { subscribe, fetchMock, unsubscribe } = stubPushEnvironment({
      existing,
      permission: "granted",
      wasRevoked: true,
    });

    const { result } = renderHook(() => usePushSubscription());
    await waitFor(() => expect(result.current.ready).toBe(true));

    // 死んだ購読を捨ててから作り直す
    await waitFor(() => expect(subscribe).toHaveBeenCalledTimes(1));
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    // 1回目は失効していた購読、2回目は作り直した購読
    await waitFor(() => expect(subscribeCalls(fetchMock)).toHaveLength(2));
    expect(result.current.subscribed).toBe(true);
  });

  it("失効していなければ作り直さない", async () => {
    localStorage.setItem(RESYNC_KEY, "2020-01-01");
    const existing = makeSubscription("https://push.example/alive");
    const { subscribe, unsubscribe, fetchMock } = stubPushEnvironment({
      existing,
      permission: "granted",
      wasRevoked: false,
    });

    const { result } = renderHook(() => usePushSubscription());
    await waitFor(() => expect(result.current.ready).toBe(true));
    await waitFor(() => expect(subscribeCalls(fetchMock)).toHaveLength(1));

    expect(subscribe).not.toHaveBeenCalled();
    expect(unsubscribe).not.toHaveBeenCalled();
    expect(result.current.subscribed).toBe(true);
  });

  it("購読が生きているときは作り直さず、日次の再同期だけを行う", async () => {
    localStorage.setItem(RESYNC_KEY, "2020-01-01");
    const { subscribe, fetchMock } = stubPushEnvironment({
      existing: makeSubscription("https://push.example/existing"),
      permission: "granted",
    });

    const { result } = renderHook(() => usePushSubscription());
    await waitFor(() => expect(result.current.ready).toBe(true));

    expect(result.current.subscribed).toBe(true);
    expect(subscribe).not.toHaveBeenCalled();
    await waitFor(() => expect(subscribeCalls(fetchMock)).toHaveLength(1));
    // 送れたら当日として記録し、次の表示では送らない
    expect(localStorage.getItem(RESYNC_KEY)).not.toBe("2020-01-01");
  });
});
