import { auth } from "@app/auth";

import Image from "next/image";

import SignUp from "./SignUp";
import SignIn from "./SignIn";
import UserMenu from "./UserMenu";
import ThemeSwitcher from "@app/components/molecules/Theme/ThemeSwitcher";
import { UserType } from "@app/types/user";

import Link from "next/link";

async function fetchUser(id: string) {
  const domain = process.env.VSRECORDER_DOMAIN;

  try {
    const res = await fetch(`https://${domain}/api/v1beta/users/${id}`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    const ret: UserType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

export default async function Header() {
  const session = await auth();

  if (session) {
    // TODO: エラー処理
    try {
      const user: UserType = await fetchUser(session.user.id);

      return (
        <>
          <header className="fixed z-50 top-0 left-0 right-0 bg-white text-gray-700 shadow-md h-14 lg:h-14 dark:bg-neutral-900 dark:text-default-300 dark:shadow-none dark:border-b dark:border-neutral-800">
            <div className="flex items-center justify-between p-2 h-full">
              <div>
                <Link href="/" className="font-medium text-gray-900 dark:text-gray-100">
                  <div className="w-11 h-11 relative shrink-0">
                    <Image
                      src="/images/icon.png"
                      alt="バトレコ"
                      fill
                      sizes="32px"
                      className="object-contain rounded-lg"
                    />
                  </div>
                </Link>
              </div>

              <div className="flex items-center">
                <div className="mx-1">
                  <ThemeSwitcher />
                </div>
                <div className="mx-1">
                  <UserMenu user={user} />
                </div>
              </div>
            </div>
          </header>
        </>
      );
    } catch (error) {
      console.log(error);

      return (
        <>
          <header className="fixed z-50 top-0 left-0 right-0 bg-white text-gray-700 shadow-md h-14 lg:h-14 dark:bg-neutral-900 dark:text-default-300 dark:shadow-none dark:border-b dark:border-neutral-800">
            <div className="flex items-center justify-between p-2 h-full">
              <div>
                <Link href="/" className="font-medium text-gray-900 dark:text-gray-100">
                  <div className="w-11 h-11 relative shrink-0">
                    <Image
                      src="/images/icon.png"
                      alt="バトレコ"
                      fill
                      sizes="32px"
                      className="object-contain rounded-lg"
                    />
                  </div>
                </Link>
              </div>

              <div className="flex items-center">
                <div className="mx-1">
                  <ThemeSwitcher />
                </div>
                <div className="mx-1">エラー</div>
              </div>
            </div>
          </header>
        </>
      );
    }
  } else {
    return (
      <>
        <header className="fixed z-50 top-0 left-0 right-0 bg-white text-gray-700 shadow-md h-14 lg:h-14 dark:bg-neutral-900 dark:text-default-300 dark:shadow-none dark:border-b dark:border-neutral-800">
          <div className="flex items-center justify-between p-2 h-full">
            <Link href="/" className="font-medium text-gray-900 dark:text-gray-100">
              <div className="w-11 h-11 relative shrink-0">
                <Image
                  src="/images/icon.png"
                  alt="バトレコ"
                  fill
                  sizes="32px"
                  className="object-contain rounded-lg"
                />
              </div>
            </Link>

            <div className="flex items-center">
              <div className="mx-1">
                <SignUp />
              </div>
              <div className="mx-1">
                <SignIn />
              </div>
            </div>
          </div>
        </header>
      </>
    );
  }
}
