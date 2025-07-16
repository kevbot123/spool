import React, { useState } from 'react';
import { FieldConfig, CollectionConfig } from '@/types/cms';
import { DEFAULT_FIELDS } from '@/lib/cms/defaultFields';
import { FieldEditorModal } from '@/components/admin/CollectionSetupModal';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface MappingStepProps {
  /** Collection being imported into – can be existing or new (empty fields) */
  collection: CollectionConfig;
  csvHeaders: string[];
  sampleRow: Record<string, any>;
  /**
   * Submit handler. For existing collections, only mapping is required.
   * For new collections, an updated CollectionConfig containing any newly created fields will be passed as second arg.
   */
  onSubmit: (mapping: Record<string, string>, updatedCollection?: CollectionConfig) => void;
  onBack: () => void;
}

/**
 * Step 2 of the wizard – allow users to map each CSV column header to an
 * existing (or new) field in the collection.
 */
export const MappingStep: React.FC<MappingStepProps> = ({
  collection,
  csvHeaders,
  sampleRow,
  onSubmit,
  onBack,
}) => {
  const [customFields, setCustomFields] = useState<FieldConfig[]>([]);
  const [showFieldEditor, setShowFieldEditor] = useState(false);
  const [pendingColumn, setPendingColumn] = useState<string | null>(null);
  const [mapping, setMapping] = React.useState<Record<string, string>>({});

  const handleChange = (column: string, fieldName: string) => {
    setMapping((prev) => {
      const newMapping = { ...prev };
      if (fieldName === '__IGNORE__') {
        delete newMapping[column];
      } else {
        newMapping[column] = fieldName;
      }
      return newMapping;
    });
  };

  // Build unified list of selectable field names.
  // Start with centralized DEFAULT_FIELDS (excluding the reserved "status" field),
  // merge with existing collection field names, and finally any custom fields
  // created during this step. Use a Set to avoid duplicates.
  const defaultSelectable = DEFAULT_FIELDS.filter((f) => f.name !== 'status').map((f) => f.name);
  const baseSelectable = Array.from(new Set([
    ...defaultSelectable,
    ...collection.fields.map((f) => f.name),
  ]));

  const selectableFieldNames = [...baseSelectable, ...customFields.map((f) => f.name)];

  const mappedFields = Object.values(mapping);

  // A field is considered required if it is marked `required` on the collection
  // OR if it is one of the base system fields that must always be present.
  // Only `title` and `slug` are mandatory for import – we intentionally ignore
  // any other `required` flags in the collection schema to make bulk import
  // easier.
  const requiredFieldNames: string[] = ['title', 'slug'];

  const allRequiredMapped = requiredFieldNames.every((field) =>
    mappedFields.includes(field),
  );

  return (
    <>
    <div className="flex flex-col gap-6 px-1">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm border-collapse">
          <thead>
          <tr className="text-left border-b">
            <th className="py-2 px-1">CSV Column</th>
            <th className="py-2 px-1">Sample Value</th>
            <th className="py-2 px-1">Map To Field</th>
          </tr>
        </thead>
        <tbody>
          {csvHeaders.map((header) => (
            <tr key={header} className="border-b last:border-none">
              <td className="py-2 px-1 font-medium">{header}</td>
              <td className="py-2 px-1 truncate max-w-[240px] opacity-50">
                {String(sampleRow[header] ?? '')}
              </td>
              <td className="py-2 px-1">
                <Select
                  value={mapping[header] || '__IGNORE__'}
                  onValueChange={(val) => {
                    if (val === '__CREATE_FIELD__') {
                      setPendingColumn(header);
                      setShowFieldEditor(true);
                      return;
                    }
                    handleChange(header, val);
                  }}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select field" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__CREATE_FIELD__" className="text-primary flex gap-2 items-center">
                      <Plus className="w-4 h-4" /> Create field
                    </SelectItem>
                    <SelectItem value="__IGNORE__">— Do not import —</SelectItem>
                    {selectableFieldNames.map((name: string) => (
                      <SelectItem key={name} value={name}>
                        {name.charAt(0).toUpperCase() + name.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={() => onSubmit(mapping, { ...collection, fields: [...collection.fields, ...customFields] })} disabled={!allRequiredMapped}>
          Import
        </Button>
      </div>
    </div>

    <FieldEditorModal
      isOpen={showFieldEditor}
      onClose={() => {
        setShowFieldEditor(false);
        setPendingColumn(null);
      }}
      onSave={(field) => {
        setCustomFields(prev => [...prev, field]);
        if (pendingColumn) {
          handleChange(pendingColumn, field.name);
        }
        setShowFieldEditor(false);
      }}
      field={null}
      existingFieldNames={[...collection.fields.map((f) => f.name), ...customFields.map((f) => f.name)]}
     />
    </> 
  );
};
