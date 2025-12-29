import { CgHome } from "react-icons/cg";
import { CgUser } from "react-icons/cg";
import { CgAddR } from "react-icons/cg";
import { CgFileDocument } from "react-icons/cg";
import { CgStack } from "react-icons/cg";

import Link from "next/link";

export default function MobileNavigation() {
  return (
    <nav className="fixed z-50 lg:hidden bottom-0 left-0 right-0 h-14 bg-white">
      <div className="grid grid-cols-5 gap-1 h-full items-center">
        <Link
          href={"/"}
          className="flex flex-col items-center gap-1 px-2 rounded-lg transition-colors"
        >
          <div className="text-2xl">
            <CgHome />
          </div>
          <span className="text-xs font-medium">ホーム</span>
        </Link>

        <Link
          href={"/records"}
          className="flex flex-col items-center gap-1 px-2 rounded-lg transition-colors"
        >
          <div className="text-2xl">
            <CgFileDocument />
          </div>
          <span className="text-xs font-medium">レコード</span>
        </Link>

        <Link
          href={"/records/create"}
          className="flex flex-col items-center gap-1 px-2 rounded-lg transition-colors"
        >
          <div className="text-2xl">
            <CgAddR />
          </div>
          <span className="text-xs font-medium">作成</span>
        </Link>

        <Link
          href={"/decks"}
          className="flex flex-col items-center gap-1 px-2 rounded-lg transition-colors"
        >
          <div className="text-2xl">
            <CgStack />
          </div>
          <span className="text-xs font-medium">デッキ</span>
        </Link>

        <Link
          href={"/users"}
          className="flex flex-col items-center gap-1 px-2 rounded-lg transition-colors"
        >
          <div className="text-2xl">
            <CgUser />
          </div>
          <span className="text-xs font-medium">ユーザ</span>
        </Link>
      </div>
    </nav>
  );
}
