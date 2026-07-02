import { auth } from "@app/auth";

import Providers from "@app/components/organisms/Layout/Providers";

import Header from "@app/components/organisms/Layout/Header";
import Navigation from "@app/components/organisms/Layout/Navigation";
import AddToHomeScreenBanner from "@app/components/molecules/PWA/AddToHomeScreenBanner";

export default async function TemplateLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <Providers>
      <div className="flex">
        <Navigation />

        <div className="flex flex-col flex-1">
          <Header />

          <main className={`app-dot-bg flex-1 p-2 md:px-32 lg:px-32 pt-14 lg:pt-14 lg:pb-6 min-h-svh min-w-svw max-w-svw ${session ? "pb-14" : "pb-2"}`}>
            {children}
          </main>
        </div>
      </div>

      <AddToHomeScreenBanner />
    </Providers>
  );
}
