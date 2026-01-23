"use client";

import { SessionProvider } from "next-auth/react";
import { HeroUIProvider } from "@heroui/react";
import { ToastProvider } from "@heroui/toast";

export default function Providers({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SessionProvider>
      <HeroUIProvider>
        <ToastProvider placement={"top-center"} />
        {children}
      </HeroUIProvider>
    </SessionProvider>
  );
}
