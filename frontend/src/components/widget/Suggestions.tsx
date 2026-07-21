"use client";

interface SuggestionsProps {
  onSelect: (suggestion: string) => void;
}

export default function Suggestions({ onSelect }: SuggestionsProps) {
  const suggestions = [
    "Book Appointment",
    "Teeth Whitening",
    "Dental Implants",
    "Emergency Visit",
  ];

  return (
    <div className="flex flex-wrap gap-2 mt-4">
      {suggestions.map((suggestion) => (
        <button
          key={suggestion}
          onClick={() => onSelect(suggestion)}
          className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-full transition-colors"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
