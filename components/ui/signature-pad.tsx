"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "./button";
import { TextField } from "./text-field";
import { X, Trash2, Type } from "lucide-react";
import Image from "next/image";

interface SignaturePadProps {
  value?: string;
  onChange: (signature: string, type: "text" | "image") => void;
  label?: string;
  disabled?: boolean;
}

export function SignaturePad({
  value,
  onChange,
  label = "Signature",
  disabled = false,
}: SignaturePadProps) {
  const canvasRef = useRef<SignatureCanvas>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [signatureType, setSignatureType] = useState<"draw" | "text">("draw");
  const [textSignature, setTextSignature] = useState("");
  const [hasSignature, setHasSignature] = useState(false);
  const [isCanvasEmpty, setIsCanvasEmpty] = useState(true);
  const [canvasSize, setCanvasSize] = useState({ width: 500, height: 200 });
  const [canvasInitialized, setCanvasInitialized] = useState(false);

  // Calculate canvas size once on mount (don't resize after to avoid coordinate issues)
  useEffect(() => {
    if (containerRef.current && !canvasInitialized) {
      // Only set once on initial mount
      const containerWidth = containerRef.current.offsetWidth - 16; // Account for padding
      const width = Math.min(containerWidth, 500);
      const height = Math.max(200, width * 0.4); // Maintain aspect ratio
      setCanvasSize({ width, height });
      setCanvasInitialized(true);
    }
  }, [canvasInitialized]);

  useEffect(() => {
    if (value) {
      // Check if value is a base64 image or text
      if (value.startsWith("data:image")) {
        setSignatureType("draw");
        setHasSignature(true);
        setIsCanvasEmpty(false);
        // Load image to canvas if it exists
        if (canvasRef.current) {
          const img = new (window as any).Image();
          img.src = value;
          img.onload = () => {
            const canvas = canvasRef.current?.getCanvas();
            if (canvas) {
              const ctx = canvas.getContext("2d");
              if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                setIsCanvasEmpty(false);
              }
            }
          };
        }
      } else {
        setSignatureType("text");
        setTextSignature(value);
        setHasSignature(true);
      }
    } else {
      setHasSignature(false);
      setIsCanvasEmpty(true);
    }
  }, [value]);

  const handleCanvasBegin = useCallback(() => {
    setIsCanvasEmpty(false);
  }, []);

  const handleCanvasEnd = useCallback(() => {
    if (canvasRef.current) {
      const isEmpty = canvasRef.current.isEmpty();
      setIsCanvasEmpty(isEmpty);
      // Don't auto-save, let user click Save button
    }
  }, []);

  const handleClear = () => {
    if (canvasRef.current) {
      canvasRef.current.clear();
      setIsCanvasEmpty(true);
    }
    setTextSignature("");
    setHasSignature(false);
    onChange("", "text");
  };

  const handleSave = () => {
    if (signatureType === "draw") {
      if (canvasRef.current && !canvasRef.current.isEmpty()) {
        const dataURL = canvasRef.current.toDataURL();
        onChange(dataURL, "image");
        setHasSignature(true);
        setIsCanvasEmpty(false);
      }
    } else {
      if (textSignature.trim()) {
        onChange(textSignature.trim(), "text");
        setHasSignature(true);
      }
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTextSignature(e.target.value);
    if (e.target.value.trim()) {
      onChange(e.target.value.trim(), "text");
      setHasSignature(true);
    } else {
      onChange("", "text");
      setHasSignature(false);
    }
  };

  const handleSignatureTypeChange = (type: "draw" | "text") => {
    setSignatureType(type);
    if (type === "draw" && canvasRef.current) {
      // Reset canvas when switching to draw mode
      canvasRef.current.clear();
      setIsCanvasEmpty(true);
      setHasSignature(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-foreground">
          {label}
        </label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={signatureType === "draw" ? "default" : "outline"}
            size="sm"
            onClick={() => handleSignatureTypeChange("draw")}
            disabled={disabled}
          >
            <Type className="h-4 w-4 mr-1" />
            Draw
          </Button>
          <Button
            type="button"
            variant={signatureType === "text" ? "default" : "outline"}
            size="sm"
            onClick={() => handleSignatureTypeChange("text")}
            disabled={disabled}
          >
            <Type className="h-4 w-4 mr-1" />
            Type Name
          </Button>
        </div>
      </div>

      {signatureType === "draw" ? (
        <div ref={containerRef} className="border rounded-lg p-2 bg-background">
          <div className="w-full flex justify-center overflow-x-auto">
            <div
              className="relative border rounded bg-white inline-block"
              style={{
                width: `${canvasSize.width}px`,
                height: `${canvasSize.height}px`,
                minWidth: "300px",
              }}
            >
              <SignatureCanvas
                ref={canvasRef}
                canvasProps={{
                  width: canvasSize.width,
                  height: canvasSize.height,
                  className: "block",
                  style: {
                    display: "block",
                    touchAction: "none",
                    cursor: "crosshair",
                  },
                }}
                backgroundColor="#ffffff"
                penColor="#000000"
                velocityFilterWeight={0.7}
                minWidth={1.5}
                maxWidth={3}
                throttle={16}
                onBegin={handleCanvasBegin}
                onEnd={handleCanvasEnd}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-2 items-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClear}
              disabled={disabled || isCanvasEmpty}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear
            </Button>
            {!hasSignature && !isCanvasEmpty && (
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={disabled}
              >
                Save Signature
              </Button>
            )}
            {hasSignature && (
              <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                <span>✓ Signature saved</span>
              </div>
            )}
          </div>
          {hasSignature && value && value.startsWith("data:image") && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground mb-1">
                Current signature:
              </p>
              <Image
                width={100}
                height={100}
                src={value}
                alt="Signature"
                className="max-w-full h-24 border rounded"
              />
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <TextField
            placeholder="Enter your full name"
            value={textSignature}
            onChange={handleTextChange}
            disabled={disabled}
            helperText="Type your name to generate a text signature"
          />
          {hasSignature && textSignature && (
            <div className="mt-2 p-3 border rounded bg-muted">
              <p className="text-sm font-medium text-foreground">Signature:</p>
              <p className="text-lg font-signature mt-1">{textSignature}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
