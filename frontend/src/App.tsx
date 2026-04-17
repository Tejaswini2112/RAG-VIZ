import { useState, useCallback } from "react";
import ChatPanel from "./components/ChatPanel/ChatPanel";
import PipelinePanel from "./components/PipelinePanel/PipelinePanel";
import { PipelineStep } from "./types/pipeline";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [steps, setSteps] = useState<PipelineStep[]>([]);

  /**
   * Called by the pipeline hooks whenever a new event arrives from the backend.
   *
   * Logic: if a step with the same name already exists, update it in place.
   * This is how "running → complete" transitions work without duplicating cards:
   *   1. Backend emits { step: "retrieve", status: "running" }  → card appears with spinner
   *   2. Backend emits { step: "retrieve", status: "complete" } → same card updates to checkmark
   *
   * For retry-able steps (generate, verify), the "attempt" field in data
   * distinguishes attempt 1 from attempt 2 so they appear as separate cards.
   */
  const addStep = useCallback((step: PipelineStep) => {
    // Steps with an "attempt" field use attempt number as part of their identity
    const attempt = (step.data && typeof step.data === "object" && "attempt" in step.data)
      ? (step.data as { attempt?: number }).attempt ?? 1
      : 1;

    setSteps((prev) => {
      const idx = prev.findIndex((s) => {
        const sAttempt = (s.data && typeof s.data === "object" && "attempt" in s.data)
          ? (s.data as { attempt?: number }).attempt ?? 1
          : 1;
        return s.step === step.step && sAttempt === attempt;
      });
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = step;
        return updated;
      }
      return [...prev, step];
    });
  }, []);

  const clearSteps = useCallback(() => setSteps([]), []);

  const addMessage = useCallback((msg: Message) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden">
      {/* Left panel — chat */}
      <div className="w-1/2 border-r border-gray-800 flex flex-col min-h-0">
        <ChatPanel
          messages={messages}
          onAddMessage={addMessage}
          onStep={addStep}
          onClearSteps={clearSteps}
        />
      </div>

      {/* Right panel — pipeline trace */}
      <div className="w-1/2 flex flex-col min-h-0">
        <PipelinePanel steps={steps} />
      </div>
    </div>
  );
}
