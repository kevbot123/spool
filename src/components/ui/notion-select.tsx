"use client"

import * as React from "react"
import { Check, X, ChevronDown, Plus } from "lucide-react"
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

interface NotionSelectProps {
  options: string[];
  value?: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  className?: string;
}

export function NotionSelect({ 
  options, 
  value, 
  onChange, 
  placeholder = "Select option...",
  className
}: NotionSelectProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between min-h-8 h-auto py-1.5 px-3 text-sm border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 transition-colors",
            !value && "text-gray-500",
            className
          )}
        >
          <span className="truncate">
            {value ? options.find((option) => option === value) || value : placeholder}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)] min-w-[275px]" align="start">
        <Command>
          <CommandInput placeholder="Search options..." className="h-9" />
          <CommandList>
            <CommandEmpty>No option found.</CommandEmpty>
            <CommandGroup>
              {/* Clear selection option */}
              {value && (
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
              {options.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={(currentValue) => {
                    onChange(currentValue === value ? null : currentValue)
                    setOpen(false)
                  }}
                  className="cursor-pointer hover:bg-gray-100"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

interface NotionMultiSelectProps {
  options: string[];
  value?: string[] | null;
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function NotionMultiSelect({ 
  options, 
  value = [], 
  onChange, 
  placeholder = "Select options...",
  className
}: NotionMultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const selectedValues = value || []

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
            "w-full justify-between min-h-8 h-auto py-1.5 px-3 text-sm border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 transition-colors",
            selectedValues.length === 0 && "text-gray-500",
            className
          )}
        >
          <div className="flex flex-wrap items-center gap-1 flex-1 min-w-0">
            {selectedValues.length === 0 ? (
              <span className="truncate">{placeholder}</span>
            ) : (
              <>
                {selectedValues.slice(0, 2).map((option) => (
                  <Badge
                    key={option}
                    variant="secondary"
                    className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                  >
                    {option}
                    <button
                      className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleRemove(option);
                        }
                      }}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleRemove(option)
                      }}
                    >
                      <X className="h-3 w-3 text-blue-600 hover:text-blue-800" />
                    </button>
                  </Badge>
                ))}
                {selectedValues.length > 2 && (
                  <Badge variant="outline" className="text-xs px-2 py-0.5 bg-gray-50 text-gray-600">
                    +{selectedValues.length - 2} more
                  </Badge>
                )}
              </>
            )}
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)] min-w-[275px]" align="start">
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
                const isSelected = selectedValues.includes(option)
                return (
                  <CommandItem
                    key={option}
                    value={option}
                    onSelect={() => handleSelect(option)}
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
                    {option}
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