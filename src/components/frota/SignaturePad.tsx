import {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
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
    const emptyRef = useRef(true);
    const drawingRef = useRef(false);
    const lastRef = useRef<{ x: number; y: number } | null>(null);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const parent = canvas.parentElement;
      if (!parent) return;

      const height = 200;

      function resizeCanvas() {
        const width = Math.max(parent.clientWidth, 1);
        const ratio = window.devicePixelRatio || 1;

        const newWidth = Math.round(width * ratio);
        const newHeight = Math.round(height * ratio);

        if (
          canvas.width === newWidth &&
          canvas.height === newHeight
        ) {
          return;
        }

        const previous = document.createElement("canvas");
        previous.width = canvas.width;
        previous.height = canvas.height;

        if (canvas.width > 0 && canvas.height > 0) {
          const previousContext = previous.getContext("2d");

          if (previousContext) {
            previousContext.drawImage(canvas, 0, 0);
          }
        }

        canvas.width = newWidth;
        canvas.height = newHeight;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);

        if (previous.width > 0 && previous.height > 0) {
          ctx.drawImage(
            previous,
            0,
            0,
            previous.width,
            previous.height,
            0,
            0,
            width,
            height
          );
        }

        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 2.5;
      }

      resizeCanvas();

      const observer = new ResizeObserver(resizeCanvas);
      observer.observe(parent);

      return () => observer.disconnect();
    }, []);

    function pos(e: React.PointerEvent) {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();

      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }

    function down(e: React.PointerEvent) {
      if (!e.isPrimary) return;

      e.preventDefault();

      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.setPointerCapture(e.pointerId);

      drawingRef.current = true;
      lastRef.current = pos(e);
    }

    function move(e: React.PointerEvent) {
      if (!drawingRef.current) return;

      e.preventDefault();

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const p = pos(e);
      const last = lastRef.current;

      if (!last) return;

      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();

      lastRef.current = p;

      if (emptyRef.current) {
        emptyRef.current = false;
        setEmpty(false);
      }
    }

    function up() {
      drawingRef.current = false;
      lastRef.current = null;
    }

    function clear() {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      emptyRef.current = true;
      setEmpty(true);

      drawingRef.current = false;
      lastRef.current = null;
    }

    useImperativeHandle(ref, () => ({
      isEmpty: () => emptyRef.current,
      clear,
      toBlob: () =>
        new Promise((resolve) => {
          const canvas = canvasRef.current;

          if (!canvas) {
            resolve(null);
            return;
          }

          canvas.toBlob(
            (blob) => resolve(blob),
            "image/png"
          );
        }),
    }));

    return (
      <div className="space-y-2">
        {label && (
          <p className="text-sm font-medium">{label}</p>
        )}

        <div className="rounded-lg border bg-white overflow-hidden touch-none">
          <canvas
            ref={canvasRef}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
            onLostPointerCapture={up}
            className="block w-full touch-none"
          />
        </div>

        <div className="flex flex-wrap justify-between items-center gap-2">
          <p className="text-xs text-muted-foreground">
            {empty
              ? "Assine no quadro acima com o dedo ou mouse"
              : "Assinatura capturada"}
          </p>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-10 px-3"
            onClick={clear}
          >
            <Eraser className="mr-2 h-4 w-4" />
            Limpar assinatura
          </Button>
        </div>
      </div>
    );
  }
);
