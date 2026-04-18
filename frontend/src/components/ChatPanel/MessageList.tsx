import { useEffect, useRef } from "react";
import { Message } from "../../App";
import MessageBubble from "./MessageBubble";
import SuggestedQuestion from "./SuggestedQuestion";

const SUGGESTED_QUESTIONS = [
  { category: "Basic",    categoryColor: "text-green-400",  question: "What is RAG?" },
  { category: "Advanced", categoryColor: "text-blue-400",   question: "How does RAG improve answers?" },
  { category: "Complex",  categoryColor: "text-violet-400", question: "What are the components of RAG and how do they work together?" },
  { category: "Abstract", categoryColor: "text-amber-400",  question: "Why is RAG better than fine-tuning?" },
  { category: "External", categoryColor: "text-red-400",    question: "What are the latest RAG trends in 2025?" },
];

interface Props {
  messages: Message[];
  isQuerying: boolean;
  docReady: boolean;
  isSampleDoc: boolean;
  onLoadSample: () => void;
  onSuggestedQuestion: (q: string) => void;
}

export default function MessageList({ messages, isQuerying, docReady, isSampleDoc, onLoadSample, onSuggestedQuestion }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isQuerying]);

  // ── Empty state: doc loaded, no messages yet ──────────────────────────────
  if (messages.length === 0 && docReady) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-2">
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-400">Ready to explore</p>
          <p className="text-xs text-gray-600 mt-0.5">Click a question to run the full pipeline</p>
        </div>
        <div className="w-full max-w-xs space-y-1.5">
          {SUGGESTED_QUESTIONS.map((q) => (
            <SuggestedQuestion
              key={q.question}
              question={q.question}
              category={q.category}
              categoryColor={q.categoryColor}
              onClick={onSuggestedQuestion}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Empty state: no doc, no messages ─────────────────────────────────────
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 px-2 py-6 overflow-y-auto h-full">

        {/* How it works — horizontal */}
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-400">How it works</p>
          <p className="text-xs text-gray-600 mt-0.5">Three steps to your first answer</p>
        </div>

        <div className="w-full max-w-xs grid grid-cols-3 gap-2">
          {[
            {
              colorBg: "bg-blue-500/15", colorText: "text-blue-400",
              title: "Upload", sub: "PDF · TXT · DOCX",
              icon: (
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 14H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h5l4 4v7a1 1 0 0 1-1 1z" />
                  <polyline points="9,2 9,6 13,6" />
                </svg>
              ),
            },
            {
              colorBg: "bg-violet-500/15", colorText: "text-violet-400",
              title: "Ask", sub: "About your doc",
              icon: (
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M8 2a5 5 0 0 1 0 10H4l-2 2V8a5 5 0 0 1 6-6z" />
                </svg>
              ),
            },
            {
              colorBg: "bg-indigo-500/15", colorText: "text-indigo-400",
              title: "Explore", sub: "Every step",
              icon: (
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="4" cy="8" r="1.5" /><circle cx="12" cy="4" r="1.5" /><circle cx="12" cy="12" r="1.5" />
                  <line x1="5.5" y1="7.2" x2="10.5" y2="4.8" /><line x1="5.5" y1="8.8" x2="10.5" y2="11.2" />
                </svg>
              ),
            },
          ].map(({ colorBg, colorText, title, sub, icon }) => (
            <div key={title} className="flex flex-col items-center gap-2 rounded-xl border border-gray-800 bg-gray-800/40 px-2 py-3 text-center">
              <span className={`w-7 h-7 rounded-lg ${colorBg} ${colorText} flex items-center justify-center flex-shrink-0`}>
                {icon}
              </span>
              <div>
                <p className="text-xs font-medium text-gray-300">{title}</p>
                <p className="text-[10px] text-gray-600 mt-0.5">{sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Sample doc loader */}
        <div className="w-full max-w-xs">
          <button
            type="button"
            onClick={onLoadSample}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 hover:border-blue-500/50 transition-all text-xs font-medium text-blue-400"
          >
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 14H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h5l4 4v7a1 1 0 0 1-1 1z" />
              <polyline points="9,2 9,6 13,6" />
              <line x1="8" y1="8" x2="8" y2="12" /><polyline points="6,10 8,12 10,10" />
            </svg>
            Load Sample Document
          </button>
          <p className="text-[10px] text-gray-700 text-center mt-1.5">
            Loads a built-in RAG explainer · no upload needed
          </p>
        </div>

        {/* Muted question previews */}
        <div className="w-full max-w-xs space-y-1.5">
          <p className="text-[10px] text-gray-700 uppercase tracking-widest text-center mb-2">
            Questions to try after loading
          </p>
          {SUGGESTED_QUESTIONS.map((q) => (
            <SuggestedQuestion
              key={q.question}
              question={q.question}
              category={q.category}
              categoryColor={q.categoryColor}
              onClick={onSuggestedQuestion}
              disabled
            />
          ))}
        </div>

      </div>
    );
  }

  // ── Active conversation ───────────────────────────────────────────────────
  const askedSet = new Set(messages.filter((m) => m.role === "user").map((m) => m.content.trim()));
  const followUps = SUGGESTED_QUESTIONS.filter((q) => !askedSet.has(q.question));
  const showFollowUps = isSampleDoc && !isQuerying && messages[messages.length - 1]?.role === "assistant" && followUps.length > 0;

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

      {/* Follow-up suggestions after each assistant response */}
      {showFollowUps && (
        <div className="pt-1 animate-fade-in">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">Continue exploring</p>
          <div className="space-y-1.5">
            {followUps.slice(0, 3).map((q) => (
              <SuggestedQuestion
                key={q.question}
                question={q.question}
                category={q.category}
                categoryColor={q.categoryColor}
                onClick={onSuggestedQuestion}
              />
            ))}
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
