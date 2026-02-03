import { LuCirclePlus } from "react-icons/lu";

export default function PlusFloating() {
  return (
    <LuCirclePlus
      className="lg:hidden fixed z-30 w-12 h-12 bottom-36 right-3 text-gray-500 bg-gray-200 border-0 rounded-full"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    />
  );
}
