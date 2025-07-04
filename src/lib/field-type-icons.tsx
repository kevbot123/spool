import { 
  Text, 
  Blocks, 
  Image as ImageIcon, 
  Hash, 
  ToggleRight, 
  Calendar, 
  Clock, 
  ChevronDown, 
  ListFilter,
  Braces,
  LucideIcon,
  LetterText,
  Type
} from 'lucide-react';
import { FieldConfig } from '@/types/cms';

export interface FieldTypeInfo {
  value: FieldConfig['type'];
  label: string;
  description: string;
  icon: LucideIcon;
}

export const FIELD_TYPES: FieldTypeInfo[] = [
  { value: 'markdown', label: 'Body (Block Editor or Markdown)', description: 'Rich text editor with markdown', icon: LetterText },
  { value: 'text', label: 'Plain Text', description: 'Single line text input', icon: Type },
  { value: 'image', label: 'Image', description: 'Image upload', icon: ImageIcon },
  { value: 'number', label: 'Number', description: 'Numeric input', icon: Hash },
  { value: 'boolean', label: 'Boolean', description: 'True/false toggle', icon: ToggleRight },
  { value: 'date', label: 'Date', description: 'Date picker', icon: Calendar },
  { value: 'datetime', label: 'Date & Time', description: 'Date and time picker', icon: Clock },
  { value: 'select', label: 'Select', description: 'Single dropdown selection', icon: ChevronDown },
  { value: 'multiselect', label: 'Multi-select', description: 'Multiple dropdown selections', icon: ListFilter },
  { value: 'reference', label: 'Reference', description: 'Reference to another collection item', icon: ChevronDown },
  { value: 'multi-reference', label: 'Multi-reference', description: 'Multiple references to collection items', icon: ListFilter },
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