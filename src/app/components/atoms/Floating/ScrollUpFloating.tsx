import { LuCircleArrowUp } from "react-icons/lu";

export default function ScrollUpFloating() {
  return (
    <LuCircleArrowUp
      className="lg:hidden fixed z-30 w-12 h-12 bottom-20 right-3 text-gray-500 bg-gray-200 border-0 rounded-full"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    />
  );
}
