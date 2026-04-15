export function SectionCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="animate-pulse bg-gray-200 rounded h-3 w-32 mb-4" />
      <div className="space-y-2">
        <div className="animate-pulse bg-gray-100 rounded h-3 w-[70%]" />
        <div className="animate-pulse bg-gray-100 rounded h-3 w-[90%]" />
        <div className="animate-pulse bg-gray-100 rounded h-3 w-[50%]" />
      </div>
    </div>
  );
}
