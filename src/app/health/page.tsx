import type { Metadata } from "next";

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
