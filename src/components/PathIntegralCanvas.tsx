import { useEffect, useRef } from "react";
import type { PointerEvent } from "react";
import { calculateAccumulatedAction, calculateFreeParticleAction } from "../simulation/action";
import { GEOMETRY, SLIT_APERTURE_WIDTH, TRAVERSAL_TIME } from "../simulation/constants";
import { clamp, phaseToHue } from "../simulation/math";
import type {
  AccumulatedPhaseState,
  PathSample,
  PathSumResult,
  SimulationParams,
} from "../simulation/types";

type PathIntegralCanvasProps = {
  params: SimulationParams;
  paths: PathSample[];
  pathSum: PathSumResult;
  phaseState: AccumulatedPhaseState;
  isPlaying: boolean;
  resetSignal: number;
  onDetectorYChange: (detectorY: number) => void;
  onPathArrived: (path: PathSample) => void;
};

type CanvasSize = {
  width: number;
  height: number;
};

type Point = {
  x: number;
  y: number;
};

const WORLD_Y_PADDING = 0.12;
const PHASE_SEGMENTS_PER_LEG = 26;
const PARTICLE_RADIUS = 6;

export function PathIntegralCanvas({
  params,
  paths,
  pathSum,
  phaseState,
  isPlaying,
  resetSignal,
  onDetectorYChange,
  onPathArrived,
}: PathIntegralCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sizeRef = useRef<CanvasSize>({ width: 0, height: 0 });
  const animationProgressRef = useRef(0);
  const activePathIndexRef = useRef(0);
  const lastFrameRef = useRef<number | null>(null);

  useEffect(() => {
    animationProgressRef.current = 0;
    activePathIndexRef.current = selectRandomPathIndex(paths.length);
    lastFrameRef.current = null;
  }, [
    resetSignal,
    params.slitSeparation,
    params.mass,
    params.reducedPlanck,
    params.pathCount,
    paths.length,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    const resizeCanvas = (): void => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      sizeRef.current = { width: rect.width, height: rect.height };
    };

    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas);
    resizeCanvas();

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return undefined;
    }

    let frameId = 0;

    const drawFrame = (timestamp: number): void => {
      const lastFrame = lastFrameRef.current ?? timestamp;
      const deltaSeconds = Math.min((timestamp - lastFrame) / 1000, 0.05);
      lastFrameRef.current = timestamp;

      if (isPlaying) {
        const nextProgress =
          animationProgressRef.current + deltaSeconds * params.animationSpeed * 0.55;

        if (nextProgress >= 1) {
          const completedPath = paths[activePathIndexRef.current % Math.max(paths.length, 1)];
          if (completedPath) {
            onPathArrived(completedPath);
          }

          animationProgressRef.current = nextProgress % 1;
          activePathIndexRef.current = selectRandomPathIndex(paths.length);
        } else {
          animationProgressRef.current = nextProgress;
        }
      }

      drawScene({
        context,
        canvas,
        cssSize: sizeRef.current,
        params,
        activePath: paths[activePathIndexRef.current % Math.max(paths.length, 1)],
        pathSum,
        phaseState,
        progress: animationProgressRef.current,
      });

      frameId = window.requestAnimationFrame(drawFrame);
    };

    frameId = window.requestAnimationFrame(drawFrame);

    return () => window.cancelAnimationFrame(frameId);
  }, [isPlaying, onPathArrived, params, pathSum, paths, phaseState]);

  const handlePointer = (event: PointerEvent<HTMLCanvasElement>): void => {
    const canvas = canvasRef.current;
    if (!canvas || (event.type === "pointermove" && event.buttons !== 1)) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const margins = getMargins(rect.width, rect.height);
    const drawableHeight = rect.height - margins.top - margins.bottom;
    const halfHeight = GEOMETRY.screenHalfHeight + WORLD_Y_PADDING;
    const detectorY = halfHeight - ((y - margins.top) / drawableHeight) * halfHeight * 2;

    event.currentTarget.setPointerCapture(event.pointerId);
    onDetectorYChange(clamp(detectorY, -GEOMETRY.screenHalfHeight, GEOMETRY.screenHalfHeight));
  };

  return (
    <div className="visualizer-shell">
      <canvas
        ref={canvasRef}
        className="path-canvas"
        aria-label="Double-slit path-integral simulation"
        onPointerDown={handlePointer}
        onPointerMove={handlePointer}
      />
    </div>
  );
}

type DrawSceneInput = {
  context: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  cssSize: CanvasSize;
  params: SimulationParams;
  activePath: PathSample | undefined;
  pathSum: PathSumResult;
  phaseState: AccumulatedPhaseState;
  progress: number;
};

function drawScene({
  context,
  canvas,
  cssSize,
  params,
  activePath,
  pathSum,
  phaseState,
  progress,
}: DrawSceneInput): void {
  const dpr = window.devicePixelRatio || 1;
  const width = cssSize.width || canvas.width / dpr;
  const height = cssSize.height || canvas.height / dpr;

  context.save();
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#fbfcff";
  context.fillRect(0, 0, width, height);

  const margins = getMargins(width, height);

  const mapX = (x: number): number =>
    margins.left + ((x - GEOMETRY.sourceX) / (GEOMETRY.screenX - GEOMETRY.sourceX)) *
      (width - margins.left - margins.right);
  const mapY = (y: number): number => {
    const halfHeight = GEOMETRY.screenHalfHeight + WORLD_Y_PADDING;
    return margins.top + ((halfHeight - y) / (halfHeight * 2)) *
      (height - margins.top - margins.bottom);
  };

  drawStageBackdrop(context, width, height, margins, mapX);
  drawGrid(context, width, height, margins);
  const screenX = mapX(GEOMETRY.screenX);
  drawFocusScreen(context, pathSum, params.detectorY, screenX, mapY, width);
  drawAveragePhaseAtScreen(
    context,
    phaseState,
    pathSum,
    screenX,
    mapY(params.detectorY),
    width,
    height,
  );
  drawActiveParticlePath(
    context,
    activePath,
    mapX,
    mapY,
    progress,
    params.mass,
    params.reducedPlanck,
    phaseState.count + 1,
    width,
    height,
  );
  drawBarrier(context, mapX, mapY, params.slitSeparation);
  drawSource(context, mapX(GEOMETRY.sourceX), mapY(GEOMETRY.sourceY), progress);
  drawLabels(context, mapX, mapY);

  context.restore();
}

function drawStageBackdrop(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  margins: { left: number; right: number; top: number; bottom: number },
  mapX: (x: number) => number,
): void {
  const plotTop = margins.top;
  const plotBottom = height - margins.bottom;
  const sourceX = mapX(GEOMETRY.sourceX);
  const slitX = mapX(GEOMETRY.slitX);
  const screenX = mapX(GEOMETRY.screenX);
  const gradient = context.createLinearGradient(margins.left, 0, width - margins.right, 0);

  gradient.addColorStop(0, "rgba(255, 255, 255, 0)");
  gradient.addColorStop(0.42, "rgba(37, 111, 202, 0.035)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
  context.fillStyle = gradient;
  context.fillRect(margins.left, plotTop, width - margins.left - margins.right, plotBottom - plotTop);

  for (const [x, alpha] of [
    [sourceX, 0.08],
    [slitX, 0.1],
    [screenX, 0.1],
  ] as const) {
    context.fillStyle = `rgba(37, 111, 202, ${alpha})`;
    context.fillRect(x - 0.5, plotTop, 1, plotBottom - plotTop);
  }
}

function selectRandomPathIndex(pathCount: number): number {
  return pathCount <= 0 ? 0 : Math.floor(Math.random() * pathCount);
}

function getMargins(
  width: number,
  height: number,
): { left: number; right: number; top: number; bottom: number } {
  return {
    left: clamp(width * 0.07, 34, 72),
    right: clamp(width * 0.12, 54, 108),
    top: clamp(height * 0.08, 28, 52),
    bottom: clamp(height * 0.08, 28, 52),
  };
}

function drawGrid(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  margins: { left: number; right: number; top: number; bottom: number },
): void {
  context.strokeStyle = "rgba(46, 52, 64, 0.07)";
  context.lineWidth = 1;

  for (let index = 0; index <= 6; index += 1) {
    const y = margins.top + ((height - margins.top - margins.bottom) / 6) * index;
    context.beginPath();
    context.moveTo(margins.left, y);
    context.lineTo(width - margins.right, y);
    context.stroke();
  }
}

function drawActiveParticlePath(
  context: CanvasRenderingContext2D,
  path: PathSample | undefined,
  mapX: (x: number) => number,
  mapY: (y: number) => number,
  progress: number,
  mass: number,
  reducedPlanck: number,
  trialNumber: number,
  width: number,
  height: number,
): void {
  if (!path) {
    return;
  }

  const sourceX = mapX(GEOMETRY.sourceX);
  const sourceY = mapY(GEOMETRY.sourceY);
  const slitX = mapX(GEOMETRY.slitX);
  const screenX = mapX(GEOMETRY.screenX);
  const firstLeg = {
    start: { x: sourceX, y: sourceY },
    control: { x: (sourceX + slitX) / 2, y: mapY(path.controlY * 0.45) },
    end: { x: slitX, y: mapY(path.slitY) },
  };
  const secondLeg = {
    start: { x: slitX, y: mapY(path.slitY) },
    control: { x: (slitX + screenX) / 2, y: mapY((path.controlY + path.detectorY) / 2) },
    end: { x: screenX, y: mapY(path.detectorY) },
  };
  const firstLegAction = calculateFreeParticleAction(
    path.firstLegLength,
    TRAVERSAL_TIME / 2,
    mass,
  );
  const secondLegAction = calculateFreeParticleAction(
    path.secondLegLength,
    TRAVERSAL_TIME / 2,
    mass,
  );
  const currentAction = calculateAccumulatedAction(
    path.firstLegLength,
    path.secondLegLength,
    progress,
    mass,
  );
  const currentPhase = currentAction / reducedPlanck;
  const firstLegReveal = clamp(progress / 0.5, 0, 1);
  const secondLegReveal = clamp((progress - 0.5) / 0.5, 0, 1);

  context.lineWidth = 4;
  context.lineCap = "round";

  drawPhaseProgressionLeg(
    context,
    firstLeg.start,
    firstLeg.control,
    firstLeg.end,
    firstLegReveal,
    0,
    firstLegAction,
    reducedPlanck,
    0.76,
  );

  if (secondLegReveal > 0) {
    drawPhaseProgressionLeg(
      context,
      secondLeg.start,
      secondLeg.control,
      secondLeg.end,
      secondLegReveal,
      firstLegAction,
      secondLegAction,
      reducedPlanck,
      0.76,
    );
  }

  const particlePosition = getParticlePosition(firstLeg, secondLeg, progress);
  drawParticle(context, particlePosition, currentPhase);
  drawParticleTelemetry(context, currentAction, currentPhase, trialNumber, width, height);
}

function drawPhaseProgressionLeg(
  context: CanvasRenderingContext2D,
  start: Point,
  control: Point,
  end: Point,
  reveal: number,
  startAction: number,
  legAction: number,
  reducedPlanck: number,
  alpha: number,
): void {
  const visibleReveal = clamp(reveal, 0, 1);
  const visibleSegments = Math.max(1, Math.ceil(PHASE_SEGMENTS_PER_LEG * visibleReveal));

  for (let index = 0; index < visibleSegments; index += 1) {
    const t0 = (index / visibleSegments) * visibleReveal;
    const t1 = ((index + 1) / visibleSegments) * visibleReveal;
    const segmentStart = quadraticPoint(start, control, end, t0);
    const segmentEnd = quadraticPoint(start, control, end, t1);
    const midpointAction = startAction + legAction * ((t0 + t1) / 2);
    const hue = phaseToHue(midpointAction / reducedPlanck);

    context.strokeStyle = `hsla(${hue}, 82%, 45%, ${alpha})`;
    context.beginPath();
    context.moveTo(segmentStart.x, segmentStart.y);
    context.lineTo(segmentEnd.x, segmentEnd.y);
    context.stroke();
  }
}

function getParticlePosition(
  firstLeg: { start: Point; control: Point; end: Point },
  secondLeg: { start: Point; control: Point; end: Point },
  progress: number,
): Point {
  const leg = progress <= 0.5 ? firstLeg : secondLeg;
  const legProgress = progress <= 0.5 ? progress / 0.5 : (progress - 0.5) / 0.5;

  return quadraticPoint(leg.start, leg.control, leg.end, clamp(legProgress, 0, 1));
}

function drawParticle(
  context: CanvasRenderingContext2D,
  position: Point,
  phase: number,
): void {
  const hue = phaseToHue(phase);
  const glow = context.createRadialGradient(
    position.x,
    position.y,
    1,
    position.x,
    position.y,
    PARTICLE_RADIUS * 4,
  );

  glow.addColorStop(0, `hsla(${hue}, 90%, 55%, 0.85)`);
  glow.addColorStop(0.42, `hsla(${hue}, 90%, 55%, 0.24)`);
  glow.addColorStop(1, `hsla(${hue}, 90%, 55%, 0)`);
  context.fillStyle = glow;
  context.beginPath();
  context.arc(position.x, position.y, PARTICLE_RADIUS * 4, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#ffffff";
  context.strokeStyle = `hsl(${hue}, 82%, 40%)`;
  context.lineWidth = 2;
  context.beginPath();
  context.arc(position.x, position.y, PARTICLE_RADIUS, 0, Math.PI * 2);
  context.fill();
  context.stroke();
}

function drawParticleTelemetry(
  context: CanvasRenderingContext2D,
  action: number,
  phase: number,
  trialNumber: number,
  width: number,
  height: number,
): void {
  const panelWidth = 206;
  const panelHeight = 66;
  const x = 18;
  const y = height - panelHeight - 18;
  const vectorCenter = { x: x + panelWidth - 27, y: y + panelHeight / 2 + 6 };
  const vectorRadius = 15;
  const hue = phaseToHue(phase);

  context.fillStyle = "rgba(255, 255, 255, 0.9)";
  context.strokeStyle = "rgba(33, 38, 45, 0.14)";
  context.lineWidth = 1;
  context.shadowColor = "rgba(28, 38, 52, 0.12)";
  context.shadowBlur = 16;
  context.shadowOffsetY = 8;
  roundedRect(context, x, y, panelWidth, panelHeight, 8);
  context.fill();
  context.shadowColor = "transparent";
  context.shadowBlur = 0;
  context.shadowOffsetY = 0;
  context.stroke();

  context.fillStyle = "#25313d";
  context.font = "700 11px Inter, system-ui, sans-serif";
  context.textAlign = "left";
  context.fillText(`trial ${trialNumber}`, x + 12, y + 17);
  context.fillText(`S = ${action.toFixed(3)}`, x + 12, y + 36);
  context.fillText(`φ = ${phase.toFixed(2)}`, x + 12, y + 55);

  drawComplexPlane(context, vectorCenter, vectorRadius);
  drawComplexVector(context, vectorCenter, vectorRadius, phase, {
    stroke: `hsl(${hue}, 82%, 40%)`,
  });
}

function drawAveragePhaseAtScreen(
  context: CanvasRenderingContext2D,
  phaseState: AccumulatedPhaseState,
  pathSum: PathSumResult,
  screenX: number,
  detectorScreenY: number,
  width: number,
  height: number,
): void {
  const radius = 16;
  const panelWidth = 92;
  const panelHeight = 132;
  const preferredRightX = screenX + 56;
  const panelCenterX =
    preferredRightX + panelWidth / 2 > width - 10 ? screenX - 64 : preferredRightX;
  const panelX = clamp(panelCenterX, panelWidth / 2 + 10, width - panelWidth / 2 - 10);
  const panelTop = clamp(detectorScreenY - 78, 10, height - panelHeight - 10);
  const planeCenter = {
    x: panelX,
    y: panelTop + 82,
  };
  const averagePhase = Math.atan2(phaseState.average.imaginary, phaseState.average.real);

  context.fillStyle = "rgba(255, 255, 255, 0.88)";
  context.strokeStyle = "rgba(33, 38, 45, 0.12)";
  context.lineWidth = 1;
  context.shadowColor = "rgba(28, 38, 52, 0.1)";
  context.shadowBlur = 14;
  context.shadowOffsetY = 7;
  roundedRect(context, panelX - panelWidth / 2, panelTop, panelWidth, panelHeight, 8);
  context.fill();
  context.shadowColor = "transparent";
  context.shadowBlur = 0;
  context.shadowOffsetY = 0;
  context.stroke();

  context.fillStyle = "#25313d";
  context.font = "700 10px Inter, system-ui, sans-serif";
  context.textAlign = "center";
  context.fillText("|rₙ|²", panelX, panelTop + 18);
  context.fillStyle = "#0f62c4";
  context.fillText(phaseState.coherence.toFixed(3), panelX, panelTop + 34);
  context.fillStyle = "#657181";
  context.font = "700 9px Inter, system-ui, sans-serif";
  context.fillText(`|R|² ${pathSum.normalizedIntensity.toFixed(3)}`, panelX, panelTop + 50);

  drawComplexPlane(context, planeCenter, radius);

  for (const sample of phaseState.recentSamples) {
    drawComplexVector(context, planeCenter, radius, sample.phase, {
      stroke: `hsla(${phaseToHue(sample.phase)}, 78%, 45%, 0.1)`,
      lineWidth: 1,
    });
  }

  drawComplexVector(context, planeCenter, radius, averagePhase, {
    stroke: "#0b3d91",
    scale: Math.sqrt(phaseState.coherence),
    lineWidth: 3,
  });

  context.fillStyle = "#657181";
  context.font = "700 9px Inter, system-ui, sans-serif";
  context.fillText(`n=${phaseState.count}`, panelX, panelTop + 118);
}

function drawComplexVector(
  context: CanvasRenderingContext2D,
  center: Point,
  radius: number,
  phase: number,
  options: { stroke: string; scale?: number; lineWidth?: number },
): void {
  const scale = options.scale ?? 1;
  const end = {
    x: center.x + Math.cos(phase) * radius * scale,
    y: center.y + Math.sin(phase) * radius * scale,
  };

  context.strokeStyle = options.stroke;
  context.lineWidth = options.lineWidth ?? 2;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(center.x, center.y);
  context.lineTo(end.x, end.y);
  context.stroke();

  if ((options.lineWidth ?? 2) >= 2) {
    context.fillStyle = "#ffffff";
    context.beginPath();
    context.arc(end.x, end.y, 3.4, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  }
}

function drawComplexPlane(context: CanvasRenderingContext2D, center: Point, radius: number): void {
  context.strokeStyle = "rgba(33, 38, 45, 0.16)";
  context.lineWidth = 1;
  context.beginPath();
  context.arc(center.x, center.y, radius, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.moveTo(center.x - radius, center.y);
  context.lineTo(center.x + radius, center.y);
  context.moveTo(center.x, center.y - radius);
  context.lineTo(center.x, center.y + radius);
  context.stroke();
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function quadraticPoint(start: Point, control: Point, end: Point, t: number): Point {
  const oneMinusT = 1 - t;

  return {
    x: oneMinusT * oneMinusT * start.x + 2 * oneMinusT * t * control.x + t * t * end.x,
    y: oneMinusT * oneMinusT * start.y + 2 * oneMinusT * t * control.y + t * t * end.y,
  };
}

function drawBarrier(
  context: CanvasRenderingContext2D,
  mapX: (x: number) => number,
  mapY: (y: number) => number,
  slitSeparation: number,
): void {
  const barrierX = mapX(GEOMETRY.slitX);
  const top = mapY(GEOMETRY.screenHalfHeight);
  const bottom = mapY(-GEOMETRY.screenHalfHeight);
  const slitYs = [-slitSeparation / 2, slitSeparation / 2];

  context.strokeStyle = "#25313d";
  context.lineWidth = 6;
  context.lineCap = "round";

  const blockedSegments: Array<[number, number]> = [[top, bottom]];

  for (const slitY of slitYs) {
    const apertureTop = mapY(slitY + SLIT_APERTURE_WIDTH / 2);
    const apertureBottom = mapY(slitY - SLIT_APERTURE_WIDTH / 2);
    const nextSegments: Array<[number, number]> = [];

    for (const [segmentTop, segmentBottom] of blockedSegments) {
      if (apertureTop > segmentTop) {
        nextSegments.push([segmentTop, apertureTop]);
      }
      if (apertureBottom < segmentBottom) {
        nextSegments.push([apertureBottom, segmentBottom]);
      }
    }

    blockedSegments.splice(0, blockedSegments.length, ...nextSegments);
  }

  for (const [segmentTop, segmentBottom] of blockedSegments) {
    context.beginPath();
    context.moveTo(barrierX, segmentTop);
    context.lineTo(barrierX, segmentBottom);
    context.stroke();
  }

  context.fillStyle = "#fbfcff";
  for (const slitY of slitYs) {
    context.beginPath();
    context.arc(barrierX, mapY(slitY), 8, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "rgba(49, 63, 82, 0.34)";
    context.lineWidth = 1.5;
    context.stroke();
  }
}

function drawFocusScreen(
  context: CanvasRenderingContext2D,
  pathSum: PathSumResult,
  detectorY: number,
  screenX: number,
  mapY: (y: number) => number,
  width: number,
): void {
  context.strokeStyle = "#1d2a35";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(screenX, mapY(GEOMETRY.screenHalfHeight));
  context.lineTo(screenX, mapY(-GEOMETRY.screenHalfHeight));
  context.stroke();

  const y = mapY(detectorY);
  const glowRadius = 15 + pathSum.normalizedIntensity * 34;
  const gradient = context.createRadialGradient(screenX, y, 2, screenX, y, glowRadius);
  gradient.addColorStop(0, `rgba(22, 101, 216, ${0.45 + pathSum.normalizedIntensity * 0.42})`);
  gradient.addColorStop(0.55, `rgba(22, 101, 216, ${0.18 + pathSum.normalizedIntensity * 0.24})`);
  gradient.addColorStop(1, "rgba(22, 101, 216, 0)");
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(screenX, y, glowRadius, 0, Math.PI * 2);
  context.fill();

  const barWidth = 20 + pathSum.normalizedIntensity * clamp(width * 0.12, 56, 120);
  const barGradient = context.createLinearGradient(screenX + 6, y, screenX + barWidth, y);
  barGradient.addColorStop(0, "rgba(22, 101, 216, 0.72)");
  barGradient.addColorStop(1, "rgba(22, 101, 216, 0)");
  context.fillStyle = barGradient;
  context.fillRect(screenX + 6, y - 3, barWidth, 6);

  context.strokeStyle = "#0f62c4";
  context.fillStyle = "#ffffff";
  context.lineWidth = 2;
  context.beginPath();
  context.arc(screenX, y, 8, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  context.strokeStyle = "rgba(15, 98, 196, 0.44)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(screenX - 18, y);
  context.lineTo(screenX + 18, y);
  context.moveTo(screenX, y - 18);
  context.lineTo(screenX, y + 18);
  context.stroke();
}

function drawSource(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  progress: number,
): void {
  const pulseRadius = 12 + Math.sin(progress * Math.PI * 2) * 3;
  const gradient = context.createRadialGradient(x, y, 1, x, y, pulseRadius * 2.2);
  gradient.addColorStop(0, "rgba(240, 137, 48, 0.9)");
  gradient.addColorStop(0.45, "rgba(240, 137, 48, 0.28)");
  gradient.addColorStop(1, "rgba(240, 137, 48, 0)");
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(x, y, pulseRadius * 2.2, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#bf4d18";
  context.beginPath();
  context.arc(x, y, 5, 0, Math.PI * 2);
  context.fill();
}

function drawLabels(
  context: CanvasRenderingContext2D,
  mapX: (x: number) => number,
  mapY: (y: number) => number,
): void {
  context.fillStyle = "#28313b";
  context.font = "600 13px Inter, system-ui, sans-serif";
  context.textAlign = "center";
  context.fillText("Source", mapX(GEOMETRY.sourceX), mapY(GEOMETRY.screenHalfHeight) - 12);
  context.fillText("Double slit", mapX(GEOMETRY.slitX), mapY(GEOMETRY.screenHalfHeight) - 12);
  context.fillText("Screen", mapX(GEOMETRY.screenX), mapY(GEOMETRY.screenHalfHeight) - 12);
}
