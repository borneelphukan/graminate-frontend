import React from "react";

type Props = {
  uvIndex: number;
};

const uvLevels = [
  { label: "Low", min: 0, max: 2, color: "from-green-500 to-yellow-200" },
  { label: "Moderate", min: 3, max: 5, color: "from-yellow-200 to-orange-500" },
  { label: "High", min: 6, max: 7, color: "from-orange-500 to-red-500" },
  { label: "Very High", min: 8, max: 10, color: "from-red-500 to-purple-600" },
  {
    label: "Extreme",
    min: 11,
    max: 15,
    color: "from-purple-600 to-purple-900",
  },
];

function getUVPosition(uv: number): string {
  const minIndex = uvLevels[0].min;
  const maxIndex = uvLevels[uvLevels.length - 1].max;
  const percentage = ((uv - minIndex) / (maxIndex - minIndex)) * 100;
  return `${Math.min(100, Math.max(0, percentage))}%`;
}

const UVScale = ({ uvIndex }: Props) => {
  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto py-3 relative">
      <div className="relative w-full h-2 flex rounded-md overflow-hidden bg-gradient-to-r">
        {uvLevels.map((level, i) => (
          <div
            key={i}
            className={`flex-1 h-full bg-gradient-to-r ${level.color}`}
          ></div>
        ))}
        <div
          className="absolute top-1/2 left-0 z-50 w-2 h-2 bg-white border border-gray-500 transition-transform"
          style={{
            left: getUVPosition(uvIndex),
            transform: "translate(-50%, -50%)",
          }}
        ></div>
      </div>
    </div>
  );
};

export default UVScale;
