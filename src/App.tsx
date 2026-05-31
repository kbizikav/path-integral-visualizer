import { Pause, Play, RotateCcw } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { FormulaNote } from "./components/FormulaNote";
import { PathIntegralCanvas } from "./components/PathIntegralCanvas";
import { PhaseLegend } from "./components/PhaseLegend";
import { SliderControl } from "./components/SliderControl";
import { DEFAULT_PARAMS, PARAM_LIMITS } from "./simulation/constants";
import { sumPathAmplitudes } from "./simulation/intensity";
import { addPathToPhaseState, createEmptyPhaseState } from "./simulation/phaseAccumulation";
import { generatePathSamples } from "./simulation/paths";
import type { AccumulatedPhaseState, PathSample, SimulationParams } from "./simulation/types";
import "katex/dist/katex.min.css";

function App() {
  const [params, setParams] = useState<SimulationParams>(DEFAULT_PARAMS);
  const [isPlaying, setIsPlaying] = useState(true);
  const [resetSignal, setResetSignal] = useState(0);
  const [phaseState, setPhaseState] = useState<AccumulatedPhaseState>(() =>
    createEmptyPhaseState(),
  );

  const paths = useMemo(() => generatePathSamples(params), [params]);
  const pathSum = useMemo(() => sumPathAmplitudes(paths), [paths]);

  const updateParam = <Key extends keyof SimulationParams>(
    key: Key,
    value: SimulationParams[Key],
  ): void => {
    setParams((current) => ({ ...current, [key]: value }));

    if (key !== "animationSpeed") {
      setPhaseState(createEmptyPhaseState());
    }
  };

  const resetAnimation = (): void => {
    setResetSignal((current) => current + 1);
    setPhaseState(createEmptyPhaseState());
    setIsPlaying(true);
  };

  const recordArrivedPath = useCallback((path: PathSample): void => {
    setPhaseState((current) => addPathToPhaseState(current, path));
  }, []);

  return (
    <main className="app-shell">
      <section className="workspace" aria-labelledby="app-title">
        <div className="workspace__header">
          <div>
            <p className="eyebrow">Double slit / Path integral</p>
            <h1 id="app-title">Path Integral Visualizer</h1>
          </div>
          <div className="transport-controls" aria-label="Animation controls">
            <button
              type="button"
              className="icon-button"
              onClick={() => setIsPlaying((current) => !current)}
              aria-label={isPlaying ? "Pause" : "Play"}
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={resetAnimation}
              aria-label="Reset"
              title="Reset"
            >
              <RotateCcw size={18} />
            </button>
          </div>
        </div>

        <div className="content-grid">
          <PathIntegralCanvas
            params={params}
            paths={paths}
            pathSum={pathSum}
            phaseState={phaseState}
            isPlaying={isPlaying}
            resetSignal={resetSignal}
            onDetectorYChange={(detectorY) => updateParam("detectorY", detectorY)}
            onPathArrived={recordArrivedPath}
          />

          <aside className="control-panel" aria-label="Simulation settings">
            <div className="control-stack">
              <SliderControl
                id="detector-y"
                label="Detector point"
                value={params.detectorY}
                min={PARAM_LIMITS.detectorY.min}
                max={PARAM_LIMITS.detectorY.max}
                step={PARAM_LIMITS.detectorY.step}
                onChange={(value) => updateParam("detectorY", value)}
              />
              <SliderControl
                id="slit-separation"
                label="Slit separation"
                value={params.slitSeparation}
                min={PARAM_LIMITS.slitSeparation.min}
                max={PARAM_LIMITS.slitSeparation.max}
                step={PARAM_LIMITS.slitSeparation.step}
                onChange={(value) => updateParam("slitSeparation", value)}
              />
              <SliderControl
                id="reduced-planck"
                label="ℏ scale"
                value={params.reducedPlanck}
                min={PARAM_LIMITS.reducedPlanck.min}
                max={PARAM_LIMITS.reducedPlanck.max}
                step={PARAM_LIMITS.reducedPlanck.step}
                precision={3}
                onChange={(value) => updateParam("reducedPlanck", value)}
              />
              <SliderControl
                id="path-count"
                label="Path samples"
                value={params.pathCount}
                min={PARAM_LIMITS.pathCount.min}
                max={PARAM_LIMITS.pathCount.max}
                step={PARAM_LIMITS.pathCount.step}
                precision={0}
                onChange={(value) => updateParam("pathCount", value)}
              />
              <SliderControl
                id="animation-speed"
                label="Speed"
                value={params.animationSpeed}
                min={PARAM_LIMITS.animationSpeed.min}
                max={PARAM_LIMITS.animationSpeed.max}
                step={PARAM_LIMITS.animationSpeed.step}
                unit="x"
                onChange={(value) => updateParam("animationSpeed", value)}
              />
            </div>

            <PhaseLegend />

            <FormulaNote />
          </aside>
        </div>
      </section>
    </main>
  );
}

export default App;
