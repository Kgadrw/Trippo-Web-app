import { useEffect, useState } from "react";

interface UptimeTimelineProps {
  uptime: number; // in seconds
  serverStartTime?: string;
}

export function UptimeTimeline({ uptime, serverStartTime }: UptimeTimelineProps) {
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // Calculate timeline data
  const now = currentTime;
  const startTime = serverStartTime ? new Date(serverStartTime).getTime() : now - (uptime * 1000);
  
  // Get last 3 months of data
  const months: Array<{ name: string; days: number; startDate: Date }> = [];
  const today = new Date(now);
  
  for (let i = 2; i >= 0; i--) {
    const date = new Date(today);
    date.setMonth(date.getMonth() - i);
    const monthName = date.toLocaleDateString('en-US', { month: 'short' });
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    months.push({
      name: monthName,
      days: daysInMonth,
      startDate: new Date(date.getFullYear(), date.getMonth(), 1),
    });
  }

  // Calculate total days in the 3-month period
  const totalDays = months.reduce((sum, month) => sum + month.days, 0);
  
  // Calculate which day we're currently on (relative to the start of the 3-month period)
  const firstMonthStart = months[0].startDate.getTime();
  const daysSinceStart = Math.floor((now - firstMonthStart) / (24 * 60 * 60 * 1000));
  
  // System has been up since serverStartTime
  const systemUpSince = startTime;
  const daysSinceSystemStart = Math.floor((now - systemUpSince) / (24 * 60 * 60 * 1000));
  
  // Determine status for each day
  const getDayStatus = (dayIndex: number): 'up' | 'down' | 'future' => {
    if (dayIndex > daysSinceStart) return 'future';
    // If system started before this day, it was up
    const dayStart = firstMonthStart + (dayIndex * 24 * 60 * 60 * 1000);
    if (systemUpSince <= dayStart) return 'up';
    return 'down';
  };

  // Create status periods - every day should have a status line
  const statusPeriods: Array<{ startDay: number; endDay: number; status: 'up' | 'down' }> = [];
  
  let currentPeriodStart = 0;
  let currentStatus: 'up' | 'down' | null = null;
  
  for (let i = 0; i <= Math.min(daysSinceStart, totalDays - 1); i++) {
    const status = getDayStatus(i);
    if (status === 'future') break;
    
    if (currentStatus === null) {
      // First day
      currentStatus = status;
      currentPeriodStart = i;
    } else if (status !== currentStatus) {
      // Status changed - save previous period and start new one
      statusPeriods.push({
        startDay: currentPeriodStart,
        endDay: i - 1,
        status: currentStatus,
      });
      currentPeriodStart = i;
      currentStatus = status;
    }
  }
  
  // Add the last period
  if (currentStatus !== null) {
    statusPeriods.push({
      startDay: currentPeriodStart,
      endDay: Math.min(daysSinceStart, totalDays - 1),
      status: currentStatus,
    });
  }

  // Calculate month positions
  let dayOffset = 0;
  const monthPositions = months.map(month => {
    const position = (dayOffset / totalDays) * 100;
    dayOffset += month.days;
    return { ...month, position, width: (month.days / totalDays) * 100 };
  });

  // Get day information for tooltip
  const getDayInfo = (dayIndex: number) => {
    if (dayIndex < 0 || dayIndex > daysSinceStart) return null;
    const dayStart = firstMonthStart + (dayIndex * 24 * 60 * 60 * 1000);
    const dayEnd = dayStart + (24 * 60 * 60 * 1000);
    const status = getDayStatus(dayIndex);
    const date = new Date(dayStart);
    
    return {
      date,
      status,
      dateString: date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      }),
      isLive: dayIndex === daysSinceStart,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    const dayIndex = Math.floor((percentage / 100) * totalDays);
    
    if (dayIndex >= 0 && dayIndex <= daysSinceStart) {
      setHoveredDay(dayIndex);
      // Position tooltip above cursor, but adjust if near screen edges
      const tooltipX = e.clientX;
      const tooltipY = e.clientY - 60;
      setTooltipPosition({ x: tooltipX, y: tooltipY });
    } else {
      setHoveredDay(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredDay(null);
  };

  const dayInfo = hoveredDay !== null ? getDayInfo(hoveredDay) : null;

  return (
    <div className="w-full">
      <div 
        className="relative h-20 bg-white rounded-lg overflow-hidden border border-gray-300 cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Day markers - thin grey lines */}
        {Array.from({ length: totalDays }).map((_, dayIndex) => {
          const position = (dayIndex / totalDays) * 100;
          return (
            <div
              key={dayIndex}
              className="absolute top-0 bottom-0 w-px bg-gray-200"
              style={{ left: `${position}%` }}
            />
          );
        })}

        {/* Status lines - colored vertical lines for each day */}
        {Array.from({ length: Math.min(daysSinceStart + 1, totalDays) }).map((_, dayIndex) => {
          const position = (dayIndex / totalDays) * 100;
          const status = getDayStatus(dayIndex);
          const isHovered = hoveredDay === dayIndex;
          
          if (status === 'future') return null;
          
          return (
            <div
              key={dayIndex}
              className={`absolute top-0 bottom-0 w-1 transition-opacity ${
                status === 'up' ? 'bg-green-500' : 'bg-red-500'
              } ${
                isHovered ? 'opacity-100 z-20' : 'opacity-90'
              }`}
              style={{
                left: `${position}%`,
              }}
            />
          );
        })}

        {/* Hover indicator line */}
        {hoveredDay !== null && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-20 pointer-events-none"
            style={{ left: `${(hoveredDay / totalDays) * 100}%` }}
          />
        )}

        {/* Current time indicator - green vertical line for live */}
        {daysSinceStart >= 0 && daysSinceStart < totalDays && (
          <div
            className="absolute top-0 bottom-0 w-1 bg-green-600 z-30 pointer-events-none shadow-lg"
            style={{ left: `${(daysSinceStart / totalDays) * 100}%` }}
          />
        )}
      </div>

      {/* Month labels - below the diagram */}
      <div className="relative mt-2 h-6">
        {monthPositions.map((month, index) => (
          <div
            key={index}
            className="absolute text-xs text-gray-600 font-medium"
            style={{ 
              left: `${month.position}%`,
              transform: 'translateX(0)',
            }}
          >
            {month.name}
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {hoveredDay !== null && dayInfo && (
        <div
          className="fixed z-50 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl pointer-events-none border border-gray-700"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="font-medium mb-1.5">{dayInfo.dateString}</div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              dayInfo.status === 'up' ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <span className="capitalize">{dayInfo.status === 'up' ? 'Online' : 'Offline'}</span>
            {dayInfo.isLive && (
              <span className="ml-2 px-1.5 py-0.5 bg-green-600 rounded text-xs font-medium">LIVE</span>
            )}
          </div>
          <div className="mt-1.5 pt-1.5 border-t border-gray-700 text-gray-400">
            Day {hoveredDay + 1} of {totalDays}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-gray-600">Online</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span className="text-gray-600">Offline</span>
          </div>
        </div>
        <div className="text-gray-500">
          Uptime: {Math.floor(uptime / 86400)}d {Math.floor((uptime % 86400) / 3600)}h {Math.floor((uptime % 3600) / 60)}m
        </div>
      </div>
    </div>
  );
}
