'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type DemographicField = {
  id?: string;
  field_key: string;
  label: string;
  input_type: 'text' | 'number' | 'select';
  required: boolean;
  options?: string[]; // for select
};

interface Props {
  fields: DemographicField[];
  onChange: (fields: DemographicField[]) => void;
}

// Pre-defined common demographic fields
const COMMON_DEMOGRAPHICS: DemographicField[] = [
  { field_key: 'age', label: 'Age', input_type: 'number', required: true },
  { field_key: 'gender', label: 'Gender', input_type: 'select', required: true, options: ['Male', 'Female', 'Other', 'Prefer not to say'] },
  { field_key: 'city', label: 'City', input_type: 'text', required: true },
  { field_key: 'education', label: 'Education', input_type: 'select', required: true, options: ['High School', 'Bachelor\'s Degree', 'Master\'s Degree', 'PhD', 'Other'] },
  { field_key: 'employment', label: 'Employment', input_type: 'select', required: true, options: ['Employed', 'Self-Employed', 'Unemployed', 'Student', 'Retired'] },
];

export function DemographicsFieldsManager({ fields, onChange }: Props) {
  const { toast } = useToast();
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customField, setCustomField] = useState<DemographicField>({
    field_key: '',
    label: '',
    input_type: 'text',
    required: true,
    options: [],
  });

  // Check if a common demographic is enabled
  const isFieldEnabled = (fieldKey: string) => {
    return fields.some(f => f.field_key === fieldKey);
  };

  // Toggle a common demographic field
  const toggleCommonField = (field: DemographicField, enabled: boolean) => {
    if (enabled) {
      onChange([...fields, field]);
    } else {
      onChange(fields.filter(f => f.field_key !== field.field_key));
    }
  };

  // Add custom field
  const addCustomField = () => {
    if (!customField.field_key || !customField.label) {
      toast({
        variant: 'destructive',
        title: 'Invalid Field',
        description: 'Please provide both key and label for the custom field.',
      });
      return;
    }

    // Check for duplicate field keys
    if (fields.some(f => f.field_key === customField.field_key)) {
      toast({
        variant: 'destructive',
        title: 'Duplicate Field',
        description: 'A field with this key already exists.',
      });
      return;
    }

    onChange([...fields, { ...customField }]);
    setCustomField({
      field_key: '',
      label: '',
      input_type: 'text',
      required: true,
      options: [],
    });
    setShowCustomForm(false);
    
    toast({
      title: 'Custom Field Added',
      description: `${customField.label} has been added to your form.`,
    });
  };

  // Remove a custom field
  const removeCustomField = (fieldKey: string) => {
    onChange(fields.filter(f => f.field_key !== fieldKey));
  };

  // Get custom fields (not in common demographics list)
  const customFields = fields.filter(f => 
    !COMMON_DEMOGRAPHICS.some(cd => cd.field_key === f.field_key)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Demographics (Optional)</CardTitle>
        <CardDescription>Select common demographic fields or add custom ones</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Common Demographics */}
        <div className="space-y-3">
          {COMMON_DEMOGRAPHICS.map((field) => (
            <div 
              key={field.field_key}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
            >
              <Label 
                htmlFor={`toggle-${field.field_key}`}
                className="text-base font-medium cursor-pointer"
              >
                {field.label}
              </Label>
              <Switch
                id={`toggle-${field.field_key}`}
                checked={isFieldEnabled(field.field_key)}
                onCheckedChange={(checked) => toggleCommonField(field, checked)}
              />
            </div>
          ))}
        </div>

        {/* Custom Fields Display */}
        {customFields.length > 0 && (
          <div className="space-y-2 pt-4 border-t">
            <Label className="text-sm font-medium">Custom Demographics</Label>
            <div className="space-y-2">
              {customFields.map((field) => (
                <div 
                  key={field.field_key}
                  className="flex items-center justify-between p-3 rounded-lg bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800"
                >
                  <div>
                    <div className="font-medium">{field.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {field.input_type} • {field.required ? 'Required' : 'Optional'}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCustomField(field.field_key)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Custom Field Button/Form */}
        {!showCustomForm ? (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowCustomForm(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Custom Demographic
          </Button>
        ) : (
          <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Add Custom Field</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowCustomForm(false);
                  setCustomField({
                    field_key: '',
                    label: '',
                    input_type: 'text',
                    required: true,
                    options: [],
                  });
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-3">
              <div>
                <Label htmlFor="custom-label">Label</Label>
                <Input
                  id="custom-label"
                  value={customField.label}
                  onChange={(e) => setCustomField({ ...customField, label: e.target.value })}
                  placeholder="e.g., Occupation"
                />
              </div>

              <div>
                <Label htmlFor="custom-key">Field Key</Label>
                <Input
                  id="custom-key"
                  value={customField.field_key}
                  onChange={(e) => setCustomField({ ...customField, field_key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  placeholder="e.g., occupation"
                />
              </div>

              <div>
                <Label htmlFor="custom-type">Input Type</Label>
                <Select
                  value={customField.input_type}
                  onValueChange={(value: 'text' | 'number' | 'select') => 
                    setCustomField({ ...customField, input_type: value })
                  }
                >
                  <SelectTrigger id="custom-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="select">Select (Dropdown)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {customField.input_type === 'select' && (
                <div>
                  <Label htmlFor="custom-options">Options (comma separated)</Label>
                  <Input
                    id="custom-options"
                    value={(customField.options || []).join(', ')}
                    onChange={(e) => 
                      setCustomField({ 
                        ...customField, 
                        options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                      })
                    }
                    placeholder="Option 1, Option 2, Option 3"
                  />
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  id="custom-required"
                  checked={customField.required}
                  onCheckedChange={(checked) => setCustomField({ ...customField, required: checked })}
                />
                <Label htmlFor="custom-required">Required field</Label>
              </div>

              <Button onClick={addCustomField} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Field
              </Button>
            </div>
          </div>
        )}

        {/* Summary */}
        {fields.length > 0 && (
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              <strong>{fields.length}</strong> demographic field{fields.length !== 1 ? 's' : ''} will be collected
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


