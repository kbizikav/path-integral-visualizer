export function PhaseLegend() {
  return (
    <div className="phase-legend" aria-label="Phase color legend">
      <div className="phase-legend__bar" />
      <div className="phase-legend__labels">
        <span>Phase 0</span>
        <span>π</span>
        <span>2π</span>
      </div>
    </div>
  );
}
