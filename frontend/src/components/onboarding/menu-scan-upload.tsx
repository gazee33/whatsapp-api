"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, Upload, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tenantClient } from "@/lib/api-client";
import type { ExtractedMenu } from "@/lib/types";

interface MenuScanUploadProps {
  onAnalyzed: (data: ExtractedMenu) => void;
  onCancel: () => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export function MenuScanUpload({ onAnalyzed, onCancel }: MenuScanUploadProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return "Image too large (max 5MB)";
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Invalid file type. Please use JPEG, PNG, GIF, or WebP.";
    }
    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleChooseDifferent = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setImageFile(null);
    setPreviewUrl(null);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!imageFile) return;

    setAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("image", imageFile);
      const res = await tenantClient.post("/menu/scan", formData);
      onAnalyzed(res.data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to analyze menu. Please try again.";
      setError(message);
    } finally {
      setAnalyzing(false);
    }
  };

  if (!imageFile) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 ring-1 ring-indigo-200">
            <Image className="h-8 w-8 text-indigo-500" />
          </div>
          <h2 className="text-2xl font-bold text-[#1E1B4B] font-[family-name:var(--font-playfair)]">
            Upload Your Menu
          </h2>
          <p className="text-slate-500 max-w-md mx-auto">
            Take a photo or upload an image of your menu and we&apos;ll extract all items automatically.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            onClick={() => cameraInputRef.current?.click()}
            className="w-full sm:w-auto bg-indigo-500 hover:bg-indigo-600 text-white"
          >
            <Camera className="h-4 w-4" />
            Take Photo
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="w-full sm:w-auto"
          >
            <Upload className="h-4 w-4" />
            Upload Image
          </Button>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50/60 border border-red-100/60">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-center">
          <button
            onClick={onCancel}
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
          >
            I&apos;ll add items manually
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 ring-1 ring-indigo-200">
          <Image className="h-8 w-8 text-indigo-500" />
        </div>
        <h2 className="text-2xl font-bold text-[#1E1B4B] font-[family-name:var(--font-playfair)]">
          Review Menu Photo
        </h2>
        <p className="text-slate-500 max-w-md mx-auto">
          {analyzing
            ? "Analyzing your menu with AI..."
            : "Confirm this looks good and we&apos;ll extract your menu items."}
        </p>
      </div>

      <div className="flex justify-center">
        <div className="relative w-full max-w-md rounded-xl overflow-hidden border border-slate-200 shadow-sm">
          <img
            src={previewUrl!}
            alt="Menu preview"
            className="w-full h-auto object-contain max-h-64"
          />
        </div>
      </div>

      {!analyzing && (
        <button
          onClick={handleChooseDifferent}
          className="block mx-auto text-sm text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer"
        >
          Choose Different Photo
        </button>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Button
          onClick={handleAnalyze}
          disabled={analyzing}
          loading={analyzing}
          className="w-full sm:w-auto bg-indigo-500 hover:bg-indigo-600 text-white"
        >
          {analyzing ? "Analyzing your menu..." : "Analyze Menu"}
        </Button>
        {!analyzing && (
          <Button
            variant="outline"
            onClick={onCancel}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50/60 border border-red-100/60">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}
