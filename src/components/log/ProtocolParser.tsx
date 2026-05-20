import { useState, useMemo } from 'react';
import {
  Button,
  CloseButton,
  Flex,
  Grid,
  Input,
  Stack,
  Text,
} from '@chakra-ui/react';
import { FieldNumberInput, FieldSelect, PanelCard, PanelHeader } from '../sidebar/ui';

export type FieldType = 'uint8' | 'uint16' | 'uint32' | 'int8' | 'int16' | 'int32' | 'float' | 'double' | 'ascii' | 'hex';

export interface ProtocolField {
  id: string;
  name: string;
  offset: number;
  length: number;
  type: FieldType;
}

export interface ProtocolTemplate {
  id: string;
  name: string;
  fields: ProtocolField[];
}

interface Props {
  data: number[];
}

const FIELD_TYPE_OPTIONS: { value: FieldType; label: string }[] = [
  { value: 'uint8', label: 'uint8' },
  { value: 'uint16', label: 'uint16' },
  { value: 'uint32', label: 'uint32' },
  { value: 'int8', label: 'int8' },
  { value: 'int16', label: 'int16' },
  { value: 'int32', label: 'int32' },
  { value: 'float', label: 'float' },
  { value: 'double', label: 'double' },
  { value: 'ascii', label: 'ascii' },
  { value: 'hex', label: 'hex' },
];

const TYPE_SIZES: Record<FieldType, number | null> = {
  uint8: 1, uint16: 2, uint32: 4,
  int8: 1, int16: 2, int32: 4,
  float: 4, double: 8,
  ascii: null, hex: null,
};

function parseField(bytes: number[], field: ProtocolField): string {
  const slice = bytes.slice(field.offset, field.offset + field.length);
  if (slice.length === 0) {return '—';}

  const u8 = (i: number): number => slice[i] ?? 0;

  switch (field.type) {
    case 'uint8': return u8(0).toString();
    case 'uint16': {
      if (slice.length < 2) {return '—';}
      return ((u8(0) << 8) | u8(1)).toString();
    }
    case 'uint32': {
      if (slice.length < 4) {return '—';}
      return ((u8(0) << 24) | (u8(1) << 16) | (u8(2) << 8) | u8(3)).toString();
    }
    case 'int8': {
      const b = u8(0);
      return (b | (b & 0x80 ? ~0x7f : 0)).toString();
    }
    case 'int16': {
      if (slice.length < 2) {return '—';}
      const v = (u8(0) << 8) | u8(1);
      return (v | (v & 0x8000 ? ~0x7fff : 0)).toString();
    }
    case 'int32': {
      if (slice.length < 4) {return '—';}
      const v = (u8(0) << 24) | (u8(1) << 16) | (u8(2) << 8) | u8(3);
      return (v | (v & 0x80000000 ? ~0x7fffffff : 0)).toString();
    }
    case 'float': {
      if (slice.length < 4) {return '—';}
      const buf = new ArrayBuffer(4);
      new Uint8Array(buf).set(slice.slice(0, 4));
      const arr = new Float32Array(buf);
      return arr.length > 0 ? arr[0].toString() : '—';
    }
    case 'double': {
      if (slice.length < 8) {return '—';}
      const buf = new ArrayBuffer(8);
      new Uint8Array(buf).set(slice.slice(0, 8));
      const arr = new Float64Array(buf);
      return arr.length > 0 ? arr[0].toString() : '—';
    }
    case 'ascii':
      return slice.map(b => String.fromCharCode(b)).join('');
    case 'hex':
      return slice.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
    default:
      return '—';
  }
}

export default function ProtocolParser({ data }: Props) {
  const [fields, setFields] = useState<ProtocolField[]>([]);
  const [editing, setEditing] = useState(false);
  const [newField, setNewField] = useState<Partial<ProtocolField>>({ type: 'uint8', length: 1 });

  const parsed = useMemo(() => {
    return fields.map(f => ({
      ...f,
      value: parseField(data, f),
      raw: data.slice(f.offset, f.offset + f.length).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' '),
    }));
  }, [fields, data]);

  const addField = () => {
    if (!newField.name || newField.offset === undefined) {return;}
    const length = newField.length ?? TYPE_SIZES[newField.type as FieldType] ?? 1;
    const name = newField.name;
    const offset = newField.offset;
    const type = newField.type as FieldType;
    setFields(prev => [...prev, {
      id: `fld_${Date.now()}`,
      name,
      offset,
      length,
      type,
    }]);
    setNewField({ type: 'uint8', length: 1 });
  };

  const removeField = (id: string) => {
    setFields(prev => prev.filter(f => f.id !== id));
  };

  return (
    <PanelCard>
      <PanelHeader
        icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h7"/></svg>}
        label="Protocol Parser"
      />
      <Stack p="3" gap="2">
        <Flex align="center" justify="space-between">
          <Button
            onClick={() => setEditing(!editing)}
            size="xs"
            variant="outline"
            colorPalette="blue"
            fontSize="2xs"
          >
            {editing ? 'Done' : 'Edit Fields'}
          </Button>
          {fields.length > 0 && (
            <Text fontSize="2xs" color="fg.subtle">{fields.length} fields</Text>
          )}
        </Flex>

        {editing && (
          <Stack gap="1.5" p="2" rounded="md" bg="bg.subtle" borderWidth="1px" borderColor="border">
            <Grid templateColumns="repeat(4, 1fr)" gap="1">
              <Input
                size="xs"
                value={newField.name ?? ''}
                onChange={(e) => setNewField(p => ({ ...p, name: e.target.value }))}
                placeholder="Name"
                fontSize="2xs"
              />
              <FieldNumberInput
                size="xs"
                value={newField.offset ?? 0}
                onChange={(offset) => setNewField((p) => ({ ...p, offset }))}
                min={0}
                showControls={false}
              />
              <FieldNumberInput
                size="xs"
                value={newField.length ?? 0}
                onChange={(length) => setNewField((p) => ({ ...p, length }))}
                min={0}
                showControls={false}
              />
              <FieldSelect
                size="xs"
                value={newField.type ?? 'uint8'}
                onChange={(v) => setNewField(p => ({ ...p, type: v as FieldType }))}
                options={FIELD_TYPE_OPTIONS}
                fontSize="2xs"
              />
            </Grid>
            <Button
              onClick={addField}
              size="xs"
              variant="outline"
              colorPalette="green"
              fontSize="2xs"
              alignSelf="flex-start"
            >
              + Add Field
            </Button>
          </Stack>
        )}

        {parsed.length === 0 ? (
          <Text fontSize="2xs" color="fg.subtle">No fields defined. Click &quot;Edit Fields&quot; to add.</Text>
        ) : (
          <Stack gap="1">
            <Grid
              templateColumns="1fr 60px 1fr 1fr 20px"
              gap="1"
              px="2"
              py="1"
              fontSize="2xs"
              textTransform="uppercase"
              letterSpacing="wider"
              color="fg.subtle"
            >
              <Text>Name</Text>
              <Text>Off</Text>
              <Text>Value</Text>
              <Text>Raw</Text>
              <Text />
            </Grid>
            {parsed.map(f => (
              <Grid
                key={f.id}
                templateColumns="1fr 60px 1fr 1fr 20px"
                gap="1"
                px="2"
                py="1"
                rounded="md"
                bg="bg.subtle"
                borderWidth="1px"
                borderColor="border"
                alignItems="center"
              >
                <Text fontSize="2xs" fontFamily="mono" color="fg" truncate title={f.name}>{f.name}</Text>
                <Text fontSize="2xs" fontFamily="mono" color="fg.subtle">{f.offset}+{f.length}</Text>
                <Text fontSize="2xs" fontFamily="mono" color="accent">{f.value}</Text>
                <Text fontSize="2xs" fontFamily="mono" color="fg.muted" truncate>{f.raw}</Text>
                {editing && (
                  <CloseButton
                    size="xs"
                    color="danger"
                    onClick={() => removeField(f.id)}
                  />
                )}
              </Grid>
            ))}
          </Stack>
        )}
      </Stack>
    </PanelCard>
  );
}
