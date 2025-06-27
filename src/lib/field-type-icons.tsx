import { 
  Text, 
  Blocks, 
  Image as ImageIcon, 
  Hash, 
  ToggleRight, 
  Calendar, 
  Clock, 
  ChevronDownSquare, 
  Braces,
  LucideIcon
} from 'lucide-react';
import { FieldConfig } from '@/types/cms';

export interface FieldTypeInfo {
  value: FieldConfig['type'];
  label: string;
  description: string;
  icon: LucideIcon;
}

export const FIELD_TYPES: FieldTypeInfo[] = [
  { value: 'markdown', label: 'Body (Block Editor or Markdown)', description: 'Rich text editor with markdown', icon: Blocks },
  { value: 'text', label: 'Plain Text', description: 'Single line text input', icon: Text },
  { value: 'image', label: 'Image', description: 'Image upload', icon: ImageIcon },
  { value: 'number', label: 'Number', description: 'Numeric input', icon: Hash },
  { value: 'boolean', label: 'Boolean', description: 'True/false toggle', icon: ToggleRight },
  { value: 'date', label: 'Date', description: 'Date picker', icon: Calendar },
  { value: 'datetime', label: 'Date & Time', description: 'Date and time picker', icon: Clock },
  { value: 'select', label: 'Select', description: 'Dropdown selection', icon: ChevronDownSquare },
  { value: 'json', label: 'JSON', description: 'Raw JSON data', icon: Braces }
];

/**
 * Get the icon component for a specific field type
 */
export function getFieldTypeIcon(fieldType: FieldConfig['type']): LucideIcon | null {
  const fieldTypeInfo = FIELD_TYPES.find(ft => ft.value === fieldType);
  return fieldTypeInfo?.icon || null;
}

/**
 * Get complete field type information
 */
export function getFieldTypeInfo(fieldType: FieldConfig['type']): FieldTypeInfo | null {
  return FIELD_TYPES.find(ft => ft.value === fieldType) || null;
} 