"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

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

interface ComboboxProps {
  options: { label: string; value: string }[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyPlaceholder?: string;
  className?: string; // Allow custom styling for the trigger button
}

export function Combobox({ 
  options, 
  value, 
  onChange, 
  placeholder = "Select option...",
  searchPlaceholder = "Search option...",
  emptyPlaceholder = "No option found.",
  className
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-[200px] justify-between", className)} // Apply custom class here
        >
          {value
            ? options.find((option) => option.value === value)?.label
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          {/* <CommandList> */}
            <CommandEmpty>{emptyPlaceholder}</CommandEmpty> {/* This might look weird without CommandList */} 
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value} // Use the actual value for cmdk's internal handling
                  onSelect={(currentValue) => { // Use the value provided by cmdk's onSelect
                    console.log('CommandItem onSelect triggered. Value:', currentValue); // <-- Add log
                    onChange(currentValue)     // Pass the actual value provided by cmdk
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          {/* </CommandList> */}
        </Command>
      </PopoverContent>
    </Popover>
  )
}
