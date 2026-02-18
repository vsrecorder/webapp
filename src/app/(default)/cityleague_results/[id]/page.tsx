import TemplateCityleagueResultByOfficialEventId from "@app/components/templates/CityleagueResultByOfficialEventId";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function Page({ params }: Props) {
  const { id } = await params;

  return <TemplateCityleagueResultByOfficialEventId id={Number(id)} />;
}
