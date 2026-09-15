"use client";

import { useEffect, useState } from "react";

/*
 * Tonamel のイベントIDが実在するかの確認。
 *
 * 入力欄の値が変わるたびに確認するが、打っている(消している)最中は待つ。以前は1文字ごとに
 * 問い合わせており、20文字を消しただけで3秒間に20回叩いていた(本番のログで実測)。
 * 手が止まってから投げれば、通常の入力では1回で済む。
 *
 * 「確認中」は無効としない。false を返すと入力欄が赤くなって「無効なイベントIDです」の行が
 * 出入りし、打っている途中に下のブロックが上下する。サーバ描画の HTML でも同じ問題が起きる。
 */

// 手が止まったとみなすまでの待ち時間。打鍵の間隔より長く、待たされたと感じない程度
const CHECK_DELAY_MS = 500;

export type TonamelEventCheck = {
  // 実在が確認できたか(確認中・未入力は false)
  isValid: boolean;
  // 入力欄を赤くするか。確認中・未入力は赤くしない
  isInvalidInput: boolean;
  title: string;
  image: string;
};

type Checked = {
  eventId: string;
  valid: boolean;
  title: string;
  image: string;
};

export function useTonamelEventCheck(eventId: string): TonamelEventCheck {
  const [checked, setChecked] = useState<Checked | null>(null);

  // 依存は eventId だけ。入力が変わったときにだけ1回投げる
  useEffect(() => {
    if (!eventId) return;

    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/tonamel_events/${encodeURIComponent(eventId)}`, {
          method: "GET",
        });
        if (cancelled) return;

        if (res.ok) {
          const data = await res.json();
          if (cancelled) return;
          setChecked({ eventId, valid: true, title: data.title, image: data.image });
          return;
        }

        // 404 は「そのIDのイベントが無い」。打ち間違いで普通に起きるので記録しない
        if (res.status !== 404) {
          console.error(`Tonamel event check failed: HTTP ${res.status}`);
        }

        setChecked({ eventId, valid: false, title: "", image: "" });
      } catch (error) {
        // 通信できなかった場合。IDの良し悪しは判断できないので無効扱いにする
        console.error(error);
        if (cancelled) return;
        setChecked({ eventId, valid: false, title: "", image: "" });
      }
    }, CHECK_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [eventId]);

  // いま入力されているIDの結果だけを使う(前のIDの結果を出さない)
  const current = eventId && checked?.eventId === eventId ? checked : null;

  return {
    isValid: current?.valid === true,
    isInvalidInput: current ? !current.valid : false,
    title: current?.title ?? "",
    image: current?.image ?? "",
  };
}
