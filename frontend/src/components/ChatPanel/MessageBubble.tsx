import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Message } from "../../App";

interface Props {
  message: Message;
}

// Custom renderers so every markdown element matches the dark bubble theme
const markdownComponents = {
  p:          ({ children }: any) => <p className="mb-2 last:mb-0">{children}</p>,
  strong:     ({ children }: any) => <strong className="font-semibold text-white">{children}</strong>,
  em:         ({ children }: any) => <em className="italic">{children}</em>,
  ul:         ({ children }: any) => <ul className="list-disc ml-4 space-y-1 my-1">{children}</ul>,
  ol:         ({ children }: any) => <ol className="list-decimal ml-4 space-y-1 my-1">{children}</ol>,
  li:         ({ children }: any) => <li className="leading-relaxed">{children}</li>,
  h1:         ({ children }: any) => <h1 className="font-semibold text-white text-base mt-3 mb-1">{children}</h1>,
  h2:         ({ children }: any) => <h2 className="font-semibold text-white text-sm mt-3 mb-1">{children}</h2>,
  h3:         ({ children }: any) => <h3 className="font-semibold text-white text-sm mt-2 mb-1">{children}</h3>,
  a:          ({ href, children }: any) => (
    <a href={href} className="text-blue-400 underline hover:text-blue-300" target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-2 border-gray-500 pl-3 text-gray-400 italic my-2">{children}</blockquote>
  ),
  hr:         () => <hr className="border-gray-600 my-2" />,
  code:       ({ inline, children }: any) =>
    inline ? (
      <code className="bg-gray-700 text-blue-300 rounded px-1 font-mono text-xs">{children}</code>
    ) : (
      <code className="block bg-gray-900 text-green-300 rounded-lg p-3 font-mono text-xs overflow-x-auto my-2 whitespace-pre">
        {children}
      </code>
    ),
  pre:        ({ children }: any) => <>{children}</>,
};

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed
          ${isUser
            ? "bg-blue-600 text-white rounded-br-sm"
            : "bg-gray-800 text-gray-100 rounded-bl-sm"
          }`}
      >
        {isUser ? (
          // User messages are plain text — no markdown parsing needed
          message.content.split("\n").map((line, i, arr) => (
            <span key={i}>
              {line}
              {i < arr.length - 1 && <br />}
            </span>
          ))
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {message.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}
