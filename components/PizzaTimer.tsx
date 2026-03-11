import React from 'react';

interface PizzaTimerProps {
  total: number;
  remaining: number;
  color: string;
  size?: number;
}

const colorMap: Record<string, string> = {
  red: '#ef4444',
  yellow: '#eab308',
  purple: '#a855f7',
  blue: '#3b82f6',
  green: '#22c55e',
};

const PizzaTimer: React.FC<PizzaTimerProps> = ({
  total,
  remaining,
  color,
  size = 120,
}) => {
  const radius = size / 2;
  const strokeWidth = radius; // Full fill for pizza slice effect
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;

  const percentage = Math.max(0, Math.min(1, remaining / (total || 1)));
  const strokeDashoffset = circumference * (1 - percentage);

  const dynamicColor = React.useMemo(() => {
    return colorMap[color] || colorMap.red;
  }, [color]);

  return (
    <div className="relative flex items-center justify-center group" style={{ width: size, height: size }}>
      <svg
        height={size}
        width={size}
        className="transform -rotate-90 scale-y-[-1] drop-shadow-sm"
        style={{ overflow: 'visible' }}
      >
        {/* Background circle - Updated to a light gray for White Card aesthetic */}
        <circle
          stroke="#f9fafb"
          strokeWidth={strokeWidth}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          fill="white"
        />
        {/* Progress circle */}
        <circle
          stroke={dynamicColor}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{
            strokeDashoffset,
            transition: 'stroke-dashoffset 1s linear',
            opacity: 0.85
          }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          fill="transparent"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-[10px] font-black font-mono text-gray-900 drop-shadow-sm tabular-nums tracking-tighter">
          {formatTime(remaining)}
        </span>
      </div>
    </div>
  );
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default PizzaTimer;

