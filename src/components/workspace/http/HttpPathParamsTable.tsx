import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Box, Table, Text } from '@chakra-ui/react';
import HttpKvCellInput from '../../ui/HttpKvCellInput';
import type { EditableKeyValueTableHandle, KeyValueItem } from '../../ui/EditableKeyValueTable';
import {
  KEY_VALUE_TABLE_BODY_CELL,
  KEY_VALUE_TABLE_HEADER_CELL,
  KEY_VALUE_TABLE_SHELL,
} from '../../ui/keyValueTableStyles';

interface HttpPathParamsTableProps {
  sessionId: string;
  resetRevision?: number;
  items: KeyValueItem[];
  onCommit: (items: KeyValueItem[]) => void;
  onItemsChange?: (items: KeyValueItem[]) => void;
  onEditStart?: () => void;
  keyHeader: string;
  valueHeader: string;
  valuePlaceholder?: string;
}

function normalizePathItems(items: KeyValueItem[]): KeyValueItem[] {
  return items
    .filter((p) => p.key.trim())
    .map((p) => ({ key: p.key.trim(), value: p.value, enabled: true }));
}

function pathItemsSignature(items: KeyValueItem[]): string {
  return normalizePathItems(items).map((p) => `${p.key}\0${p.value}`).join('\n');
}

const HttpPathParamsTable = forwardRef<EditableKeyValueTableHandle, HttpPathParamsTableProps>(
  function HttpPathParamsTable(
    {
      sessionId,
      resetRevision = 0,
      items: externalItems,
      onCommit,
      onItemsChange,
      onEditStart,
      keyHeader,
      valueHeader,
      valuePlaceholder = 'Value',
    },
    ref,
  ) {
    const normalizedExternal = useMemo(
      () => normalizePathItems(externalItems),
      [externalItems],
    );
    const externalSignature = useMemo(
      () => pathItemsSignature(externalItems),
      [externalItems],
    );
    const resetToken = `${sessionId}:${resetRevision}`;

    const [items, setItems] = useState(normalizedExternal);
    const [isEditing, setIsEditing] = useState(false);
    const [prevResetToken, setPrevResetToken] = useState(resetToken);
    const [prevExternalSignature, setPrevExternalSignature] = useState(externalSignature);
    const itemsRef = useRef(items);
    const onCommitRef = useRef(onCommit);
    const onItemsChangeRef = useRef(onItemsChange);
    const onEditStartRef = useRef(onEditStart);

    if (resetToken !== prevResetToken) {
      setPrevResetToken(resetToken);
      setPrevExternalSignature(externalSignature);
      setIsEditing(false);
      setItems(normalizedExternal);
    } else if (!isEditing && externalSignature !== prevExternalSignature) {
      setPrevExternalSignature(externalSignature);
      setItems(normalizedExternal);
    }

    useEffect(() => {
      itemsRef.current = items;
    }, [items]);

    useEffect(() => {
      onCommitRef.current = onCommit;
    }, [onCommit]);

    useEffect(() => {
      onItemsChangeRef.current = onItemsChange;
    }, [onItemsChange]);

    useEffect(() => {
      onEditStartRef.current = onEditStart;
    }, [onEditStart]);

    const flushCommit = useCallback(() => {
      onCommitRef.current(itemsRef.current);
    }, []);

    const syncItems = useCallback((next: KeyValueItem[]) => {
      const normalized = normalizePathItems(next);
      setPrevExternalSignature(pathItemsSignature(normalized));
      setIsEditing(false);
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
      const normalized = normalizePathItems(next);
      setItems(normalized);
      onItemsChangeRef.current?.(normalized);
      if (!isEditing) {
        setIsEditing(true);
        onEditStartRef.current?.();
      }
    }, [isEditing]);

    const handleValueChange = useCallback((index: number, value: string) => {
      applyLocalUpdate(
        itemsRef.current.map((item, i) => (i === index ? { ...item, value } : item)),
      );
    }, [applyLocalUpdate]);

    if (items.length === 0) {
      return null;
    }

    return (
      <Box {...KEY_VALUE_TABLE_SHELL} className="http-kv-table">
        <Table.Root size="sm" variant="line" width="full" tableLayout="fixed" stickyHeader>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader {...KEY_VALUE_TABLE_HEADER_CELL} width="34%">
                {keyHeader}
              </Table.ColumnHeader>
              <Table.ColumnHeader {...KEY_VALUE_TABLE_HEADER_CELL}>
                {valueHeader}
              </Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {items.map((item, i) => (
              <Table.Row key={item.key} _hover={{ bg: 'transparent' }}>
                <Table.Cell {...KEY_VALUE_TABLE_BODY_CELL}>
                  <Text
                    fontSize="sm"
                    fontFamily="mono"
                    color="fg.muted"
                    truncate
                    title={`:${item.key}`}
                  >
                    {item.key}
                  </Text>
                </Table.Cell>
                <Table.Cell {...KEY_VALUE_TABLE_BODY_CELL}>
                  <HttpKvCellInput
                    value={item.value}
                    onChange={(v) => handleValueChange(i, v)}
                    placeholder={valuePlaceholder}
                    debounceMs={0}
                  />
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>
    );
  },
);

export default HttpPathParamsTable;
