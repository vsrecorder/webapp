import Providers from "@app/components/organisms/Providers";

import Header from "@app/components/organisms/Header";
import Navigation from "@app/components/organisms/Navigation";

export default function TemplateLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="overflow-x-hidden">
        <Providers>
          <div className="flex">
            <Navigation />

            <div className="flex flex-col flex-1 lg:ml-72">
              <Header />

              <main
                style={{
                  backgroundImage: "radial-gradient(#dee5ea 1.2px, transparent 1.2px)",
                  backgroundSize: "24px 24px",
                  //backgroundColor: "#f5fbff",
                  //backgroundColor: "#f5faff",
                  //backgroundColor: "#f7fbff",
                  backgroundColor: "#fafcff",
                }}
                className="flex-1 p-2 pt-14 pb-16 lg:pt-16 lg:pb-6 min-h-svh min-w-svw max-w-svw"
              >
                {children}
              </main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
