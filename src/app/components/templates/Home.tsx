import CityleagueEvents from "@app/components/organisms/Cityleague/CityleagueEvents";

export default function TemplateHome() {
  return (
    <>
      <div className="flex flex-col items-center justify-center gap-5 w-full">
        <div className="text-2xl font-bold">バトレコ β版</div>
        <div className="flex flex-col gap-3 w-full">
          <div className="pb-0 flex flex-col items-center justify-center gap-0">
            <div className="font-bold underline">本日のシティリーグ</div>
          </div>
          <CityleagueEvents />
        </div>
      </div>
    </>
  );
}
