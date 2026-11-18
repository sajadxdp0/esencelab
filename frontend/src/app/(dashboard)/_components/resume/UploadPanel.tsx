"use client";

import { DragEvent } from "react";
import { FileText, Loader2, Trash2, UploadCloud, X } from "lucide-react";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { Resume } from "@/types";

interface UploadPanelProps {
  file: File | null;
  resume: Resume | null;
  uploading: boolean;
  uploadProgress: number;
  dragActive: boolean;
  onDrag: (event: DragEvent) => void;
  onDrop: (event: DragEvent) => void;
  onSelectFile: (file: File | null) => void;
  onClearFile: () => void;
  onDelete: () => void;
  onUpload: () => void;
}

export default function UploadPanel({
  file,
  resume,
  uploading,
  uploadProgress,
  dragActive,
  onDrag,
  onDrop,
  onSelectFile,
  onClearFile,
  onDelete,
  onUpload,
}: UploadPanelProps) {
  return (
        <Card hoverable={false} className="p-5 sm:p-8">
          <div
            className={`rounded-3xl border border-dashed p-5 text-center transition-all sm:p-8 ${
              dragActive
                ? "border-primary bg-white"
                : "border-border bg-white/60 hover:border-primary/50 hover:bg-white"
            }`}
            onDragEnter={onDrag}
            onDragLeave={onDrag}
            onDragOver={onDrag}
            onDrop={onDrop}
          >
            <input
              id="file-upload"
              type="file"
              accept=".pdf"
              onChange={(event) =>
                onSelectFile(event.target.files?.[0] || null)
              }
              className="hidden"
            />

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-border bg-white">
              <UploadCloud className="h-7 w-7 text-primary" />
            </div>
            <h2 className="mt-5 text-2xl font-semibold text-primary">
              Upload a resume PDF
            </h2>
            <p className="mt-2 text-sm text-secondary">
              Drag and drop your file here, or browse from your device.
            </p>

            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
              <Button
                className="w-full sm:w-auto"
                onClick={() => document.getElementById("file-upload")?.click()}
              >
                Choose file
              </Button>
              {file && (
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => onClearFile()}
                >
                  <X className="mr-2 h-4 w-4" />
                  Clear selection
                </Button>
              )}
              {resume && (
                <Button
                  variant="ghost"
                  onClick={onDelete}
                  className="w-full text-gray-700 hover:bg-gray-100 sm:w-auto"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete resume
                </Button>
              )}
            </div>

            {file && (
              <div className="mt-6 rounded-2xl border border-border bg-white p-4 text-left">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-xl border border-border bg-gray-50 p-2">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-primary">{file.name}</p>
                      <p className="text-sm text-secondary">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={onUpload}
                    disabled={uploading}
                    isLoading={uploading}
                  >
                    Upload and analyze
                  </Button>
                </div>
              </div>
            )}

            {uploading && (
              <div className="mt-6 space-y-3 text-left">
                <div className="flex items-center gap-2 text-sm text-secondary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Parsing resume...
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </Card>
  );
}
