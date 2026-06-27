"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type UserAvatarContextType = {
  avatarUrl: string | null;
  setAvatarUrl: (url: string) => void;
};

const UserAvatarContext = createContext<UserAvatarContextType>({
  avatarUrl: null,
  setAvatarUrl: () => {},
});

export function UserAvatarProvider({ children }: { children: ReactNode }) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  return (
    <UserAvatarContext.Provider value={{ avatarUrl, setAvatarUrl }}>
      {children}
    </UserAvatarContext.Provider>
  );
}

export function useUserAvatar() {
  return useContext(UserAvatarContext);
}
