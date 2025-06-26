import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, GripVertical, Trash2, Edit3 } from 'lucide-react';
import { CollectionConfig, FieldConfig } from '@/types/cms';

interface CollectionSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (collection: Partial<CollectionConfig>) => Promise<void>;
  existingCollection?: CollectionConfig | null;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text', description: 'Single line text input' },
  { value: 'textarea', label: 'Textarea', description: 'Multi-line text input' },
  { value: 'markdown', label: 'Markdown', description: 'Rich text editor with markdown' },
  { value: 'number', label: 'Number', description: 'Numeric input' },
  { value: 'boolean', label: 'Boolean', description: 'True/false toggle' },
  { value: 'date', label: 'Date', description: 'Date picker' },
  { value: 'datetime', label: 'Date & Time', description: 'Date and time picker' },
  { value: 'select', label: 'Select', description: 'Dropdown selection' },
  { value: 'image', label: 'Image', description: 'Image upload' },
  { value: 'json', label: 'JSON', description: 'Raw JSON data' }
];

export default function CollectionSetupModal({
  isOpen,
  onClose,
  onSave,
  existingCollection
}: CollectionSetupModalProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [urlPattern, setUrlPattern] = useState('');
  const [fields, setFields] = useState<FieldConfig[]>([]);
  const [editingField, setEditingField] = useState<FieldConfig | null>(null);
  const [showFieldEditor, setShowFieldEditor] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Reset form when modal opens/closes or collection changes
  useEffect(() => {
    if (isOpen) {
      if (existingCollection) {
        setName(existingCollection.name);
        setSlug(existingCollection.slug);
        setDescription(existingCollection.description || '');
        setUrlPattern(existingCollection.urlPattern);
        // Filter out default fields when editing
        const customFields = existingCollection.fields.filter(field => 
          !['title', 'slug', 'body', 'status', 'publishedAt'].includes(field.name)
        );
        setFields(customFields);
      } else {
        setName('');
        setSlug('');
        setDescription('');
        setUrlPattern('');
        setFields([]);
      }
      setEditingField(null);
      setShowFieldEditor(false);
    }
  }, [isOpen, existingCollection]);

  // Auto-generate slug from name
  useEffect(() => {
    if (name && !existingCollection) {
      const generatedSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSlug(generatedSlug);
      setUrlPattern(`/${generatedSlug}/{slug}`);
    }
  }, [name, existingCollection]);

  const handleAddField = () => {
    setEditingField({
      name: '',
      label: '',
      type: 'text',
      required: false
    });
    setShowFieldEditor(true);
  };

  const handleEditField = (field: FieldConfig) => {
    setEditingField({ ...field });
    setShowFieldEditor(true);
  };

  const handleSaveField = (field: FieldConfig) => {
    if (editingField && fields.find(f => f.name === editingField.name)) {
      // Editing existing field
      setFields(fields.map(f => f.name === editingField.name ? field : f));
    } else {
      // Adding new field
      setFields([...fields, field]);
    }
    setShowFieldEditor(false);
    setEditingField(null);
  };

  const handleDeleteField = (fieldName: string) => {
    setFields(fields.filter(f => f.name !== fieldName));
  };

  const handleSave = async () => {
    if (!name.trim() || !slug.trim()) return;

    setIsLoading(true);
    try {
      await onSave({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim(),
        urlPattern: urlPattern || `/${slug.trim()}/{slug}`,
        fields: fields
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isValid = name.trim() && slug.trim();

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {existingCollection ? 'Edit Collection' : 'Create New Collection'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Collection Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Blog Posts"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">URL Slug</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="e.g. blog-posts"
                  disabled={!!existingCollection}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this collection is for..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="urlPattern">URL Pattern</Label>
              <Input
                id="urlPattern"
                value={urlPattern}
                onChange={(e) => setUrlPattern(e.target.value)}
                placeholder="e.g. /blog/{slug}"
              />
              <p className="text-sm text-muted-foreground">
                Use {`{slug}`} as a placeholder for the content item's URL slug
              </p>
            </div>

            {/* Fields Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Custom Fields</h3>
                <Button onClick={handleAddField} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Field
                </Button>
              </div>

              {/* Default fields info */}
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>Default fields (included automatically):</strong>
                </p>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary">Title</Badge>
                  <Badge variant="secondary">URL Slug</Badge>
                  <Badge variant="secondary">Content (Markdown)</Badge>
                  <Badge variant="secondary">Status</Badge>
                  <Badge variant="secondary">Published Date</Badge>
                </div>
              </div>

              {/* Custom fields list */}
              {fields.length > 0 && (
                <div className="space-y-2">
                  {fields.map((field, index) => (
                    <Card key={field.name} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                          <div>
                            <div className="font-medium">{field.label || field.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {field.type} {field.required && '• Required'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditField(field)}
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteField(field.name)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!isValid || isLoading}>
              {isLoading ? 'Saving...' : existingCollection ? 'Save Changes' : 'Create Collection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Field Editor Modal */}
      <FieldEditorModal
        isOpen={showFieldEditor}
        onClose={() => {
          setShowFieldEditor(false);
          setEditingField(null);
        }}
        onSave={handleSaveField}
        field={editingField}
        existingFieldNames={fields.map(f => f.name)}
      />
    </>
  );
}

interface FieldEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (field: FieldConfig) => void;
  field: FieldConfig | null;
  existingFieldNames: string[];
}

function FieldEditorModal({
  isOpen,
  onClose,
  onSave,
  field,
  existingFieldNames
}: FieldEditorModalProps) {
  const [name, setName] = useState('');
  const [label, setLabel] = useState('');
  const [type, setType] = useState<FieldConfig['type']>('text');
  const [required, setRequired] = useState(false);
  const [placeholder, setPlaceholder] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState('');

  useEffect(() => {
    if (field) {
      setName(field.name);
      setLabel(field.label);
      setType(field.type);
      setRequired(field.required || false);
      setPlaceholder(field.placeholder || '');
      setDescription(field.description || '');
      setOptions(field.options?.join('\n') || '');
    } else {
      setName('');
      setLabel('');
      setType('text');
      setRequired(false);
      setPlaceholder('');
      setDescription('');
      setOptions('');
    }
  }, [field]);

  // Auto-generate name from label
  useEffect(() => {
    if (label && (!field || !field.name)) {
      const generatedName = label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      setName(generatedName);
    }
  }, [label, field]);

  const handleSave = () => {
    if (!name.trim() || !label.trim()) return;

    const fieldConfig: FieldConfig = {
      name: name.trim(),
      label: label.trim(),
      type,
      required,
      ...(placeholder && { placeholder }),
      ...(description && { description }),
      ...(type === 'select' && options && { options: options.split('\n').filter(opt => opt.trim()) })
    };

    onSave(fieldConfig);
  };

  const selectedFieldType = FIELD_TYPES.find(ft => ft.value === type);
  const isNameTaken = existingFieldNames.includes(name) && (!field || field.name !== name);
  const isValid = name.trim() && label.trim() && !isNameTaken;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {field ? 'Edit Field' : 'Add Field'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="field-label">Field Label</Label>
            <Input
              id="field-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Author Name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="field-name">Field Name</Label>
            <Input
              id="field-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. author_name"
            />
            {isNameTaken && (
              <p className="text-sm text-destructive">This field name is already used</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="field-type">Field Type</Label>
            <Select value={type} onValueChange={(value: FieldConfig['type']) => setType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((fieldType) => (
                  <SelectItem key={fieldType.value} value={fieldType.value}>
                    <div>
                      <div className="font-medium">{fieldType.label}</div>
                      <div className="text-xs text-muted-foreground">{fieldType.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedFieldType && (
              <p className="text-sm text-muted-foreground">{selectedFieldType.description}</p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="field-required"
              checked={required}
              onCheckedChange={setRequired}
            />
            <Label htmlFor="field-required">Required field</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="field-placeholder">Placeholder (optional)</Label>
            <Input
              id="field-placeholder"
              value={placeholder}
              onChange={(e) => setPlaceholder(e.target.value)}
              placeholder="Hint text for users..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="field-description">Description (optional)</Label>
            <Textarea
              id="field-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional help text..."
              rows={2}
            />
          </div>

          {type === 'select' && (
            <div className="space-y-2">
              <Label htmlFor="field-options">Options (one per line)</Label>
              <Textarea
                id="field-options"
                value={options}
                onChange={(e) => setOptions(e.target.value)}
                placeholder="Option 1&#10;Option 2&#10;Option 3"
                rows={4}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            {field ? 'Save Changes' : 'Add Field'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 