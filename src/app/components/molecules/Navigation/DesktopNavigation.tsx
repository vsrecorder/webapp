import { CgHome } from "react-icons/cg";
import { CgUser } from "react-icons/cg";
import { CgFileDocument } from "react-icons/cg";
import { CgStack } from "react-icons/cg";

import Link from "next/link";

export default function DesktopNavigation() {
  return (
    <nav className="fixed z-50 hidden lg:flex flex-col top-0 left-0 w-72 p-4 h-screen bg-white ">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">バトレコ β版</h1>
      </div>

      <Link
        href={"/"}
        className="flex items-center gap-3 px-4 py-4 rounded-lg transition-colors lg:hover:bg-gray-300"
      >
        <div className="text-2xl">
          <CgHome />
        </div>
        <span className="text-xs font-medium lg:pl-3 lg:pt-1 lg:text-medium">ホーム</span>
      </Link>

      <Link
        href={"/users"}
        className="flex items-center gap-3 px-4 py-4 rounded-lg transition-colors lg:hover:bg-gray-300"
      >
        <div className="text-2xl">
          <CgUser />
        </div>
        <span className="text-xs font-medium lg:pl-3 lg:pt-1 lg:text-medium">ユーザ</span>
      </Link>

      <Link
        href={"/records"}
        className="flex items-center gap-3 px-4 py-4 rounded-lg transition-colors lg:hover:bg-gray-300"
      >
        <div className="text-2xl">
          <CgFileDocument />
        </div>
        <span className="text-xs font-medium lg:pl-3 lg:pt-1 lg:text-medium">
          レコード
        </span>
      </Link>

      <Link
        href={"/decks"}
        className="flex items-center gap-3 px-4 py-4 rounded-lg transition-colors lg:hover:bg-gray-300"
      >
        <div className="text-2xl">
          <CgStack />
        </div>
        <span className="text-xs font-medium lg:pl-3 lg:pt-1 lg:text-medium">デッキ</span>
      </Link>
    </nav>
  );
}
