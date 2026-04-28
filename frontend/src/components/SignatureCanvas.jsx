import { useEffect, useRef, useState } from "react";
import { Eraser } from "lucide-react";

export default function SignatureCanvas({ value, onChange, disabled }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = rect.width * dpr;
    c.height = rect.height * dpr;
    const ctx = c.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#031433";
  }, []);

  const pos = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX - r.left, y: t.clientY - r.top };
  };

  const start = (e) => {
    if (disabled) return;
    e.preventDefault();
    drawing.current = true;
    const { x, y } = pos(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const move = (e) => {
    if (!drawing.current || disabled) return;
    e.preventDefault();
    const { x, y } = pos(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.lineTo(x, y);
    ctx.stroke();
    setEmpty(false);
  };
  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const data = canvasRef.current.toDataURL("image/png");
    onChange?.(data);
  };

  const clear = () => {
    const c = canvasRef.current;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    setEmpty(true);
    onChange?.(null);
  };

  return (
    <div data-testid="signature-canvas-wrapper">
      <div className="border-2 border-dashed border-slate-300 rounded-md bg-white">
        <canvas
          ref={canvasRef}
          data-testid="signature-canvas"
          onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
          onTouchStart={start} onTouchMove={move} onTouchEnd={end}
          style={{ width: "100%", height: 160, touchAction: "none", cursor: disabled ? "not-allowed" : "crosshair" }}
        />
      </div>
      <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
        <span>{empty ? "Dibuja tu firma con el mouse o el dedo" : "Firma capturada"}</span>
        <button type="button" onClick={clear} disabled={disabled || empty} data-testid="clear-signature"
                className="inline-flex items-center gap-1 text-slate-600 hover:text-[#031433] disabled:opacity-40">
          <Eraser className="w-3 h-3" /> Limpiar
        </button>
      </div>
    </div>
  );
}
