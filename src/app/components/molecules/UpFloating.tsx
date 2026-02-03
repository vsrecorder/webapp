import { LuCircleArrowUp } from "react-icons/lu";

export default function UpFloating() {
  return (
    <LuCircleArrowUp
      className="lg:hidden fixed z-20 w-12 h-12 bottom-36 right-3 bg-blue-300 rounded-full cursor-pointer"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    />
  );
}
