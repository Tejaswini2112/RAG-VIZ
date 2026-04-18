interface Props {
  question: string;
  category: string;
  categoryColor: string;
  onClick: (q: string) => void;
  disabled?: boolean;
}

export default function SuggestedQuestion({ question, category, categoryColor, onClick, disabled }: Props) {
  return (
    <button
      type="button"
      onClick={() => onClick(question)}
      disabled={disabled}
      className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-all
        ${disabled
          ? "border-gray-800 text-gray-600 cursor-not-allowed opacity-50"
          : "border-gray-700 hover:border-gray-500 hover:bg-gray-800/60 text-gray-300 cursor-pointer"
        }`}
    >
      <span className={`text-[10px] font-semibold uppercase tracking-wider mr-2 ${disabled ? "text-gray-700" : categoryColor}`}>
        {category}
      </span>
      {question}
    </button>
  );
}
