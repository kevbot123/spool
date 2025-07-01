'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export function DatePicker({
  date,
  setDate,
  className,
  disabled,
  withTime = false,
  hidePlaceholder = false,
}: {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  className?: string;
  disabled?: (date: Date) => boolean;
  withTime?: boolean;
  hidePlaceholder?: boolean;
}) {
  // Local state for time when withTime enabled
  const [timeValue, setTimeValue] = React.useState<string>(() => {
    if (date) {
      return format(date, 'HH:mm');
    }
    return '12:00';
  });

  // Update time value when external date changes
  React.useEffect(() => {
    if (date) {
      setTimeValue(format(date, 'HH:mm'));
    }
  }, [date]);

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    setTimeValue(newTime);
    if (!date) return; // wait until a date is picked
    const [hours, minutes] = newTime.split(':').map(Number);
    const updated = new Date(date);
    if (!isNaN(hours) && !isNaN(minutes)) {
      updated.setHours(hours);
      updated.setMinutes(minutes);
      updated.setSeconds(0, 0);
      setDate(updated);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={'outline'}
          className={cn(
            'w-[280px] justify-start text-left font-normal bg-inherit',
            !date && 'text-muted-foreground',
            className
          )}
        >
          {/* <CalendarIcon className="mr-2 h-4 w-4" /> */}
          {date ? (withTime ? format(date, 'PPP p') : format(date, 'PPP')) : (
            hidePlaceholder ? <span className="opacity-0 select-none">&nbsp;</span> : <span>Pick a date</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          disabled={disabled}
          defaultMonth={date}
          initialFocus
        />
        {withTime && (
          <div className="p-3 border-t flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Time:</span>
            <input
              type="time"
              value={timeValue}
              onChange={handleTimeChange}
              className="border rounded px-2 py-1 text-sm outline-none"
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
} 