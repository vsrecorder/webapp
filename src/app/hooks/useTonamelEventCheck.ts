"use client";

import { useEffect, useState } from "react";

import { isTonamelEventIdFormat } from "@app/utils/tonamelEvent";

/*
 * Tonamel のイベントIDが実在するかの確認。
 *
 * 入力欄の値が変わるたびに確認するが、打っている(消している)最中は待つ。以前は1文字ごとに
 * 問い合わせており、20文字を消しただけで3秒間に20回叩いていた(本番のログで実測)。
 * 手が止まってから投げれば、通常の入力では1回で済む。
 *
 * 「確認中」は無効としない。false を返すと入力欄が赤くなって「無効なイベントIDです」の行が
 * 出入りし、打っている途中に下のブロックが上下する。サーバ描画の HTML でも同じ問題が起きる。
 *
 * 結果は3通りに分ける。
 *   - 実在する        … isValid。記録を作成できるのはこのときだけ
 *   - 実在しない      … isInvalidInput。「無効なイベントIDです」
 *   - 確認できなかった … isUnavailable。通信の失敗や上流の不調で、IDの良し悪しは分からない
 * 以前は「確認できなかった」も「実在しない」と同じ扱いで、正しいIDを入れているのに
 * 「無効なイベントIDです」と出ていた(API の入れ替え中の数秒などで起きる)。
 */

// 手が止まったとみなすまでの待ち時間。打鍵の間隔より長く、待たされたと感じない程度
const CHECK_DELAY_MS = 500;

// 確認できなかったときに、入力を変えなくても自動でやり直すまでの待ち時間。
// 最初は API の入れ替え(数秒)をまたげる長さにし、失敗が続くたびに倍にして上限で止める。
// 上流が長く落ちているあいだ、開いたままの画面が叩き続けても 30 秒に 1 回で済む。
// 回数では打ち切らない(打ち切ると、復旧しても入力を変えるまで確認できないままになる)
const RETRY_DELAY_MS = 3000;
const RETRY_DELAY_MAX_MS = 30000;

export type TonamelEventCheck = {
  // 実在が確認できたか(確認中・未入力は false)
  isValid: boolean;
  // 実在しないと分かったか。入力欄を赤くする。確認中・未入力は赤くしない
  isInvalidInput: boolean;
  // 確認できなかったか(通信の失敗・上流の不調)。IDが正しいかどうかは分からない
  isUnavailable: boolean;
  title: string;
  image: string;
};

type Outcome = "found" | "notFound" | "unavailable";

type Checked = {
  eventId: string;
  outcome: Outcome;
  title: string;
  image: string;
};

// 1回問い合わせて結果を返す。例外は投げない
async function askTonamelEvent(eventId: string): Promise<Omit<Checked, "eventId">> {
  const none = { title: "", image: "" };

  try {
    const res = await fetch(`/api/tonamel_events/${encodeURIComponent(eventId)}`, {
      method: "GET",
    });

    if (res.ok) {
      const data = await res.json();
      return { outcome: "found", title: data.title, image: data.image };
    }

    // 404 は「そのIDのイベントが無い」、400 は「IDの形が違う」。どちらも打ち間違いで普通に
    // 起きるので記録しない
    if (res.status === 404 || res.status === 400) {
      return { outcome: "notFound", ...none };
    }

    console.error(`Tonamel event check failed: HTTP ${res.status}`);
    return { outcome: "unavailable", ...none };
  } catch (error) {
    // 通信できなかった場合。IDの良し悪しは判断できない
    console.error(error);
    return { outcome: "unavailable", ...none };
  }
}

export function useTonamelEventCheck(eventId: string): TonamelEventCheck {
  const [checked, setChecked] = useState<Checked | null>(null);

  // 依存は eventId だけ。入力が変わったときにだけ確認を始める
  useEffect(() => {
    if (!eventId) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    // delay 後に確認する。確認できなかったら retryDelay 後にやり直す
    const schedule = (delay: number, retryDelay: number) => {
      timer = setTimeout(async () => {
        // 形が違えば問い合わせるまでもなく無い。日本語入力の変換前の文字や、貼り間違えた
        // デッキコードがここで止まる(以前は上流まで届いて 400 になっていた)
        if (!isTonamelEventIdFormat(eventId)) {
          setChecked({ eventId, outcome: "notFound", title: "", image: "" });
          return;
        }

        const result = await askTonamelEvent(eventId);
        if (cancelled) return;

        setChecked({ eventId, ...result });

        if (result.outcome === "unavailable") {
          schedule(retryDelay, Math.min(retryDelay * 2, RETRY_DELAY_MAX_MS));
        }
      }, delay);
    };

    schedule(CHECK_DELAY_MS, RETRY_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [eventId]);

  // いま入力されているIDの結果だけを使う(前のIDの結果を出さない)
  const current = eventId && checked?.eventId === eventId ? checked : null;

  return {
    isValid: current?.outcome === "found",
    isInvalidInput: current?.outcome === "notFound",
    isUnavailable: current?.outcome === "unavailable",
    title: current?.title ?? "",
    image: current?.image ?? "",
  };
}
