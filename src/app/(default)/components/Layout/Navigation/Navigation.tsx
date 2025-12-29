import { auth } from "@app/(default)/auth";

import DesktopNavigation from "./DesktopNavigation";
import MobileNavigation from "./MobileNavigation";

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
