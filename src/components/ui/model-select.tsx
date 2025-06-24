"use client"

import * as React from "react"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SiOpenai, SiAnthropic } from "react-icons/si"
import { FcGoogle } from "react-icons/fc"

export type ModelOption = {
  label: string
  value: string
  description?: string
}

interface ModelSelectProps {
  options: ModelOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  description?: string
}

export function ModelSelect({
  options,
  value,
  onChange,
  placeholder = "Select model...",
  className,
  description,
}: ModelSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((option) => {
            let IconComponent = null;
            if (option.value.startsWith('gpt')) {
              IconComponent = SiOpenai;
            } else if (option.value.startsWith('o')) {
              IconComponent = SiOpenai;
            } else if (option.value.startsWith('claude')) {
              IconComponent = SiAnthropic;
            } else if (option.value.startsWith('gemini')) {
              IconComponent = FcGoogle;
            }

            return (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  {IconComponent && (
                    <IconComponent 
                      className={`h-4 w-4 ${IconComponent !== FcGoogle ? 'text-foreground' : ''}`}
                    />
                  )}
                  <span>{option.label}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{option.description}</span>
                </div>
              </SelectItem>
            );
          })}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
