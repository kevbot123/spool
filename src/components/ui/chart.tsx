"use client"

import * as React from "react"
import { type TooltipProps } from "recharts"
import { cn } from "@/lib/utils"

export type ChartConfig = Record<
  string,
  {
    label: string
    color?: string
  }
>

interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  config: ChartConfig
}

export function ChartContainer({
  config,
  children,
  className,
  ...props
}: ChartContainerProps) {
  return (
    <div
      className={cn("h-full w-full", className)}
      style={
        {
          "--chart-1": "var(--primary)",
          "--chart-2": "hsl(var(--primary) / 0.5)",
          "--chart-3": "hsl(var(--primary) / 0.2)",
          "--chart-4": "hsl(var(--muted))",
          "--chart-5": "hsl(var(--muted) / 0.5)",
          ...Object.fromEntries(
            Object.entries(config).map(([key, value]) => [
              `--color-${key}`,
              value.color,
            ])
          ),
        } as React.CSSProperties
      }
      {...props}
    >
      {children}
    </div>
  )
}

interface ChartTooltipContentProps<TData extends object> {
  active?: boolean
  payload?: TooltipProps<number, string>["payload"]
  label?: string
  labelFormatter?: (label: string, payload?: TooltipProps<number, string>["payload"]) => React.ReactNode
  valueFormatter?: (value: number) => string
  className?: string
  nameKey?: string
}

export function ChartTooltipContent<TData extends object>({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
  className,
  nameKey,
}: ChartTooltipContentProps<TData>) {
  if (active && payload?.length) {
    return (
      <div
        className={cn(
          "rounded-lg border bg-background p-2 shadow-sm",
          className
        )}
      >
        <div className="grid gap-0.5">
          <p className="text-xs text-muted-foreground">
            {labelFormatter ? labelFormatter(label as string) : label}
          </p>
          {payload.map((entry, index) => (
            <div
              key={`item-${index}`}
              className="flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-1">
                <div
                  className="h-1 w-1 rounded-full"
                  style={{
                    background: entry.color,
                  }}
                />
                <span className="text-xs font-medium">
                  {nameKey ? nameKey : entry.name}
                </span>
              </div>
              <span className="text-xs font-medium">
                {valueFormatter
                  ? valueFormatter(entry.value as number)
                  : entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return null
}

export function ChartTooltip<TData extends object>(
  props: TooltipProps<number, string> & {
    content?: React.ReactNode
  }
) {
  const { content, ...rest } = props
  if (content) {
    return content as React.ReactElement
  }
  
  // Simple pass-through to the default Recharts tooltip
  return <ChartTooltipContent {...rest as any} />
}
