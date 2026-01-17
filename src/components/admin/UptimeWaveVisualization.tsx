import { useEffect, useState } from "react";

interface UptimeWaveVisualizationProps {
  uptime: number; // in seconds
}

export function UptimeWaveVisualization({ uptime }: UptimeWaveVisualizationProps) {
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate uptime percentage (assuming 24 hours as reference)
  const hours = uptime / 3600;
  const days = Math.floor(hours / 24);
  const uptimePercentage = Math.min(100, (uptime / (30 * 24 * 3600)) * 100); // 30 days reference

  // Generate wave pattern with multiple waves for better visualization
  const wavePoints = [];
  const width = 1000;
  const height = 128;
  const waveAmplitude = 12;
  const waveFrequency = 0.015;
  const segments = 200;
  const timeOffset = currentTime / 200;

  for (let i = 0; i <= segments; i++) {
    const x = (i / segments) * width;
    // Create multiple overlapping waves for a more complex pattern
    const wave1 = Math.sin(x * waveFrequency + timeOffset) * waveAmplitude;
    const wave2 = Math.sin(x * waveFrequency * 1.5 + timeOffset * 1.3) * (waveAmplitude * 0.6);
    const wave3 = Math.sin(x * waveFrequency * 2 + timeOffset * 0.8) * (waveAmplitude * 0.3);
    const y = height / 2 + wave1 + wave2 + wave3;
    wavePoints.push({ x, y });
  }

  // Create SVG path for the wave
  const pathData = wavePoints
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  return (
    <div className="relative w-full h-full">
      <svg
        viewBox="0 0 1000 128"
        className="w-full h-full"
        preserveAspectRatio="none"
      >
        {/* Background gradient */}
        <defs>
          <linearGradient id="waveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="waveFill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Wave fill area */}
        <path
          d={`${pathData} L 1000 ${height} L 0 ${height} Z`}
          fill="url(#waveFill)"
        />

        {/* Wave line */}
        <path
          d={pathData}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          className="animate-pulse"
        />

        {/* Uptime indicator line */}
        <line
          x1={(uptimePercentage / 100) * width}
          y1="0"
          x2={(uptimePercentage / 100) * width}
          y2={height}
          stroke="#10b981"
          strokeWidth="2"
          strokeDasharray="4 4"
          opacity="0.7"
        />

        {/* Status indicators */}
        <circle cx="50" cy={height / 2} r="4" fill="#10b981" className="animate-pulse" />
        <text x="60" y={height / 2 + 4} fill="#10b981" fontSize="12" fontWeight="500">
          Online
        </text>

        {/* Uptime text */}
        <text
          x="500"
          y={height / 2}
          fill="#1e40af"
          fontSize="14"
          fontWeight="600"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {days > 0 ? `${days}d ` : ''}{Math.floor((hours % 24))}h {Math.floor((uptime % 3600) / 60)}m
        </text>
      </svg>
    </div>
  );
}
