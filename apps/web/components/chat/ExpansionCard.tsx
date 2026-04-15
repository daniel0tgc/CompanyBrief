export function ExpansionCard({
  question,
  content,
}: {
  question: string;
  content: string;
  createdAt: string;
}) {
  return (
    <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mt-3 animate-in fade-in duration-300">
      <p className="text-xs text-gray-500 mb-2">{question}</p>
      <p className="text-sm text-gray-800 leading-relaxed">{content}</p>
    </div>
  );
}
