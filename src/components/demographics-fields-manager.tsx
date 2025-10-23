'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2 } from 'lucide-react';

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
  console.log('DemographicsFieldsManager - received fields:', fields);
  console.log('DemographicsFieldsManager - fields.length:', fields.length);
  const [newField, setNewField] = useState<DemographicField>({
    field_key: '',
    label: '',
    input_type: 'text',
    required: true,
    options: [],
  });

  const addField = () => {
    if (!newField.field_key || !newField.label) return;
    console.log('Adding demographic field:', newField);
    console.log('Current fields before add:', fields);
    const updatedFields = [...fields, { ...newField }];
    console.log('Updated fields after add:', updatedFields);
    onChange(updatedFields);
    setNewField({ field_key: '', label: '', input_type: 'text', required: true, options: [] });
  };

  const removeField = (idx: number) => {
    const copy = [...fields];
    copy.splice(idx, 1);
    onChange(copy);
  };

  const updateField = (idx: number, patch: Partial<DemographicField>) => {
    const copy = [...fields];
    copy[idx] = { ...copy[idx], ...patch };
    onChange(copy);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Demographics (Optional)</CardTitle>
        <CardDescription>Define the demographic fields you want to collect</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.map((f, idx) => (
          <div key={idx} className="grid gap-3 md:grid-cols-5 items-end">
            <div className="md:col-span-1">
              <Label>Key</Label>
              <Input value={f.field_key} onChange={(e) => updateField(idx, { field_key: e.target.value })} placeholder="age" />
            </div>
            <div className="md:col-span-2">
              <Label>Label</Label>
              <Input value={f.label} onChange={(e) => updateField(idx, { label: e.target.value })} placeholder="Age" />
            </div>
            <div>
              <Label>Type</Label>
              <select className="w-full border rounded h-9 px-2" value={f.input_type} onChange={(e) => updateField(idx, { input_type: e.target.value as any })}>
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="select">Select</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={f.required} onCheckedChange={(v) => updateField(idx, { required: v })} />
              <Label>Required</Label>
            </div>
            {f.input_type === 'select' && (
              <div className="md:col-span-5">
                <Label>Options (comma separated)</Label>
                <Input value={(f.options || []).join(', ')} onChange={(e) => updateField(idx, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} placeholder="Male, Female, Other" />
              </div>
            )}
            <div className="md:col-span-5 flex justify-end">
              <Button variant="ghost" onClick={() => removeField(idx)}>
                <Trash2 className="h-4 w-4 mr-1" /> Remove
              </Button>
            </div>
          </div>
        ))}

        <div className="border-t pt-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-5 items-end">
            <div className="md:col-span-1">
              <Label>Key</Label>
              <Input value={newField.field_key} onChange={(e) => setNewField({ ...newField, field_key: e.target.value })} placeholder="city" />
            </div>
            <div className="md:col-span-2">
              <Label>Label</Label>
              <Input value={newField.label} onChange={(e) => setNewField({ ...newField, label: e.target.value })} placeholder="City" />
            </div>
            <div>
              <Label>Type</Label>
              <select className="w-full border rounded h-9 px-2" value={newField.input_type} onChange={(e) => setNewField({ ...newField, input_type: e.target.value as any })}>
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="select">Select</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={newField.required} onCheckedChange={(v) => setNewField({ ...newField, required: v })} />
              <Label>Required</Label>
            </div>
            {newField.input_type === 'select' && (
              <div className="md:col-span-5">
                <Label>Options (comma separated)</Label>
                <Input value={(newField.options || []).join(', ')} onChange={(e) => setNewField({ ...newField, options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} placeholder="Male, Female, Other" />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button onClick={addField}><Plus className="h-4 w-4 mr-1" /> Add Field</Button>
            <Button variant="outline" onClick={() => console.log('Current fields:', fields)}>
              Confirm Fields ({fields.length})
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


