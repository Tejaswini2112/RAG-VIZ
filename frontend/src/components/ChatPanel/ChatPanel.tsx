import { useState } from "react";
import { Message } from "../../App";
import { PipelineStep } from "../../types/pipeline";
import FileUpload from "./FileUpload";
import MessageList from "./MessageList";
import { useUpload } from "../../hooks/useUpload";
import { useQuery } from "../../hooks/useQuery";

interface Props {
  messages: Message[];
  onAddMessage: (msg: Message) => void;
  onStep: (step: PipelineStep) => void;
  onClearSteps: () => void;
}

export default function ChatPanel({ messages, onAddMessage, onStep, onClearSteps }: Props) {
  const [input, setInput] = useState("");
  const [docReady, setDocReady] = useState(false);

  const { uploadFile, isUploading, error: uploadError } = useUpload((step) => {
    onStep(step);
    // Mark document as ready once the full ingest pipeline completes
    if (step.step === "done") setDocReady(true);
  });

  const { submitQuery, isQuerying, error: queryError } = useQuery((step) => {
    // When the query pipeline finishes, extract the answer and add it as a message
    if (step.step === "done" && step.data && "answer" in step.data) {
      onAddMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: step.data.answer as string,
      });
    }
    onStep(step);
  });

  const handleUpload = (file: File) => {
    setDocReady(false);
    onClearSteps(); // clear pipeline panel before showing ingest steps
    uploadFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const question = input.trim();
    if (!question || isQuerying) return;

    setInput("");
    onClearSteps(); // clear pipeline panel before showing query steps

    onAddMessage({
      id: `user-${Date.now()}`,
      role: "user",
      content: question,
    });

    await submitQuery(question);
  };

  const error = uploadError || queryError;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-none p-4 border-b border-gray-800">
        <h1 className="text-base font-semibold tracking-tight">RAG Visualizer</h1>
        <p className="text-xs text-gray-500 mt-0.5">Upload a document, then ask questions</p>
      </div>

      {/* Upload area */}
      <div className="flex-none p-4 border-b border-gray-800">
        <FileUpload
          onUpload={handleUpload}
          isUploading={isUploading}
          docReady={docReady}
        />
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex-none px-4 py-2 bg-red-900/40 border-b border-red-800 text-red-300 text-xs">
          {error}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <MessageList messages={messages} isQuerying={isQuerying} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex-none p-4 border-t border-gray-800">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={docReady ? "Ask a question about your document..." : "Upload a document first"}
            disabled={!docReady || isQuerying}
            className="flex-1 bg-gray-800 rounded-lg px-4 py-2 text-sm outline-none
                       focus:ring-1 focus:ring-blue-500 disabled:opacity-40
                       placeholder:text-gray-600"
          />
          <button
            type="submit"
            disabled={!docReady || isQuerying || !input.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed
                       rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
