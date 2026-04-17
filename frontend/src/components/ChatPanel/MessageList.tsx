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
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-600 text-sm text-center">
          Upload a document and ask a question to get started.
        </p>
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
