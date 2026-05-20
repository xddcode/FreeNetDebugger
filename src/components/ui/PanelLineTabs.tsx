import type { ReactNode } from 'react';
import { Tabs, Text } from '@chakra-ui/react';

export interface PanelTab {
  key: string;
  label: string;
  count?: number;
}

interface Props {
  tabs: PanelTab[];
  value: string;
  onChange: (key: string) => void;
  endContent?: ReactNode;
}

export default function PanelLineTabs({ tabs, value, onChange, endContent }: Props) {
  return (
    <Tabs.Root
      value={value}
      onValueChange={(details) => onChange(details.value)}
      variant="line"
      size="sm"
      flexShrink={0}
    >
      <Tabs.List borderColor="border" px="2" pt="2" pb="0" gap="0.5">
        {tabs.map((tab) => (
          <Tabs.Trigger
            key={tab.key}
            value={tab.key}
            color="fg.subtle"
            whiteSpace="nowrap"
            _selected={{ color: 'accent', borderColor: 'accent' }}
            _hover={{ color: 'fg.muted' }}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <Text as="span" ml="1" fontSize="xs" color="fg.subtle">
                ({tab.count})
              </Text>
            )}
          </Tabs.Trigger>
        ))}
        {endContent}
      </Tabs.List>
    </Tabs.Root>
  );
}
