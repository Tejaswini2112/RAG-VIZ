import { useState, useCallback, useEffect } from "react";
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
  const [activeTab, setActiveTab] = useState<"chat" | "pipeline">("chat");

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

  const terminateRunningSteps = useCallback(() => {
    setSteps((prev) =>
      prev.map((s) => (s.status === "running" ? { ...s, status: "terminated" as const } : s))
    );
  }, []);

  const addMessage = useCallback((msg: Message) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  // On mobile: auto-switch to pipeline tab when steps start streaming
  useEffect(() => {
    if (steps.length === 1) setActiveTab("pipeline");
  }, [steps.length]);

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100 overflow-hidden">
      {/* Mobile tab bar — hidden on lg+ */}
      <div className="lg:hidden flex-none border-b border-gray-800 flex">
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === "chat"
              ? "text-blue-400 border-b-2 border-blue-500"
              : "text-gray-500 hover:text-gray-400"
          }`}
        >
          Chat
        </button>
        <button
          onClick={() => setActiveTab("pipeline")}
          className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
            activeTab === "pipeline"
              ? "text-indigo-400 border-b-2 border-indigo-500"
              : "text-gray-500 hover:text-gray-400"
          }`}
        >
          Pipeline
          {steps.filter((s) => s.step !== "done").length > 0 && activeTab !== "pipeline" && (
            <span className="absolute top-2 right-[calc(50%-20px)] w-1.5 h-1.5 rounded-full bg-indigo-400" />
          )}
        </button>
      </div>

      {/* Panels */}
      <div className="flex flex-1 overflow-hidden lg:flex-row">
        {/* Left panel — chat */}
        <div className={`${activeTab === "chat" ? "flex" : "hidden"} lg:flex w-full lg:w-1/2 border-r border-gray-800 flex-col min-h-0`}>
          <ChatPanel
            messages={messages}
            onAddMessage={addMessage}
            onStep={addStep}
            onClearSteps={clearSteps}
            onTerminateSteps={terminateRunningSteps}
          />
        </div>

        {/* Right panel — pipeline trace */}
        <div className={`${activeTab === "pipeline" ? "flex" : "hidden"} lg:flex w-full lg:w-1/2 flex-col min-h-0`}>
          <PipelinePanel steps={steps} />
        </div>
      </div>
    </div>
  );
}
