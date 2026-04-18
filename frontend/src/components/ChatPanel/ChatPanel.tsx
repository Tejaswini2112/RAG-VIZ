import { useState, useEffect, useRef } from "react";
import { Message } from "../../App";
import { PipelineStep } from "../../types/pipeline";
import FileUpload from "./FileUpload";
import MessageList from "./MessageList";
import WelcomeModal from "../Modal/WelcomeModal";
import { useUpload } from "../../hooks/useUpload";
import { useQuery } from "../../hooks/useQuery";

interface Props {
  messages: Message[];
  onAddMessage: (msg: Message) => void;
  onStep: (step: PipelineStep) => void;
  onClearSteps: () => void;
  onTerminateSteps: () => void;
}

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export default function ChatPanel({ messages, onAddMessage, onStep, onClearSteps, onTerminateSteps }: Props) {
  const [input, setInput] = useState("");
  const [docReady, setDocReady] = useState(false);
  const [lastTokenCount, setLastTokenCount] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(() => !localStorage.getItem("ragviz_seen_guide"));
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);

  // Holds a question to auto-submit once the document finishes uploading
  const pendingQuestionRef = useRef<string | null>(null);

  // Revoke object URLs when they change to avoid memory leaks
  useEffect(() => {
    return () => {
      if (uploadedFileUrl && !uploadedFileUrl.startsWith("/")) {
        URL.revokeObjectURL(uploadedFileUrl);
      }
    };
  }, [uploadedFileUrl]);

  const { uploadFile, isUploading, error: uploadError } = useUpload((step) => {
    onStep(step);
    if (step.step === "done") setDocReady(true);
  });

  const { submitQuery, cancelQuery, isQuerying, error: queryError } = useQuery((step) => {
    if (step.step === "done" && step.data && "answer" in step.data) {
      onAddMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: step.data.answer as string,
      });
    }
    onStep(step);
  });

  // Auto-submit pending question once doc finishes uploading
  useEffect(() => {
    if (docReady && pendingQuestionRef.current) {
      const q = pendingQuestionRef.current;
      pendingQuestionRef.current = null;
      triggerQuery(q);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docReady]);

  const triggerQuery = async (question: string) => {
    setLastTokenCount(estimateTokens(question));
    setInput("");
    onClearSteps();
    onAddMessage({ id: `user-${Date.now()}`, role: "user", content: question });
    await submitQuery(question);
  };

  const handleUpload = (file: File) => {
    setDocReady(false);
    onClearSteps();
    if (uploadedFileUrl && !uploadedFileUrl.startsWith("/")) {
      URL.revokeObjectURL(uploadedFileUrl);
    }
    setUploadedFileName(file.name);
    setUploadedFileUrl(URL.createObjectURL(file));
    uploadFile(file);
  };

  const loadSample = async () => {
    try {
      const res = await fetch("/sample_rag_doc.txt");
      const text = await res.text();
      const file = new File([text], "sample_rag_doc.txt", { type: "text/plain" });
      setDocReady(false);
      onClearSteps();
      setUploadedFileName("sample_rag_doc.txt");
      setUploadedFileUrl("/sample_rag_doc.txt");
      uploadFile(file);
    } catch {
      // user can upload manually if fetch fails
    }
  };

  const handleLoadAndTry = () => {
    localStorage.setItem("ragviz_seen_guide", "true");
    setShowModal(false);
    loadSample();
  };

  const handleExploreManually = () => {
    localStorage.setItem("ragviz_seen_guide", "true");
    setShowModal(false);
  };

  const handleSuggestedQuestion = (q: string) => {
    if (!docReady || isQuerying) return;
    triggerQuery(q);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const question = input.trim();
    if (!question || isQuerying) return;
    await triggerQuery(question);
  };

  const error = uploadError || queryError;

  return (
    <>
      {showModal && (
        <WelcomeModal onLoadAndTry={handleLoadAndTry} onExploreManually={handleExploreManually} />
      )}

      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex-none border-b border-gray-800">
          <div className="h-0.5 bg-gradient-to-r from-blue-500 via-blue-400 to-transparent" />
          <div className="p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/15 border border-blue-500/25 flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="3"  cy="8"  r="2"   fill="#60a5fa" />
                <circle cx="13" cy="4"  r="1.5" fill="#818cf8" />
                <circle cx="13" cy="12" r="1.5" fill="#818cf8" />
                <line x1="5" y1="7.3" x2="11" y2="4.7"  stroke="#60a5fa" strokeWidth="1" strokeOpacity="0.7" />
                <line x1="5" y1="8.7" x2="11" y2="11.3" stroke="#60a5fa" strokeWidth="1" strokeOpacity="0.7" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight">RAG Visualizer</h1>
              <p className="text-xs text-gray-500 mt-0.5">Upload a document, then ask questions</p>
            </div>
          </div>
        </div>

        {/* Upload area */}
        <div className="flex-none p-4 border-b border-gray-800">
          <FileUpload
            onUpload={handleUpload}
            isUploading={isUploading}
            docReady={docReady}
            uploadedFileName={uploadedFileName}
            uploadedFileUrl={uploadedFileUrl}
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
          <MessageList
            messages={messages}
            isQuerying={isQuerying}
            docReady={docReady}
            isSampleDoc={uploadedFileName === "sample_rag_doc.txt"}
            onLoadSample={loadSample}
            onSuggestedQuestion={handleSuggestedQuestion}
          />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex-none p-4 border-t border-gray-800">
          <div className="flex gap-2 items-center">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={docReady ? "Ask a question about your document..." : "Upload a document first"}
              disabled={!docReady || isQuerying}
              className="flex-1 bg-gray-800 rounded-lg px-4 py-2 text-sm outline-none
                         focus:ring-1 focus:ring-blue-500 disabled:opacity-40
                         placeholder:text-gray-600"
            />
            {isQuerying ? (
              <button
                type="button"
                onClick={() => { cancelQuery(); onTerminateSteps(); }}
                className="bg-red-600 hover:bg-red-500 rounded-lg px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1.5"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <rect x="2" y="2" width="8" height="8" rx="1" />
                </svg>
                Stop
              </button>
            ) : (
              <button
                type="submit"
                disabled={!docReady || !input.trim()}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed
                           rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              >
                Send
              </button>
            )}
          </div>
          {lastTokenCount !== null && (
            <div className="mt-2 flex items-center gap-1.5 animate-fade-in">
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="opacity-50">
                <rect x="1" y="3" width="10" height="2" rx="1" fill="#6b7280"/>
                <rect x="1" y="7" width="7"  height="2" rx="1" fill="#6b7280"/>
              </svg>
              <span className="text-xs text-gray-500">
                Last query: <span className="text-gray-400 font-medium">~{lastTokenCount} token{lastTokenCount !== 1 ? "s" : ""}</span>
              </span>
            </div>
          )}
        </form>
      </div>
    </>
  );
}
