import { auth } from "@app/auth";

import DesktopNavigation from "@app/components/molecules/Navigation/DesktopNavigation";
import MobileNavigation from "@app/components/molecules/Navigation/MobileNavigation";
import { getStatusBarColor } from "@app/utils/pwaColors";

export default async function Navigation() {
  const session = await auth();

  if (session) {
    return (
      <>
        <DesktopNavigation />
        {/* 下部ナビ最下端のセーフエリアは、上部ステータスバーと同じ色で埋める。
            色は環境依存(getStatusBarColor)で、client の MobileNavigation では
            process.env.ENV を読めないため、ここ(サーバ)で解決して渡す。 */}
        <MobileNavigation safeAreaColor={getStatusBarColor()} />
      </>
    );
  } else {
    return <></>;
  }
}
