import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Box,
  Checkbox,
  IconButton,
  Table,
} from '@chakra-ui/react';
import { Trash2 } from 'lucide-react';
import { CheckboxControl } from '../sidebar/ui';
import HttpKvCellInput from './HttpKvCellInput';
import {
  KEY_VALUE_TABLE_BODY_CELL,
  KEY_VALUE_TABLE_HEADER_CELL,
  KEY_VALUE_TABLE_SHELL,
} from './keyValueTableStyles';

export interface KeyValueItem {
  enabled: boolean;
  key: string;
  value: string;
}

export interface EditableKeyValueTableHandle {
  /** Read current rows (for Send — no store round-trip). */
  getItems: () => KeyValueItem[];
  /** Replace local rows (e.g. URL → Params sync) without flushing to store. */
  syncItems: (items: KeyValueItem[]) => void;
  /** Push local rows into tab draft (memory only, not disk). */
  flush: () => void;
}

interface EditableKeyValueTableProps {
  sessionId: string;
  resetRevision?: number;
  items: KeyValueItem[];
  onCommit: (items: KeyValueItem[]) => void;
  onItemsChange?: (items: KeyValueItem[]) => void;
  onEditStart?: () => void;
  renderKeyField?: (index: number, item: KeyValueItem, onKeyChange: (value: string) => void) => ReactNode;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  enabledHeader?: string;
  keyHeader?: string;
  valueHeader?: string;
  actionHeader?: string;
}

function ensureTrailingRow(items: KeyValueItem[]): KeyValueItem[] {
  const last = items[items.length - 1];
  if (!last || last.key.trim() !== '') {
    return [...items, { key: '', value: '', enabled: true }];
  }
  return items;
}

interface RowProps {
  item: KeyValueItem;
  index: number;
  canRemove: boolean;
  keyPlaceholder: string;
  valuePlaceholder: string;
  renderKeyField?: (index: number, item: KeyValueItem, onKeyChange: (value: string) => void) => ReactNode;
  onUpdate: (index: number, field: 'enabled' | 'key' | 'value', value: string | boolean) => void;
  onRemove: (index: number) => void;
}

const EditableKeyValueRow = memo(function EditableKeyValueRow({
  item,
  index,
  canRemove,
  keyPlaceholder,
  valuePlaceholder,
  renderKeyField,
  onUpdate,
  onRemove,
}: RowProps) {
  return (
    <Table.Row _hover={{ bg: 'transparent' }}>
      <Table.Cell {...KEY_VALUE_TABLE_BODY_CELL} px="2">
        <Box display="flex" justifyContent="center">
          <Checkbox.Root
            checked={item.enabled}
            onCheckedChange={(details) => onUpdate(index, 'enabled', details.checked === true)}
            colorPalette="blue"
            variant="outline"
            size="sm"
          >
            <Checkbox.HiddenInput />
            <CheckboxControl />
          </Checkbox.Root>
        </Box>
      </Table.Cell>
      <Table.Cell {...KEY_VALUE_TABLE_BODY_CELL}>
        {renderKeyField ? (
          <Box width="full" minW="0">
            {renderKeyField(index, item, (v) => onUpdate(index, 'key', v))}
          </Box>
        ) : (
          <HttpKvCellInput
            value={item.key}
            onChange={(v) => onUpdate(index, 'key', v)}
            placeholder={keyPlaceholder}
            debounceMs={0}
          />
        )}
      </Table.Cell>
      <Table.Cell {...KEY_VALUE_TABLE_BODY_CELL}>
        <HttpKvCellInput
          value={item.value}
          onChange={(v) => onUpdate(index, 'value', v)}
          placeholder={valuePlaceholder}
          debounceMs={0}
        />
      </Table.Cell>
      <Table.Cell {...KEY_VALUE_TABLE_BODY_CELL} px="2">
        <Box display="flex" justifyContent="center">
          <IconButton
            aria-label="Remove"
            title="Remove"
            size="xs"
            variant="ghost"
            color="fg.subtle"
            opacity={item.key.trim() === '' ? 0 : 0.6}
            _hover={{ color: 'danger', bg: 'danger.subtle', opacity: 1 }}
            onClick={() => onRemove(index)}
            disabled={!canRemove}
          >
            <Trash2 size={13} />
          </IconButton>
        </Box>
      </Table.Cell>
    </Table.Row>
  );
});

const EditableKeyValueTable = forwardRef<EditableKeyValueTableHandle, EditableKeyValueTableProps>(
  function EditableKeyValueTable(
    {
      sessionId,
      resetRevision = 0,
      items: externalItems,
      onCommit,
      onItemsChange,
      onEditStart,
      renderKeyField,
      keyPlaceholder = 'Key',
      valuePlaceholder = 'Value',
      enabledHeader = '',
      keyHeader = 'Key',
      valueHeader = 'Value',
      actionHeader = '',
    },
    ref,
  ) {
    const [items, setItems] = useState(() => ensureTrailingRow(externalItems));
    const itemsRef = useRef(items);
    const onCommitRef = useRef(onCommit);
    const onItemsChangeRef = useRef(onItemsChange);
    const onEditStartRef = useRef(onEditStart);
    const editStartedRef = useRef(false);

    useEffect(() => {
      onCommitRef.current = onCommit;
    }, [onCommit]);

    useEffect(() => {
      onItemsChangeRef.current = onItemsChange;
    }, [onItemsChange]);

    useEffect(() => {
      onEditStartRef.current = onEditStart;
    }, [onEditStart]);

    useEffect(() => {
      itemsRef.current = items;
    }, [items]);

    useEffect(() => {
      editStartedRef.current = false;
      const next = ensureTrailingRow(externalItems);
      itemsRef.current = next;
      setItems(next);
    }, [sessionId, resetRevision]);

    useEffect(() => {
      if (editStartedRef.current) {
        return;
      }
      const next = ensureTrailingRow(externalItems);
      itemsRef.current = next;
      setItems(next);
    }, [externalItems]);

    const flushCommit = useCallback(() => {
      onCommitRef.current(itemsRef.current);
    }, []);

    const syncItems = useCallback((next: KeyValueItem[]) => {
      const normalized = ensureTrailingRow(next);
      itemsRef.current = normalized;
      setItems(normalized);
    }, []);

    useImperativeHandle(ref, () => ({
      getItems: () => itemsRef.current,
      flush: flushCommit,
      syncItems,
    }), [flushCommit, syncItems]);

    useEffect(() => () => {
      onCommitRef.current(itemsRef.current);
    }, []);

    const applyLocalUpdate = useCallback((next: KeyValueItem[]) => {
      const normalized = ensureTrailingRow(next);
      itemsRef.current = normalized;
      setItems(normalized);
      onItemsChangeRef.current?.(normalized);
      if (!editStartedRef.current) {
        editStartedRef.current = true;
        onEditStartRef.current?.();
      }
    }, []);

    const handleUpdate = useCallback((index: number, field: 'enabled' | 'key' | 'value', value: string | boolean) => {
      let next = itemsRef.current.map((item, i) => (i === index ? { ...item, [field]: value } : item));
      if (index === itemsRef.current.length - 1 && field === 'key' && (value as string).trim() !== '') {
        next = [...next, { key: '', value: '', enabled: true }];
      }
      applyLocalUpdate(next);
    }, [applyLocalUpdate]);

    const handleRemove = useCallback((index: number) => {
      const next = itemsRef.current.filter((_, i) => i !== index);
      applyLocalUpdate(next);
    }, [applyLocalUpdate]);

    return (
      <Box {...KEY_VALUE_TABLE_SHELL} className="http-kv-table">
        <Table.Root size="sm" variant="line" width="full" tableLayout="fixed" stickyHeader>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader
                {...KEY_VALUE_TABLE_HEADER_CELL}
                width="40px"
                minWidth="40px"
                px="2"
                textAlign="center"
              >
                {enabledHeader}
              </Table.ColumnHeader>
              <Table.ColumnHeader {...KEY_VALUE_TABLE_HEADER_CELL} width="34%">
                {keyHeader}
              </Table.ColumnHeader>
              <Table.ColumnHeader {...KEY_VALUE_TABLE_HEADER_CELL}>
                {valueHeader}
              </Table.ColumnHeader>
              <Table.ColumnHeader
                {...KEY_VALUE_TABLE_HEADER_CELL}
                width="40px"
                minWidth="40px"
                px="2"
                textAlign="center"
              >
                {actionHeader}
              </Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {items.map((item, i) => (
              <EditableKeyValueRow
                key={i}
                item={item}
                index={i}
                canRemove={items.length > 1}
                keyPlaceholder={keyPlaceholder}
                valuePlaceholder={valuePlaceholder}
                renderKeyField={renderKeyField}
                onUpdate={handleUpdate}
                onRemove={handleRemove}
              />
            ))}
          </Table.Body>
        </Table.Root>
      </Box>
    );
  },
);

export default EditableKeyValueTable;
