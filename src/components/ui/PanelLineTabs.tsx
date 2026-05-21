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
  /** Inline with sibling toolbar content — no extra vertical padding */
  embedded?: boolean;
}

export default function PanelLineTabs({ tabs, value, onChange, endContent, embedded }: Props) {
  return (
    <Tabs.Root
      value={value}
      onValueChange={(details) => onChange(details.value)}
      variant="line"
      size="sm"
      flexShrink={0}
    >
      <Tabs.List
        borderColor="border"
        px={embedded ? '0' : '2'}
        pt={embedded ? '0' : '2'}
        pb="0"
        gap="0.5"
      >
        {tabs.map((tab) => (
          <Tabs.Trigger
            key={tab.key}
            value={tab.key}
            minH="8"
            fontSize="2xs"
            fontFamily="mono"
            letterSpacing="label"
            color="fg.muted"
            whiteSpace="nowrap"
            _selected={{ color: 'accent', borderColor: 'accent' }}
            _hover={{ color: 'fg' }}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <Text as="span" ml="1" fontSize="2xs" color="fg.subtle">
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
