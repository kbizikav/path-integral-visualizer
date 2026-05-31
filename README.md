# Path Integral Visualizer

An interactive web app for building intuition around Feynman's path integral through a double-slit experiment.

The app shows a single particle moving from a source, through one of two slits, and toward a selected detector point on a screen. Each sampled path contributes a complex phase based on the free-particle action, and the running average is visualized as a vector sum.

## Features

- Animated source-to-screen particle trajectories
- Randomly selected candidate paths through a double slit
- Local phase progression shown as a rainbow gradient along each path
- Live action and phase readout for the current particle
- Movable detector point with a screen-side phase average panel
- Adjustable slit separation, mass, reduced Planck scale, and animation speed
- Compact LaTeX model note explaining the approximation

## Model

This is an educational approximation rather than a full quantum field simulation. For each sampled path, the phase is computed from the free-particle action:

```math
S_j = \sum_\ell \frac{m\|\Delta x_\ell\|^2}{2\Delta t_\ell}
```

The detector amplitude is approximated by summing action phases:

```math
A(x) \approx \frac{1}{N}\sum_{j=1}^{N} e^{iS_j(x)/\hbar}
```

The predicted brightness is the squared magnitude of the amplitude:

```math
P(x) = |A(x)|^2
```

## Tech Stack

- Vite
- React
- TypeScript
- Canvas 2D
- KaTeX
- Vitest

## Local Development

```bash
npm install
npm run dev
```

## Verification

```bash
npm run build
npm run lint
npm run test
```

## License

MIT
