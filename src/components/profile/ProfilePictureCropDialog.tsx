import { useEffect, useRef, useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Position = { x: number; y: number };

export function ProfilePictureCropDialog({
  file,
  open,
  onOpenChange,
  onConfirm,
}: {
  file: File | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (file: File) => void;
}) {
  const [source, setSource] = useState("");
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 1, height: 1 });
  const dragRef = useRef<{ start: Position; pointer: Position } | null>(null);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSource(url);
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const clampPosition = (next: Position, nextZoom = zoom) => {
    const scale = Math.max(256 / imageSize.width, 256 / imageSize.height) * nextZoom;
    const maxX = Math.max(0, (imageSize.width * scale - 256) / 2);
    const maxY = Math.max(0, (imageSize.height * scale - 256) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, next.x)),
      y: Math.max(-maxY, Math.min(maxY, next.y)),
    };
  };

  const confirmCrop = async () => {
    if (!file || !source) return;
    const image = new Image();
    image.src = source;
    await image.decode();
    const scale = Math.max(256 / image.width, 256 / image.height) * zoom;
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const drawWidth = image.width * scale * 2;
    const drawHeight = image.height * scale * 2;
    ctx.drawImage(
      image,
      (512 - drawWidth) / 2 + position.x * 2,
      (512 - drawHeight) / 2 + position.y * 2,
      drawWidth,
      drawHeight,
    );
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onConfirm(new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92,
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl border-gray-200 bg-white p-5 shadow-none">
        <DialogHeader>
          <DialogTitle>Crop profile photo</DialogTitle>
        </DialogHeader>
        <div
          className="relative mx-auto h-64 w-64 touch-none overflow-hidden rounded-full bg-gray-100"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            dragRef.current = { start: position, pointer: { x: event.clientX, y: event.clientY } };
          }}
          onPointerMove={(event) => {
            const drag = dragRef.current;
            if (!drag) return;
            setPosition(
              clampPosition({
                x: drag.start.x + event.clientX - drag.pointer.x,
                y: drag.start.y + event.clientY - drag.pointer.y,
              }),
            );
          }}
          onPointerUp={() => {
            dragRef.current = null;
          }}
        >
          {source ? (
            <img
              src={source}
              alt=""
              draggable={false}
              onLoad={(event) => {
                setImageSize({
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight,
                });
              }}
              className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
              style={{
                width: `${imageSize.width * Math.max(256 / imageSize.width, 256 / imageSize.height) * zoom}px`,
                height: `${imageSize.height * Math.max(256 / imageSize.width, 256 / imageSize.height) * zoom}px`,
                transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
              }}
            />
          ) : null}
        </div>
        <p className="text-center text-xs text-gray-500">Drag to reposition and use the slider to zoom.</p>
        <input
          type="range"
          min="1"
          max="3"
          step="0.01"
          value={zoom}
          onChange={(event) => {
            const nextZoom = Number(event.target.value);
            setZoom(nextZoom);
            setPosition((prev) => clampPosition(prev, nextZoom));
          }}
          className="w-full accent-sky-500"
          aria-label="Zoom crop"
        />
        <div className="flex justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => {
              setZoom(1);
              setPosition({ x: 0, y: 0 });
            }}
          >
            <RotateCcw size={15} /> Reset
          </Button>
          <Button type="button" className="gap-2 bg-sky-500 text-white hover:bg-sky-600" onClick={() => void confirmCrop()}>
            <Check size={15} /> Use photo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
