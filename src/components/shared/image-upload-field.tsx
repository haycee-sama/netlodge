"use client";

import * as React from "react";
import { Upload, X, Loader2, ImageIcon, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface UploadedFile {
  path: string;
  publicUrl?: string;
  signedUrl?: string;
  alt_text?: string;
}

interface ImageUploadFieldProps {
  /** API endpoint to upload to (e.g. "/api/uploads/property-image") */
  endpoint: string;
  /** Context ID to pass as formData field (e.g. propertyId, ticketId) */
  contextId?: string;
  /** Context field name in formData (e.g. "propertyId", "ticketId") */
  contextField: string;
  /** Already-uploaded files (controlled) */
  value: UploadedFile[];
  /** Callback when files change */
  onChange: (files: UploadedFile[]) => void;
  /** Max number of files */
  maxFiles?: number;
  /** Label for the field */
  label?: string;
  /** Description text */
  description?: string;
  /** Whether to show alt-text input for each image */
  showAltText?: boolean;
  /** Disabled state */
  disabled?: boolean;
}

const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp,image/gif";
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export function ImageUploadField({
  endpoint,
  contextId,
  contextField,
  value,
  onChange,
  maxFiles = 10,
  label = "Upload images",
  description = "JPEG, PNG, WebP, or GIF. Max 5 MB each.",
  showAltText = false,
  disabled = false,
}: ImageUploadFieldProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [previews, setPreviews] = React.useState<Record<string, string>>({});

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    if (value.length + files.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Validate files client-side
    const validFiles: File[] = [];
    for (const file of files) {
      if (file.size > MAX_SIZE) {
        toast.error(`${file.name} is too large (max 5 MB)`);
        continue;
      }
      if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
        toast.error(`${file.name} is not a supported image type`);
        continue;
      }
      validFiles.push(file);
    }

    if (!validFiles.length) {
      e.target.value = "";
      return;
    }

    setUploading(true);
    const newFiles: UploadedFile[] = [];

    for (const file of validFiles) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        if (contextId) {
          formData.append(contextField, contextId);
        }

        const res = await fetch(endpoint, {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) {
          toast.error(`Failed to upload ${file.name}`, { description: data.error });
          continue;
        }

        newFiles.push({
          path: data.path,
          publicUrl: data.publicUrl,
          signedUrl: data.signedUrl,
          alt_text: "",
        });

        // Create a local preview
        const previewUrl = URL.createObjectURL(file);
        setPreviews((p) => ({ ...p, [data.path]: previewUrl }));
      } catch (err) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    if (newFiles.length) {
      onChange([...value, ...newFiles]);
      toast.success(`${newFiles.length} file(s) uploaded`);
    }

    setUploading(false);
    e.target.value = "";
  }

  function handleRemove(path: string) {
    onChange(value.filter((f) => f.path !== path));
    setPreviews((p) => {
      const next = { ...p };
      if (next[path]) {
        URL.revokeObjectURL(next[path]);
        delete next[path];
      }
      return next;
    });
  }

  function updateAltText(path: string, alt: string) {
    onChange(value.map((f) => f.path === path ? { ...f, alt_text: alt } : f));
  }

  const displayUrl = (f: UploadedFile) => previews[f.path] ?? f.publicUrl ?? f.signedUrl;

  return (
    <div className="space-y-3">
      <div>
        <Label>{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>

      {/* Upload dropzone */}
      <div
        className={cn(
          "rounded-xl border-2 border-dashed border-border p-6 text-center transition-colors",
          disabled ? "opacity-50" : "hover:border-primary/40 cursor-pointer",
        )}
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          multiple={value.length < maxFiles}
          className="hidden"
          onChange={handleFileSelect}
          disabled={disabled || uploading}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
            <p className="text-sm text-muted-foreground">Uploading…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-6 w-6 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium">Click to upload</p>
            <p className="text-xs text-muted-foreground">
              {value.length}/{maxFiles} files
            </p>
          </div>
        )}
      </div>

      {/* Preview grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {value.map((f, i) => (
            <div key={f.path} className="group relative overflow-hidden rounded-lg border border-border">
              {displayUrl(f) ? (
                <img
                  src={displayUrl(f)}
                  alt={f.alt_text || `Image ${i + 1}`}
                  className="aspect-video w-full object-cover"
                />
              ) : (
                <div className="flex aspect-video items-center justify-center bg-muted">
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <button
                type="button"
                onClick={() => handleRemove(f.path)}
                className="absolute right-1 top-1 rounded-full bg-background/80 p-1 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                aria-label="Remove image"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              {showAltText && (
                <Input
                  placeholder="Alt text…"
                  value={f.alt_text ?? ""}
                  onChange={(e) => updateAltText(f.path, e.target.value)}
                  className="mt-1 h-7 text-xs"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
