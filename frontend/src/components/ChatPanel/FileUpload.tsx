import { useRef, useState } from "react";

interface Props {
  onUpload: (file: File) => void;
  isUploading: boolean;
  docReady: boolean;
  uploadedFileName?: string | null;
  uploadedFileUrl?: string | null;
}

export default function FileUpload({ onUpload, isUploading, docReady, uploadedFileName, uploadedFileUrl }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onUpload(file);
  };

  // ── Uploading ────────────────────────────────────────────────────────────
  if (isUploading) {
    return (
      <div className="flex items-center justify-center gap-3 py-5 rounded-xl border border-blue-500/20 bg-blue-500/5">
        <span className="w-4 h-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-gray-300">Processing document…</p>
          <p className="text-xs text-gray-500 mt-0.5">Chunking · Embedding · Storing</p>
        </div>
      </div>
    );
  }

  // ── Ready ────────────────────────────────────────────────────────────────
  if (docReady) {
    return (
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-green-500/30 bg-green-500/5">
        {/* Check icon */}
        <span className="w-6 h-6 rounded-md bg-green-500/20 text-green-400 flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3,9 6,12 13,4" />
          </svg>
        </span>

        {/* Filename + status */}
        <div className="flex-1 min-w-0">
          {uploadedFileName && (
            <p className="text-xs text-gray-300 font-mono truncate leading-tight">{uploadedFileName}</p>
          )}
          <p className="text-xs font-medium text-green-400 leading-tight mt-0.5">Document ready</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {uploadedFileUrl && (
            <a
              href={uploadedFileUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              View
            </a>
          )}
          <label
            htmlFor="file-upload-ready"
            className="text-xs text-gray-500 hover:text-gray-300 cursor-pointer transition-colors underline underline-offset-2"
          >
            Change
          </label>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.txt,.docx"
            onChange={handleChange}
            className="hidden"
            id="file-upload-ready"
          />
        </div>
      </div>
    );
  }

  // ── Idle drop zone ───────────────────────────────────────────────────────
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.txt,.docx"
        onChange={handleChange}
        className="hidden"
        id="file-upload"
      />
      <label
        htmlFor="file-upload"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center gap-2.5 py-7 rounded-xl border-2 border-dashed cursor-pointer transition-all select-none
          ${isDragging
            ? "border-blue-500 bg-blue-500/10 scale-[1.01]"
            : "border-gray-700 hover:border-gray-500 hover:bg-gray-800/40"
          }`}
      >
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all
          ${isDragging ? "bg-blue-500/20 text-blue-400 scale-110" : "bg-gray-800 text-gray-500"}`}
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 15V7m0 0-3 3m3-3 3 3" />
            <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
          </svg>
        </div>

        <div className="text-center">
          <p className={`text-sm font-medium transition-colors ${isDragging ? "text-blue-400" : "text-gray-300"}`}>
            {isDragging ? "Release to upload" : "Drop your document here"}
          </p>
          {!isDragging && (
            <p className="text-xs text-gray-500 mt-0.5">
              or <span className="text-blue-400 hover:text-blue-300">click to browse</span>
            </p>
          )}
        </div>

        <p className="text-xs text-gray-700 font-mono tracking-widest">PDF · TXT · DOCX</p>
      </label>
    </>
  );
}
