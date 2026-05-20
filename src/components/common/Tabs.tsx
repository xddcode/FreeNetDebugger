import { Tabs } from '@chakra-ui/react';

interface Tab {
  id: string;
  label: string;
}

interface Props {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  className?: string;
}

export default function AppTabs({ tabs, activeTab, onTabChange, className }: Props) {
  return (
    <Tabs.Root
      value={activeTab}
      onValueChange={(details) => onTabChange(details.value)}
      variant="line"
      size="sm"
      className={className}
    >
      <Tabs.List borderColor="border">
        {tabs.map((tab) => (
          <Tabs.Trigger
            key={tab.id}
            value={tab.id}
            color="fg.muted"
            _selected={{ color: 'accent', borderColor: 'accent' }}
            _hover={{ color: 'fg' }}
          >
            {tab.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
    </Tabs.Root>
  );
}
