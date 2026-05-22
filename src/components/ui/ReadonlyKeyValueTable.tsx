import {
  Box,
  Table,
  Text,
} from '@chakra-ui/react';
import {
  KEY_VALUE_TABLE_BODY_CELL,
  KEY_VALUE_TABLE_HEADER_CELL,
  KEY_VALUE_TABLE_SHELL,
} from './keyValueTableStyles';

interface Item {
  key: string;
  value: string;
}

interface ReadonlyKeyValueTableProps {
  items: Item[];
  keyHeader?: string;
  valueHeader?: string;
  keyColor?: string;
}

export default function ReadonlyKeyValueTable({
  items,
  keyHeader = 'Key',
  valueHeader = 'Value',
  keyColor = 'accent',
}: ReadonlyKeyValueTableProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <Box {...KEY_VALUE_TABLE_SHELL} className="http-kv-table">
      <Table.Root size="sm" variant="line" width="full" tableLayout="fixed" stickyHeader>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader
              {...KEY_VALUE_TABLE_HEADER_CELL}
              width="38%"
            >
              {keyHeader}
            </Table.ColumnHeader>
            <Table.ColumnHeader {...KEY_VALUE_TABLE_HEADER_CELL}>
              {valueHeader}
            </Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {items.map((item, i) => {
            const striped = i % 2 === 1;
            const rowBg = striped ? 'bg.subtle' : undefined;
            return (
              <Table.Row key={i} bg={rowBg} _hover={{ bg: rowBg ?? 'transparent' }}>
                <Table.Cell {...KEY_VALUE_TABLE_BODY_CELL}>
                  <Text
                    fontSize="xs"
                    fontFamily="mono"
                    color={keyColor}
                    wordBreak="break-all"
                    lineHeight="code"
                  >
                    {item.key}
                  </Text>
                </Table.Cell>
                <Table.Cell {...KEY_VALUE_TABLE_BODY_CELL}>
                  <Text
                    fontSize="xs"
                    fontFamily="mono"
                    color="fg.muted"
                    wordBreak="break-all"
                    lineHeight="code"
                  >
                    {item.value}
                  </Text>
                </Table.Cell>
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table.Root>
    </Box>
  );
}
