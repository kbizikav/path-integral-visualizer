import type { CSSProperties, ChangeEvent } from "react";

type SliderControlProps = {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  precision?: number;
  onChange: (value: number) => void;
};

export function SliderControl({
  id,
  label,
  value,
  min,
  max,
  step,
  unit = "",
  precision = 2,
  onChange,
}: SliderControlProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onChange(Number(event.target.value));
  };
  const valuePercent = ((value - min) / (max - min)) * 100;

  return (
    <label className="slider-control" htmlFor={id}>
      <span className="slider-control__header">
        <span>{label}</span>
        <output htmlFor={id}>
          {value.toFixed(precision)}
          {unit}
        </output>
      </span>
      <input
        id={id}
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        style={{ "--value-percent": `${valuePercent}%` } as CSSProperties}
        onChange={handleChange}
      />
    </label>
  );
}
