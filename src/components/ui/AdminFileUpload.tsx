"use client";

import { FileText, Upload } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent } from "react";

import { AdminFormField } from "@/components/ui/AdminUi";

type AdminFileUploadProps = {
  label: string;
  hint?: string;
  accept: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  emptyTitle?: string;
  emptyHint?: string;
  className?: string;
};

export function AdminFileUpload({
  label,
  hint,
  accept,
  file,
  onFileChange,
  emptyTitle = "Click to upload",
  emptyHint = "Choose a file",
  className = "",
}: AdminFileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file?.type.startsWith("image/")) {
      setPreview(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onFileChange(event.target.files?.[0] ?? null);
    event.target.value = "";
  };

  const clearFile = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onFileChange(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const isPdf =
    file?.type === "application/pdf" || file?.name.toLowerCase().endsWith(".pdf");

  return (
    <div className={className}>
      <AdminFormField label={label} hint={hint}>
        <label className="group block cursor-pointer">
          <div className="flex min-h-[9rem] w-full items-center justify-center overflow-hidden rounded-[8px] border border-dashed border-gray-200 bg-gray-50 p-4 text-center transition-colors group-hover:border-[#3563E9] group-hover:bg-blue-50/40">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt={file?.name ?? "File preview"}
                className="max-h-28 max-w-full object-contain"
              />
            ) : file && isPdf ? (
              <div>
                <FileText className="mx-auto h-10 w-10 text-[#3563E9]" aria-hidden="true" />
                <p className="mt-2 text-sm font-medium text-gray-700">{file.name}</p>
                <p className="mt-1 text-xs text-gray-400">PDF document</p>
              </div>
            ) : file ? (
              <p className="text-sm font-medium text-gray-700">{file.name}</p>
            ) : (
              <div>
                <Upload className="mx-auto h-8 w-8 text-gray-400" aria-hidden="true" />
                <p className="mt-2 text-sm font-medium text-gray-700">{emptyTitle}</p>
                <p className="mt-1 text-xs text-gray-400">{emptyHint}</p>
              </div>
            )}
          </div>
          <p className="mt-2 text-xs text-gray-400">
            {file ? file.name : "Click the box above to choose a file"}
          </p>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleChange}
            className="sr-only"
          />
        </label>
      </AdminFormField>
      {file ? (
        <button
          type="button"
          onClick={clearFile}
          className="mt-1 text-xs font-medium text-red-500 hover:underline"
        >
          Remove file
        </button>
      ) : null}
    </div>
  );
}
