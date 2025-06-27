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
import { FIELD_TYPES, getFieldTypeInfo } from '@/lib/field-type-icons';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface CollectionSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (collection: Partial<CollectionConfig>) => Promise<void>;
  existingCollection?: CollectionConfig | null;
}



// Sortable Field Item component for drag and drop
function SortableFieldItem({ id, field, onEdit, onDelete }: { id: string, field: FieldConfig, onEdit: (field: FieldConfig) => void, onDelete: (name: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const fieldTypeInfo = getFieldTypeInfo(field.type);
  const Icon = fieldTypeInfo?.icon;

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card className="p-2 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div {...listeners} className="cursor-move p-1">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </div>
            {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
            <div>
              <div className="font-medium text-sm">{field.label || field.name}</div>
              <div className="text-xs text-muted-foreground">
                {fieldTypeInfo?.label} {field.required && '• Required'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(field)}
            >
              <Edit3 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(field.name)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setFields((items) => {
        const oldIndex = items.findIndex((item) => item.name === active.id);
        const newIndex = items.findIndex((item) => item.name === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

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
          !['title', 'description', 'slug', 'seoTitle', 'seoDescription', 'ogTitle', 'ogDescription', 'ogImage', 'status', 'dateLastModified', 'datePublished'].includes(field.name)
        );
        setFields(customFields);
      } else {
        setName('');
        setSlug('');
        setDescription('');
        setUrlPattern('');
        // Add default Body field for new collections
        setFields([
          {
            name: 'body',
            label: 'Body',
            type: 'markdown',
            required: false,
            description: 'Main content of the item'
          }
        ]);
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

  const isValid = !!name.trim();

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {existingCollection ? 'Edit Collection' : 'Create New Collection'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 gap-4 mt-4">
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
                <Label htmlFor="urlPattern">URL Pattern</Label>
                <Input
                  id="urlPattern"
                  value={urlPattern}
                  onChange={(e) => setUrlPattern(e.target.value)}
                  placeholder="e.g. /blog/{slug}"
                />
                <p className="text-sm text-muted-foreground">Use {`{slug}`} as a placeholder for the item's URL slug</p>
              </div>

            </div>


            {/* Default fields info */}
            <div className="p-3 bg-gray-100 rounded-md">
              <p className="text-sm mb-2">
                Default fields (included automatically):
              </p>
              <div className="flex flex-wrap gap-1">
                <Badge variant="default">Title</Badge>
                <Badge variant="default">Description</Badge>
                <Badge variant="default">URL Slug</Badge>
                <Badge variant="default">SEO Title</Badge>
                <Badge variant="default">SEO Description</Badge>
                <Badge variant="default">OG Title</Badge>
                <Badge variant="default">OG Description</Badge>
                <Badge variant="default">OG Image</Badge>
                <Badge variant="default">Status</Badge>
                <Badge variant="default">Date Last Modified</Badge>
                <Badge variant="default">Date Published</Badge>
              </div>
            </div>

            {/* Fields Section */}
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Custom Fields</h3>
                <Button onClick={handleAddField} size="sm" variant="outline" className="shadow">
                  <Plus className="w-4 h-4" />
                  Add Field
                </Button>
              </div>


              {/* Custom fields list */}
              {fields.length > 0 ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={fields.map(f => f.name)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {fields.map((field) => (
                        <SortableFieldItem
                          key={field.name}
                          id={field.name}
                          field={field}
                          onEdit={handleEditField}
                          onDelete={handleDeleteField}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <div className="text-center text-muted-foreground border-2 border-dashed rounded-lg text-sm p-8">
                  <p>No custom fields yet.</p>
                  <p>Click "Add Field" to get started.</p>
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
  const [type, setType] = useState<FieldConfig['type']>('markdown');
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
      setType('markdown');
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

  const selectedFieldType = getFieldTypeInfo(type);
  const isNameTaken = existingFieldNames.includes(name) && (!field || field.name !== name);
  const isValid = name.trim() && label.trim() && !isNameTaken;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!max-w-[464px]">
        <DialogHeader>
          <DialogTitle>
            {field ? 'Edit Field' : 'Add Field'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
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
            <Label htmlFor="field-name">Field Data Name</Label>
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

          {/* <div className="space-y-2">
            <Label htmlFor="field-placeholder">Placeholder (optional)</Label>
            <Input
              id="field-placeholder"
              value={placeholder}
              onChange={(e) => setPlaceholder(e.target.value)}
              placeholder="Hint text for users..."
            />
          </div> */}

          <div className="space-y-2">
            <Label htmlFor="field-type">Field Type</Label>
            <Select value={type} onValueChange={(value: FieldConfig['type']) => setType(value)}>
              <SelectTrigger className="w-full">
                <SelectValue asChild>
                  <div className="flex items-center gap-2">
                    {selectedFieldType?.icon && <selectedFieldType.icon className="w-4 h-4" />}
                    <span>{selectedFieldType?.label}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((fieldType) => (
                  <SelectItem key={fieldType.value} value={fieldType.value}>
                    <div className="flex items-center gap-3">
                      <fieldType.icon className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{fieldType.label}</div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Switch
              id="field-required"
              checked={required}
              onCheckedChange={setRequired}
            />
            <Label htmlFor="field-required">Required field</Label>
          </div>



          {/* <div className="space-y-2">
            <Label htmlFor="field-description">Description (optional)</Label>
            <Textarea
              id="field-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional help text..."
              rows={2}
            />
          </div> */}

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