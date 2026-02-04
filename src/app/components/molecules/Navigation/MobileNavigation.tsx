import { LuHouse } from "react-icons/lu";
import { LuFileText } from "react-icons/lu";
import { LuSquarePen } from "react-icons/lu";
import { LuLayers } from "react-icons/lu";
import { LuTrophy } from "react-icons/lu";

import Link from "next/link";

export default function MobileNavigation() {
  return (
    <nav className="fixed z-50 lg:hidden bottom-0 left-0 right-0 h-15 bg-white">
      <div className="grid grid-cols-5 gap-1 pb-3 h-full items-center">
        <Link
          href={"/"}
          //className="flex flex-col items-center gap-1 px-2 rounded-lg transition-colors"
          className="flex flex-col items-center gap-1 px-2 rounded-lg transition-all duration-150 active:scale-60"
        >
          <div className="text-2xl">
            <LuHouse />
          </div>
        </Link>

        <Link
          href={"/records"}
          className="flex flex-col items-center gap-1 px-2 rounded-lg transition-all duration-150 active:scale-60"
        >
          <div className="text-2xl">
            <LuFileText />
          </div>
        </Link>

        <Link
          href={"/records/create"}
          className="flex flex-col items-center gap-1 px-2 rounded-lg transition-all duration-150 active:scale-60"
        >
          <div className="text-2xl">
            <LuSquarePen />
          </div>
        </Link>

        <Link
          href={"/decks"}
          className="flex flex-col items-center gap-1 px-2 rounded-lg transition-all duration-150 active:scale-60"
        >
          <div className="text-2xl">
            <LuLayers />
          </div>
        </Link>

        <Link
          href={"/cityleague_results"}
          className="flex flex-col items-center gap-1 px-2 rounded-lg transition-all duration-150 active:scale-50"
        >
          <div className="text-2xl">
            <LuTrophy />
          </div>
        </Link>
      </div>
    </nav>
  );
}
