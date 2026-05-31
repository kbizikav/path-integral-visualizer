import katex from "katex";

type FormulaLine = {
  latex: string;
  description: string;
};

const FORMULA_LINES: FormulaLine[] = [
  {
    latex: String.raw`A(x) \approx \frac{1}{N}\sum_{j=1}^{N} e^{iS_j(x)/\hbar}`,
    description:
      "The amplitude at the selected detector point is approximated by averaging many sampled path phases.",
  },
  {
    latex: String.raw`S_j = \sum_{\ell}\frac{m\lVert \Delta x_\ell\rVert^2}{2\Delta t_\ell}`,
    description:
      "Each sampled path uses the free-particle action; the Mass slider changes m, so it directly changes phase winding.",
  },
  {
    latex: String.raw`P(x)=\lvert A(x)\rvert^2`,
    description:
      "The predicted brightness is the squared magnitude of the summed complex amplitude.",
  },
];

function renderLatex(latex: string): string {
  return katex.renderToString(latex, {
    displayMode: true,
    strict: "warn",
    throwOnError: false,
  });
}

export function FormulaNote() {
  return (
    <details className="formula-note" aria-label="Path integral model">
      <summary>
        Model: <span>A(x) ∝ Σ exp(iS/ℏ)</span>
      </summary>
      <p className="formula-note__intro">
        This visualization samples possible slit paths and adds their action phases at the
        selected detector point.
      </p>
      {FORMULA_LINES.map((line) => (
        <div className="formula-note__item" key={line.latex}>
          <div
            className="formula-note__equation"
            dangerouslySetInnerHTML={{ __html: renderLatex(line.latex) }}
          />
          <p>{line.description}</p>
        </div>
      ))}
    </details>
  );
}
