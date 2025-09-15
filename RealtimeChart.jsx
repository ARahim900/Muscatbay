import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area } from "recharts";

export default function RealtimeChart({ title, data, dataKey, color = "#00D2B3", unit = "" }) {
  return (
    <Card className="card-elevation">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart 
              data={data}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id={`realtimeGradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.4}/>
                  <stop offset="95%" stopColor={color} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="time" 
                stroke="#9ca3af"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="#9ca3af"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                domain={['dataMin - 5', 'dataMax + 5']}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(5px)',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  borderRadius: '1rem',
                  boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value) => [`${value}${unit}`, title]}
              />
              <Area 
                type="natural" 
                dataKey={dataKey} 
                stroke={color}
                strokeWidth={3}
                fill={`url(#realtimeGradient-${dataKey})`}
                dot={false}
                activeDot={{ r: 6, stroke: color, strokeWidth: 2, fill: 'white' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}