import { auth } from "@app/(default)/auth";

import SignUp from "./SignUp";
import SignIn from "./SignIn";
import UserMenu from "./UserMenu";
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
          <header className="fixed z-50 top-0 left-0 lg:left-72 right-0 bg-white text-gray-700 lg:shadow-none shadow-md h-12 lg:h-16">
            <div className="flex items-center justify-between p-2 h-full">
              <div>
                <Link href="/" className="font-medium text-gray-900">
                  <div className="lg:hidden text-2xl font-bold pl-2">バトレコ β版</div>
                </Link>
              </div>

              <div className="items-end">
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
          <header className="fixed z-50 top-0 left-0 lg:left-72 right-0 bg-white text-gray-700 lg:shadow-none shadow-md h-12 lg:h-16">
            <div className="flex items-center justify-between p-2 h-full">
              <div>
                <Link href="/" className="font-medium text-gray-900">
                  <div className="lg:hidden text-2xl font-bold pl-2">バトレコ β版</div>
                </Link>
              </div>

              <div className="items-end">
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
        <header className="fixed z-50 top-0 left-0 right-0 bg-white text-gray-700 lg:shadow-none shadow-md h-12 lg:h-16">
          <div className="flex items-center justify-between p-2 h-full">
            <Link href="/" className="font-medium text-gray-900">
              <div className="text-2xl font-bold pl-2">バトレコ β版</div>
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
