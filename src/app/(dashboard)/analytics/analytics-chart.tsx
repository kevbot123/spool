"use client"

import React from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface DailyChat {
  date: string
  chats: number
}

interface AnalyticsChartProps {
  data: DailyChat[]
}

export function AnalyticsChart({ data }: AnalyticsChartProps) {
  // Format data for the chart and use only the last 30 days
  const chartData = data
    .slice(0, 30)
    .map(item => ({
      date: item.date,
      chats: item.chats
    }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis 
          dataKey="date" 
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={32}
          tickFormatter={(value) => {
            try {
              return new Date(value).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            } catch (e) {
              return value
            }
          }}
        />
        <YAxis hide />
        <Tooltip 
          formatter={(value: number) => [`${value} chats`, 'Chats']}
          labelFormatter={(value) => {
            try {
              return new Date(value).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            } catch (e) {
              return value
            }
          }}
        />
        <Bar 
          dataKey="chats" 
          fill="var(--primary)" 
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
