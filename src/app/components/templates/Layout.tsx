import Providers from "@app/components/organisms/Layout/Providers";

import Header from "@app/components/organisms/Layout/Header";
import Navigation from "@app/components/organisms/Layout/Navigation";

export default function TemplateLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Providers>
      <div className="flex">
        <Navigation />

        <div className="flex flex-col flex-1">
          <Header />

          <main
            className="app-dot-bg flex-1 p-2 pt-14 pb-16 lg:pt-16 lg:pb-6 min-h-svh min-w-svw max-w-svw"
          >
            {children}
          </main>
        </div>
      </div>
    </Providers>
  );
}
