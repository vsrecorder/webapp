import { auth } from "@app/auth";

import DesktopNavigation from "@app/components/molecules/Navigation/DesktopNavigation";
import MobileNavigation from "@app/components/molecules/Navigation/MobileNavigation";

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
