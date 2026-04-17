import { useRef } from "react";

interface Props {
  onUpload: (file: File) => void;
  isUploading: boolean;
  docReady: boolean;
}

export default function FileUpload({ onUpload, isUploading, docReady }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    // Reset input value so the same file can be re-uploaded
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="flex items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.txt,.docx"
        onChange={handleChange}
        disabled={isUploading}
        className="hidden"
        id="file-upload"
      />
      <label
        htmlFor="file-upload"
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm
                    border border-gray-700 hover:border-gray-500 transition-colors
                    ${isUploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        {isUploading ? (
          <>
            <span className="w-3 h-3 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
            Processing...
          </>
        ) : (
          "Upload Document"
        )}
      </label>

      {docReady && !isUploading && (
        <span className="text-xs text-green-400 flex items-center gap-1">
          <span>✓</span> Ready
        </span>
      )}

      <span className="text-xs text-gray-600">PDF, TXT, DOCX</span>
    </div>
  );
}
