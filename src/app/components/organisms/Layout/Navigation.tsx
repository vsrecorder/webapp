import { auth } from "@app/auth";

import DesktopNavigation from "@app/components/molecules/Navigation/DesktopNavigation";
import MobileNavigation from "@app/components/molecules/Navigation/MobileNavigation";

export default async function Navigation() {
  const session = await auth();

  if (session) {
    return (
      <>
        {/*
          選択中の項目のアイコンを塗るグラデーション(globals.css の .brand-gradient-content が
          stroke: url(#brand-stroke-gradient) で参照する)。アイコンは 24x24 の座標系なので、
          その対角線に沿って色を流す。色は CSS 変数なのでライト/ダークと dev 環境に追従する。
        */}
        <svg width="0" height="0" aria-hidden className="absolute">
          <defs>
            <linearGradient
              id="brand-stroke-gradient"
              gradientUnits="userSpaceOnUse"
              x1="0"
              y1="0"
              x2="24"
              y2="24"
            >
              <stop offset="0" style={{ stopColor: "var(--brand-text-from)" }} />
              <stop offset="0.5" style={{ stopColor: "var(--brand-text-via)" }} />
              <stop offset="1" style={{ stopColor: "var(--brand-text-to)" }} />
            </linearGradient>
          </defs>
        </svg>
        <DesktopNavigation />
        <MobileNavigation />
      </>
    );
  } else {
    return <></>;
  }
}
