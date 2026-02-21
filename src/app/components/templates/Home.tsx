import Image from "next/image";

import CityleagueEvents from "@app/components/organisms/Cityleague/CityleagueEvents";

export default function TemplateHome() {
  return (
    <div className="flex flex-col gap-6">
      <div className="pt-6 flex flex-col items-center justify-center gap-4.5 w-full">
        <div className="w-24 h-24 relative">
          <Image
            alt="バトレコ"
            src="https://xx8nnpgt.user.webaccel.jp/images/icons/logo.png"
            fill
            className="object-contain"
            sizes="96px"
            priority
          />
        </div>

        <span className="text-3xl font-bold">バトレコ</span>

        <div className="flex flex-col justify-center gap-0.5">
          <span className="text-tiny">友達との　勝負や</span>
          <span className="text-tiny">特殊な　施設での　勝負を</span>
          <span className="text-tiny">記録できる　かっこいい　アプリ。</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 w-full">
        <div className="pb-0 flex flex-col items-center justify-center gap-0">
          <div className="font-bold underline">本日のシティリーグ</div>
        </div>
        <CityleagueEvents />
      </div>
    </div>
  );
}
