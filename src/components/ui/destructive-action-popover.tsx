
'use client';

import { useState } from 'react';
import { PopoverTrigger } from '@radix-ui/react-popover';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface DestructiveActionPopoverProps {
  /**
   * The element that will act as the trigger for opening the confirmation popover.
   * This element will be rendered as-is using Radix's `asChild` mechanism so it can be
   * any interactive element (e.g. `button`, `DropdownMenuItem`, etc.).
   */
  trigger: React.ReactNode;
  /**
   * Optional title displayed at the top of the popover.
   * @default "Are you sure?"
   */
  title?: string;
  /**
   * Optional description shown under the title to give more context on the action.
   */
  description?: string;
  /**
   * Label for the destructive confirmation button.
   * @default "Delete"
   */
  confirmText?: string;
  /**
   * Label for the cancel button.
   * @default "Cancel"
   */
  cancelText?: string;
  /**
   * Callback invoked after the user confirms the action.
   */
  onConfirm: () => void | Promise<void>;
  /**
   * If provided, the user must type this exact string before the confirm button
   * becomes enabled. Useful for high-risk actions like permanently deleting data.
   */
  confirmInputText?: string;
}

export function DestructiveActionPopover({
  trigger,
  title = 'Are you sure?',
  description,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  onConfirm,
  confirmInputText,
}: DestructiveActionPopoverProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const handleConfirm = async () => {
    await onConfirm();
    setOpen(false);
  };

  const isConfirmDisabled = confirmInputText
    ? inputValue !== confirmInputText
    : false;

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverPrimitive.Content align="end" sideOffset={4} className="z-50 w-80 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none space-y-4">
        <div>
          <h4 className="text-base font-medium">{title}</h4>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
              {description}
            </p>
          )}
        </div>

        {confirmInputText && (
          <Input
            placeholder={confirmInputText}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            {cancelText}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={isConfirmDisabled}
            onClick={handleConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Root>
  );
} 