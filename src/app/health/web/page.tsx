import type { Metadata } from "next";

// webapp が応答できるかだけを確かめるページ。docker の healthcheck(docker-compose.yml)が叩く。
//
// 外形監視の口(/health。web → core-apiserver → DB までたどる)とは役割が違う。
// healthcheck に DB の状態まで混ぜると、DB の不調で `docker compose up --wait` が終わらず、
// コンテナは正常なのにデプロイが止まるため、ここは上流を呼ばない。
//
// Route Handler ではなくページにしているのは、共通レイアウトの中で描かせるため。
// 「レイアウトが壊れて全ページが 500」も unhealthy として拾える(docker-compose.yml の説明)。
//
// 以前は /health がこのページだった(2026-11-10 に /health を外形監視用に作り替えて移した)。

// 死活監視用のエンドポイントなので、検索結果に出さない。
export const metadata: Metadata = {
  title: "health",
  robots: {
    index: false,
    follow: false,
  },
};

export default function Page() {
  return <>health</>;
}
