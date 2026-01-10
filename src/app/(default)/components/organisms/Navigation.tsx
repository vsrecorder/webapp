import { auth } from "@app/(default)/auth";

import DesktopNavigation from "../molecules/Navigation/DesktopNavigation";
import MobileNavigation from "../molecules/Navigation/MobileNavigation";

export default async function Navigation() {
  const session = await auth();

  if (session) {
    return (
      <>
        <DesktopNavigation />
        <MobileNavigation />
      </>
    );
  } else {
    return <></>;
  }
}
