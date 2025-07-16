"use client"

import * as React from "react"
import { Check, X, ChevronDown, Plus } from "lucide-react"
import { getStatusColor } from '@/lib/status-colors';
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

type Option = string | { label: string; value: string };

interface NotionSelectProps {
  options: Option[];
  value?: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  allowClearSelection?: boolean;
}

export function NotionSelect({ 
  options, 
  value, 
  onChange, 
  placeholder = "Select option...",
  className,
  disabled = false,
  allowClearSelection = true,
}: NotionSelectProps) {
  const [open, setOpen] = React.useState(false)

  const getOptionValue = (opt: Option) => (typeof opt === 'string' ? opt : opt.value)
  const getOptionLabel = (opt: Option) => (typeof opt === 'string' ? opt : opt.label)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between min-h-8 h-auto py-1 !pl-2.5 !pr-0 text-sm border-gray-200 hover:border-gray-300 bg-inherit transition-colors",
            !value && "text-gray-500",
            disabled && "opacity-50 pointer-events-none",
            className
          )}
          disabled={disabled}
        >
          <span className="truncate">
            {value ? (options.find((opt) => getOptionValue(opt) === value) ? getOptionLabel(options.find((opt) => getOptionValue(opt) === value) as Option) : value) : placeholder}
          </span>
          {/* <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /> */}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)] min-w-[275px] min-w-[225px] mt-[-2px] ml-[-1px] shadow-xl" align="start">
        <Command>
          <CommandInput placeholder="Search options..." className="h-9" />
          <CommandList>
            <CommandEmpty>No option found.</CommandEmpty>
            <CommandGroup>
              {/* Clear selection option */}
              {value && allowClearSelection && (
                <CommandItem
                  value=""
                  onSelect={() => {
                    onChange(null)
                    setOpen(false)
                  }}
                  className="text-gray-500 italic cursor-pointer hover:bg-gray-100"
                >
                  <X className="mr-2 h-4 w-4" />
                  Clear selection
                </CommandItem>
              )}
              {options.map((option) => {
                const optValue = getOptionValue(option)
                const optLabel = getOptionLabel(option)
                return (
                  <CommandItem
                    key={optValue}
                    value={optValue}
                    onSelect={(currentValue) => {
                      onChange(currentValue === value ? null : currentValue)
                      setOpen(false)
                    }}
                    className="cursor-pointer hover:bg-gray-100"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === optValue ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {['draft','published'].includes(optValue) && (
                      <span className={`mr-2 inline-block w-2 h-2 rounded-full ${getStatusColor(optValue as any)}`}/>
                    )}
                    {optLabel}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

interface NotionMultiSelectProps {
  options: Option[];
  value?: string[] | null;
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function NotionMultiSelect({ 
  options, 
  value = [], 
  onChange, 
  placeholder = "Select options...",
  className,
  disabled = false,
}: NotionMultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const selectedValues = Array.isArray(value) ? value : (value ? [value] : [])

  const getOptionValue = (opt: Option) => (typeof opt === 'string' ? opt : opt.value)
  const getOptionLabel = (opt: Option) => (typeof opt === 'string' ? opt : opt.label)

  const handleSelect = (option: string) => {
    const newValue = selectedValues.includes(option)
      ? selectedValues.filter((item) => item !== option)
      : [...selectedValues, option]
    onChange(newValue)
  }

  const handleRemove = (option: string) => {
    const newValue = selectedValues.filter((item) => item !== option)
    onChange(newValue)
  }

  const handleClear = () => {
    onChange([])
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between min-h-8 h-auto py-1 !pl-2.5 !pr-0 text-sm border-gray-200 hover:border-gray-300 bg-inherit !hover:bg-inherit",
            selectedValues.length === 0 && "text-gray-500",
            disabled && "opacity-50 pointer-events-none",
            className
          )}
          disabled={disabled}
        >
          <div className="flex flex-nowrap items-center gap-1 flex-1 min-w-0 overflow-hidden">
            {selectedValues.length === 0 ? (
              <span className="truncate">{placeholder}</span>
            ) : (
              <>
                {selectedValues.slice(0, 2).map((val) => {
                  const opt = options.find((o) => getOptionValue(o) === val)
                  const label = opt ? getOptionLabel(opt) : val
                  return (
                    <Badge
                      key={val}
                      variant="secondary"
                      className="text-xs pl-2 pr-1 py-0.5 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                    >
                      {label}
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label="Remove"
                        className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " " ) {
                            e.preventDefault();
                            handleRemove(val);
                          }
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRemove(val);
                        }}
                      >
                        <X className="h-3 w-3 text-blue-600 hover:text-blue-800" />
                      </span>
                    </Badge>
                  )
                })}
                {selectedValues.length > 2 && (
                  <Badge variant="outline" className="text-xs px-2 py-0.5 bg-gray-50 text-gray-600">
                    +{selectedValues.length - 2} more
                  </Badge>
                )}
              </>
            )}
          </div>
          {/* <ChevronDown className="h-4 w-4 shrink-0 opacity-50" /> */}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)] min-w-[225px] mt-[-2px] ml-[-1px] shadow-xl" align="start">
        <Command>
          <CommandInput placeholder="Search options..." className="h-9" />
          <CommandList>
            <CommandEmpty>No option found.</CommandEmpty>
            <CommandGroup>
              {/* Clear all option */}
              {selectedValues.length > 0 && (
                <CommandItem
                  value=""
                  onSelect={handleClear}
                  className="text-gray-500 italic border-b border-gray-100 cursor-pointer hover:bg-gray-100"
                >
                  <X className="mr-2 h-4 w-4" />
                  Clear all selections
                </CommandItem>
              )}
              {options.map((option) => {
                const optValue = getOptionValue(option)
                const optLabel = getOptionLabel(option)
                const isSelected = selectedValues.includes(optValue)
                return (
                  <CommandItem
                    key={optValue}
                    value={optValue}
                    onSelect={() => handleSelect(optValue)}
                    className="cursor-pointer hover:bg-gray-100"
                  >
                    <div className={cn(
                      "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-gray-300",
                      isSelected 
                        ? "bg-blue-600 text-white border-blue-600" 
                        : ""
                    )}>
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                    {['draft','published'].includes(optValue) && (
                      <span className={`mr-2 inline-block w-2 h-2 rounded-full ${getStatusColor(optValue as any)}`}/>
                    )}
                    {optLabel}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
} 