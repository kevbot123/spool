'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface DestructiveActionDialogProps {
  /** Element that opens the dialog. Rendered with Radix `asChild`. */
  trigger: React.ReactNode;
  /** Title text at top of dialog. */
  title?: string;
  /** Optional description text */
  description?: string;
  /** Confirm button label */
  confirmText?: string;
  /** Cancel button label */
  cancelText?: string;
  /** Called when user confirms */
  onConfirm: () => void | Promise<void>;
  /** If provided, user must type this to enable confirm */
  confirmInputText?: string;
}

export function DestructiveActionDialog({
  trigger,
  title = 'Are you sure?',
  description,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  onConfirm,
  confirmInputText,
}: DestructiveActionDialogProps) {
  const [input, setInput] = useState('');

  const isDisabled = confirmInputText ? input !== confirmInputText : false;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>

        {confirmInputText && (
          <Input
            placeholder={confirmInputText}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        )}

        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline">{cancelText}</Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild disabled={isDisabled}>
            <Button variant="destructive" onClick={onConfirm} disabled={isDisabled}>
              {confirmText}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} 