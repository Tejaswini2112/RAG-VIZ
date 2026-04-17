import { useEffect, useRef } from "react";
import { Message } from "../../App";
import MessageBubble from "./MessageBubble";

interface Props {
  messages: Message[];
  isQuerying: boolean;
}

export default function MessageList({ messages, isQuerying }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isQuerying]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-5 px-2">
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-400">How it works</p>
          <p className="text-xs text-gray-600 mt-0.5">Three steps to your first answer</p>
        </div>

        <div className="w-full max-w-xs space-y-2">
          {/* Step 1 */}
          <div className="flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-800/40 px-3 py-2.5">
            <span className="w-7 h-7 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 14H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h5l4 4v7a1 1 0 0 1-1 1z" />
                <polyline points="9,2 9,6 13,6" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-300">Upload a document</p>
              <p className="text-xs text-gray-600">PDF, TXT, or DOCX</p>
            </div>
            <span className="ml-auto text-xs font-bold text-gray-700 flex-shrink-0">1</span>
          </div>

          {/* Connector */}
          <div className="flex justify-center"><div className="w-px h-3 bg-gray-700" /></div>

          {/* Step 2 */}
          <div className="flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-800/40 px-3 py-2.5">
            <span className="w-7 h-7 rounded-lg bg-violet-500/15 text-violet-400 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M8 2a5 5 0 0 1 0 10H4l-2 2V8a5 5 0 0 1 6-6z" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-300">Ask a question</p>
              <p className="text-xs text-gray-600">About your document</p>
            </div>
            <span className="ml-auto text-xs font-bold text-gray-700 flex-shrink-0">2</span>
          </div>

          {/* Connector */}
          <div className="flex justify-center"><div className="w-px h-3 bg-gray-700" /></div>

          {/* Step 3 */}
          <div className="flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-800/40 px-3 py-2.5">
            <span className="w-7 h-7 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="4" cy="8" r="1.5" /><circle cx="12" cy="4" r="1.5" /><circle cx="12" cy="12" r="1.5" />
                <line x1="5.5" y1="7.2" x2="10.5" y2="4.8" /><line x1="5.5" y1="8.8" x2="10.5" y2="11.2" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-300">Explore the pipeline</p>
              <p className="text-xs text-gray-600">Every step, explained</p>
            </div>
            <span className="ml-auto text-xs font-bold text-gray-700 flex-shrink-0">3</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}

      {isQuerying && (
        <div className="flex gap-2 items-center text-sm text-gray-500">
          <span className="w-3 h-3 rounded-full border-2 border-gray-500 border-t-transparent animate-spin" />
          Thinking...
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
