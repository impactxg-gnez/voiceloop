'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

export function DemographicsFieldsManager({ fields, onChange }: Props) {
  const { toast } = useToast();
  console.log('DemographicsFieldsManager - received fields:', fields);
  console.log('DemographicsFieldsManager - fields.length:', fields.length);
  
  const [pendingFields, setPendingFields] = useState<DemographicField[]>([]);
  const [newField, setNewField] = useState<DemographicField>({
    field_key: '',
    label: '',
    input_type: 'text',
    required: true,
    options: [],
  });

  const addToPending = () => {
    if (!newField.field_key || !newField.label) return;
    console.log('Adding field to pending:', newField);
    const updatedPending = [...pendingFields, { ...newField }];
    console.log('Updated pending fields:', updatedPending);
    setPendingFields(updatedPending);
    setNewField({ field_key: '', label: '', input_type: 'text', required: true, options: [] });
  };

  const handleFieldChange = (updates: Partial<DemographicField>) => {
    setNewField(prev => ({ ...prev, ...updates }));
  };

  const addField = () => {
    if (!newField.field_key || !newField.label) return;
    console.log('Adding field to pending:', newField);
    const updatedPending = [...pendingFields, { ...newField }];
    console.log('Updated pending fields:', updatedPending);
    setPendingFields(updatedPending);
    setNewField({ field_key: '', label: '', input_type: 'text', required: true, options: [] });
  };

  const removePendingField = (idx: number) => {
    const copy = [...pendingFields];
    copy.splice(idx, 1);
    setPendingFields(copy);
  };

  const removeField = (idx: number) => {
    const copy = [...fields];
    copy.splice(idx, 1);
    onChange(copy);
  };

  const confirmFields = () => {
    const allFields = [...fields, ...pendingFields];
    console.log('Confirming all demographic fields:', allFields);
    onChange(allFields);
    setPendingFields([]);
    toast({
      title: 'Demographic Fields Confirmed',
      description: `Successfully configured ${allFields.length} demographic field${allFields.length !== 1 ? 's' : ''}`,
    });
  };

  console.log('Rendering DemographicsFieldsManager - fields:', fields.length, 'pending:', pendingFields.length);
  console.log('newField:', newField);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Demographics (Optional)</CardTitle>
        <CardDescription>Fill out the fields below and click "Add Field" to add them to your list</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Confirmed Fields */}
        {fields.length > 0 && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Confirmed Fields ({fields.length})</Label>
            {fields.map((f, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 border rounded-lg bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <div className="flex-1">
                  <div className="font-medium">{f.label}</div>
                  <div className="text-sm text-gray-500">Key: {f.field_key} • Type: {f.input_type} • {f.required ? 'Required' : 'Optional'}</div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => removeField(idx)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Pending Fields */}
        {pendingFields.length > 0 && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Pending Fields ({pendingFields.length})</Label>
            {pendingFields.map((f, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 border rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                <div className="flex-1">
                  <div className="font-medium">{f.label}</div>
                  <div className="text-sm text-gray-500">Key: {f.field_key} • Type: {f.input_type} • {f.required ? 'Required' : 'Optional'}</div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => removePendingField(idx)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add New Field */}
        <div className="border-t pt-4 space-y-3">
          <Label className="text-sm font-medium">Add Field</Label>
          <div className="grid gap-3 md:grid-cols-4 items-end">
            <div>
              <Label>Key</Label>
              <Input 
                value={newField.field_key} 
                onChange={(e) => handleFieldChange({ field_key: e.target.value })} 
                placeholder="city" 
              />
            </div>
            <div>
              <Label>Label</Label>
              <Input 
                value={newField.label} 
                onChange={(e) => handleFieldChange({ label: e.target.value })} 
                placeholder="City" 
              />
            </div>
            <div>
              <Label>Type</Label>
              <select 
                className="w-full border rounded h-9 px-2" 
                value={newField.input_type} 
                onChange={(e) => handleFieldChange({ input_type: e.target.value as any })}
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="select">Select</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Switch 
                checked={newField.required} 
                onCheckedChange={(v) => handleFieldChange({ required: v })} 
              />
              <Label>Required</Label>
            </div>
          </div>
          
          {newField.input_type === 'select' && (
            <div>
              <Label>Options (comma separated)</Label>
              <Input 
                value={(newField.options || []).join(', ')} 
                onChange={(e) => handleFieldChange({ options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} 
                placeholder="Male, Female, Other" 
              />
            </div>
          )}

          <div className="flex justify-between items-center gap-4">
            <Button 
              onClick={addField}
              disabled={!newField.field_key || !newField.label}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> Add Field
            </Button>
            
            {(fields.length > 0 || pendingFields.length > 0) && (
              <Button 
                onClick={confirmFields}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4" /> Confirm Fields ({fields.length + pendingFields.length})
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


