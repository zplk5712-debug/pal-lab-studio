import { memo, useEffect, useRef } from "react";

const AsciiChart = memo(function AsciiChart({ columns }) {
  if (!columns || columns.length < 2 || columns[0].length === 0) return null;
  const xs = columns[0];
  const ys = columns[1];
  const W = 320, H = 140, PX = 24, PY = 14;
  const iW = W - PX * 2, iH = H - PY * 2;
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const tx = (x) => PX + ((x - minX) / spanX) * iW;
  const ty = (y) => PY + iH - ((y - minY) / spanY) * iH;
  const points = xs.map((x, i) => `${tx(x)},${ty(ys[i])}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="converter-ascii-chart" aria-label="ASCII 데이터 미리보기 그래프">
      <line x1={PX} y1={PY} x2={PX} y2={H - PY} stroke="rgba(148,163,184,0.35)" strokeWidth="1" />
      <line x1={PX} y1={H - PY} x2={W - PX} y2={H - PY} stroke="rgba(148,163,184,0.35)" strokeWidth="1" />
      <polyline points={points} fill="none" stroke="rgba(15,107,255,0.85)" strokeWidth="1.4" strokeLinejoin="round" />
      <text x={PX} y={H - 2} fontSize="8" fill="rgba(94,113,146,0.85)">{minX.toFixed(2)}</text>
      <text x={W - PX} y={H - 2} fontSize="8" fill="rgba(94,113,146,0.85)" textAnchor="end">{maxX.toFixed(2)}</text>
    </svg>
  );
});

const TablePreview = memo(function TablePreview({ rows }) {
  if (!rows || rows.length === 0) return <p className="converter-preview-empty">표시할 데이터가 없어요.</p>;
  return (
    <div className="converter-table-wrap">
      <table className="converter-table">
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>{cell === undefined || cell === null ? "" : String(cell)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

const PdfFirstPagePreview = memo(function PdfFirstPagePreview({ base64 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    if (!base64) return undefined;

    async function render() {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();

      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }

      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      if (cancelled) return;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1 });
      const scale = Math.min(360 / viewport.width, 1);
      const scaledViewport = page.getViewport({ scale });

      const canvas = canvasRef.current;
      if (!canvas || cancelled) return;
      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;
      const context = canvas.getContext("2d");
      await page.render({ canvasContext: context, viewport: scaledViewport }).promise;
    }

    render().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [base64]);

  return <canvas ref={canvasRef} className="converter-pdf-canvas" />;
});

// kind: "image" | "ascii" | "table" | "pdf" | "text" | "none"
function ConverterPreviewPane({ kind, data }) {
  if (!data) {
    return <p className="converter-preview-empty">미리 볼 파일을 목록에서 선택해주세요.</p>;
  }

  if (kind === "image") {
    return <img className="converter-preview-image" src={data} alt="미리보기" />;
  }

  if (kind === "ascii") {
    return (
      <div className="converter-ascii-preview">
        <AsciiChart columns={data.columns} />
        {Object.keys(data.metadata || {}).length > 0 ? (
          <dl className="converter-ascii-meta">
            {Object.entries(data.metadata).slice(0, 6).map(([key, value]) => (
              <div key={key} className="converter-ascii-meta__row">
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        <p className="converter-preview-note">데이터 {data.rowCount.toLocaleString()}행</p>
      </div>
    );
  }

  if (kind === "table") {
    return <TablePreview rows={data} />;
  }

  if (kind === "pdf") {
    return <PdfFirstPagePreview base64={data} />;
  }

  if (kind === "text") {
    return <pre className="converter-text-preview">{data}</pre>;
  }

  return <p className="converter-preview-empty">이 파일 형식은 미리보기를 지원하지 않아요.</p>;
}

export default ConverterPreviewPane;
