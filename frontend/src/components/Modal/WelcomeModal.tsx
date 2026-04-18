interface Props {
  onLoadAndTry: () => void;
  onExploreManually: () => void;
}

export default function WelcomeModal({ onLoadAndTry, onExploreManually }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm mx-4 p-6 shadow-2xl animate-fade-in">

        {/* Icon */}
        <div className="w-12 h-12 rounded-xl bg-blue-600/15 border border-blue-500/25 flex items-center justify-center mx-auto mb-4">
          <svg width="22" height="22" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="3"  cy="8"  r="2"   fill="#60a5fa" />
            <circle cx="13" cy="4"  r="1.5" fill="#818cf8" />
            <circle cx="13" cy="12" r="1.5" fill="#818cf8" />
            <line x1="5" y1="7.3" x2="11" y2="4.7"  stroke="#60a5fa" strokeWidth="1" strokeOpacity="0.7" />
            <line x1="5" y1="8.7" x2="11" y2="11.3" stroke="#60a5fa" strokeWidth="1" strokeOpacity="0.7" />
          </svg>
        </div>

        <h2 className="text-lg font-semibold text-center mb-1">Welcome to RAG VIZ</h2>
        <p className="text-xs text-gray-500 text-center mb-5">A step-by-step RAG pipeline visualizer</p>

        {/* Steps */}
        <div className="space-y-3 mb-6">
          {[
            {
              color: "bg-blue-500/15 text-blue-400",
              icon: (
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 14H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h5l4 4v7a1 1 0 0 1-1 1z" />
                  <polyline points="9,2 9,6 13,6" />
                </svg>
              ),
              text: "Upload a document to build the knowledge base",
            },
            {
              color: "bg-violet-500/15 text-violet-400",
              icon: (
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M8 2a5 5 0 0 1 0 10H4l-2 2V8a5 5 0 0 1 6-6z" />
                </svg>
              ),
              text: "Ask a question to trigger the RAG pipeline",
            },
            {
              color: "bg-indigo-500/15 text-indigo-400",
              icon: (
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="4" cy="8" r="1.5" /><circle cx="12" cy="4" r="1.5" /><circle cx="12" cy="12" r="1.5" />
                  <line x1="5.5" y1="7.2" x2="10.5" y2="4.8" /><line x1="5.5" y1="8.8" x2="10.5" y2="11.2" />
                </svg>
              ),
              text: "Watch every pipeline step execute in real time",
            },
          ].map(({ color, icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <span className={`w-7 h-7 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
                {icon}
              </span>
              <p className="text-xs text-gray-300">{text}</p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={onLoadAndTry}
            className="w-full bg-blue-600 hover:bg-blue-500 text-sm font-medium py-2.5 rounded-xl transition-colors"
          >
            Load Sample &amp; Try
          </button>
          <button
            onClick={onExploreManually}
            className="w-full bg-gray-800 hover:bg-gray-700 text-sm font-medium py-2.5 rounded-xl transition-colors text-gray-300"
          >
            Explore Manually
          </button>
        </div>
      </div>
    </div>
  );
}
