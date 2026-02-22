import TemplateRecordById from "@app/components/templates/RecordById";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function Page({ params }: Props) {
  const { id } = await params;

  return <TemplateRecordById id={id} />;
}
