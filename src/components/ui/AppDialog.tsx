import type { ReactNode } from 'react';
import { Dialog, Portal } from '@chakra-ui/react';

interface Props {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  contentMaxW?: string;
  contentWidth?: string;
}

export default function AppDialog({
  open,
  onClose,
  children,
  size = 'sm',
  contentMaxW,
  contentWidth,
}: Props) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(details) => {
        if (!details.open) {
          onClose();
        }
      }}
      placement="center"
      size={size}
      lazyMount
      unmountOnExit
    >
      <Portal>
        <Dialog.Backdrop bg="blackAlpha.700" backdropFilter="blur(4px)" />
        <Dialog.Positioner>
          <Dialog.Content
            bg="bg.panel"
            borderWidth="1px"
            borderColor="border"
            shadow="lg"
            maxW={contentMaxW}
            width={contentWidth}
          >
            {children}
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
