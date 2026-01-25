import Deck from "@app/components/templates/Deck";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function Page({ params }: Props) {
  const { id } = await params;

  return <Deck id={id} />;
}
