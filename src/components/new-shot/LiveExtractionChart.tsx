import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { BOX_STYLE } from '../../styles/common';
import { ChartDataPoint } from '../../types';

interface LiveExtractionChartProps {
  data: ChartDataPoint[];
  compact?: boolean;
  timePoints?: {
    A?: number;
    B?: number;
    C?: number;
    D?: number;
    E?: number;
    F?: number;
  };
}

export const LiveExtractionChart: React.FC<LiveExtractionChartProps> = React.memo(({ data, compact, timePoints }) => {
  const smoothedData = useMemo(() => {
    if (data.length === 0) return [];
    
    let ema = data[0].flow;
    const alpha = 0.3; // Smoothing factor
    
    return data.map((point, index) => {
      if (index === 0) return { ...point, smoothedFlow: point.flow };
      ema = alpha * point.flow + (1 - alpha) * ema;
      return { ...point, smoothedFlow: ema };
    });
  }, [data]);

  const maxTime = useMemo(() => {
    const dataMax = data.length > 0 ? data[data.length - 1].time : 0;
    const pointsMax = timePoints ? Math.max(...Object.values(timePoints).filter((t): t is number => t !== undefined)) : 0;
    return Math.max(dataMax, pointsMax);
  }, [data, timePoints]);

  return (
    <div className={`${BOX_STYLE} ${compact ? '!h-48' : '!h-72'} !p-1 flex flex-col`}>
      <div className="text-[11px] font-bold text-[var(--color-box-label)] uppercase tracking-wider w-full text-center mb-1 drop-shadow-sm">
        PROFIL EXTRACȚIE
      </div>
      <div className="flex-1 w-full relative">
        {data.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-on-surface/30 text-xs font-bold uppercase tracking-widest z-10">
            Așteptare date...
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={smoothedData} margin={{ top: 5, right: 0, left: 0, bottom: 35 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis 
              dataKey="time" 
              type="number" 
              domain={[0, maxTime]} 
              tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
              tickCount={5}
              axisLine={false}
              tickLine={false}
              tickFormatter={(val) => `${val}s`}
            />
            <YAxis 
              yAxisId="weight"
              orientation="left"
              domain={[0, 70]} 
              tick={{ fontSize: 10, fill: '#A0522D' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(val) => `${val}g`}
              width={25}
            />
            <YAxis 
              yAxisId="pressure"
              orientation="right"
              domain={[0, 13]} 
              tick={{ fontSize: 10, fill: '#22c55e' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(val) => `${val}b`}
              width={25}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px', color: '#fff' }}
              labelStyle={{ display: 'none' }}
              formatter={(value: number, name: string) => {
                if (name === 'weight') return [`${value.toFixed(1)}g`, 'Greutate'];
                if (name === 'pressure') return [`${value.toFixed(1)} bar`, 'Presiune'];
                return [value, name];
              }}
              isAnimationActive={false}
            />
            <Line 
              yAxisId="weight"
              type="monotone" 
              dataKey="weight" 
              stroke="#A0522D" 
              strokeWidth={3} 
              dot={false}
              isAnimationActive={false}
            />
            <Line 
              yAxisId="pressure"
              type="monotone" 
              dataKey="pressure" 
              stroke="#22c55e" 
              strokeWidth={2} 
              dot={false}
              isAnimationActive={false}
            />
            {timePoints && Object.entries(timePoints).map(([label, time]) => (
              time !== undefined && time >= 0 && (
                <ReferenceLine 
                  key={label} 
                  x={time} 
                  stroke="rgba(255,255,255,0.8)" 
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  label={{ 
                    value: label, 
                    position: 'top',
                    fill: '#ffffff', 
                    fontSize: 16,
                    fontWeight: 'black',
                    style: { textShadow: '0 0 4px #000000' }
                  }} 
                />
              )
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-1 text-[10px] font-bold uppercase tracking-wider">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-1 bg-[#A0522D] rounded-full"></div>
          <span className="text-[#A0522D]">Greutate (g)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-1 bg-[#22c55e] rounded-full"></div>
          <span className="text-[#22c55e]">Presiune (bar)</span>
        </div>
      </div>
    </div>
  );
});
