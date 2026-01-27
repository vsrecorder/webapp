type Props = {
  params: Promise<{
    date: string;
  }>;
};

export default async function Page({ params }: Props) {
  const { date } = await params;

  return <div className="">日付: {date}</div>;
}
