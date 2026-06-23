type StatsCounterProps = {
  value: number;
};

export default function StatsCounter({ value }: StatsCounterProps) {
  return <span>{value.toLocaleString("ja-JP")}</span>;
}
