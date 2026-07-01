import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Eraser } from "lucide-react";

export interface SignaturePadHandle {
  isEmpty: () => boolean;
  toBlob: () => Promise<Blob | null>;
  clear: () => void;
}

export const SignaturePad = forwardRef<SignaturePadHandle, { label?: string }>(
  function SignaturePad({ label }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [empty, setEmpty] = useState(true);
    const drawingRef = useRef(false);
    const lastRef = useRef<{ x: number; y: number } | null>(null);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const parent = canvas.parentElement!;
      const ratio = window.devicePixelRatio || 1;
      const w = parent.clientWidth;
      const h = 160;
      canvas.width = w * ratio;
      canvas.height = h * ratio;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      const ctx = canvas.getContext("2d")!;
      ctx.scale(ratio, ratio);
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 2;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
    }, []);

    function pos(e: React.PointerEvent) {
      const rect = canvasRef.current!.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function down(e: React.PointerEvent) {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      drawingRef.current = true;
      lastRef.current = pos(e);
    }
    function move(e: React.PointerEvent) {
      if (!drawingRef.current) return;
      const ctx = canvasRef.current!.getContext("2d")!;
      const p = pos(e);
      const last = lastRef.current!;
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      lastRef.current = p;
      if (empty) setEmpty(false);
    }
    function up() {
      drawingRef.current = false;
      lastRef.current = null;
    }

    function clear() {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d")!;
      const w = canvas.width;
      const h = canvas.height;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
      setEmpty(true);
    }

    useImperativeHandle(ref, () => ({
      isEmpty: () => empty,
      clear,
      toBlob: () =>
        new Promise((resolve) => {
          canvasRef.current!.toBlob((b) => resolve(b), "image/png");
        }),
    }));

    return (
      <div className="space-y-1">
        {label && (
          <p className="text-sm font-medium">{label}</p>
        )}
        <div className="rounded-md border bg-white overflow-hidden touch-none">
          <canvas
            ref={canvasRef}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerLeave={up}
            className="block w-full"
          />
        </div>
        <div className="flex justify-between items-center">
          <p className="text-xs text-muted-foreground">
            {empty ? "Assine no quadro acima com o dedo/mouse" : "Assinatura capturada"}
          </p>
          <Button type="button" variant="ghost" size="sm" onClick={clear}>
            <Eraser className="mr-1 h-3 w-3" /> Limpar
          </Button>
        </div>
      </div>
    );
  },
);