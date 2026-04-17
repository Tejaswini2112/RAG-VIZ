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
   */
  const addStep = useCallback((step: PipelineStep) => {
    setSteps((prev) => {
      const idx = prev.findIndex((s) => s.step === step.step);
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
