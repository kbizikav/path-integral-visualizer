type MetricReadoutProps = {
  label: string;
  value: string;
  tone?: "phase" | "intensity" | "paths";
};

export function MetricReadout({ label, value, tone = "phase" }: MetricReadoutProps) {
  return (
    <div className={`metric metric--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
