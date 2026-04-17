import { useState } from "react";
import { PipelineStep } from "../types/pipeline";
import { useSSEStream } from "./useSSEStream";

export function useUpload(onStep: (step: PipelineStep) => void) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { startStream } = useSSEStream();

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      await startStream(
        "/upload",
        { method: "POST", body: formData },
        onStep
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      setError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadFile, isUploading, error };
}
