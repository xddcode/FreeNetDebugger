import { useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';
import {
  Box,
  CloseButton,
  Flex,
  IconButton,
  Input,
  Text,
} from '@chakra-ui/react';
import type { Session } from '../../types';
import {
  APP_HEADER_TAB_ADD_SIZE,
  APP_HEADER_TAB_HEIGHT,
} from '../../config/constants';

export type TabSessionView = Session & { tabDirty: boolean };

function SessionDot({ status }: { status: string }) {
  const color =
    {
      connected: 'success',
      listening: 'success',
      connecting: 'warning',
      error: 'danger',
    }[status] ?? 'fg.subtle';

  return (
    <Box
      w="1.5"
      h="1.5"
      rounded="full"
      flexShrink={0}
      bg={color}
      boxShadow="0 0 5px currentColor"
    />
  );
}

function UnsavedDot() {
  return (
    <Box
      w="2"
      h="2"
      rounded="full"
      flexShrink={0}
      bg="fg.muted"
      title="Unsaved changes"
      aria-label="Unsaved changes"
    />
  );
}

interface Props {
  sessions: TabSessionView[];
  activeId: string | null;
  editingId: string | null;
  editingName: string;
  onSelect: (id: string) => void;
  onStartRename: (id: string, name: string) => void;
  onEditingNameChange: (name: string) => void;
  onConfirmRename: () => void;
  onCancelRename: () => void;
  onCloseSession: (id: string) => void;
  onNewSession: () => void;
  newSessionTitle: string;
}

export default function SessionTabBar({
  sessions,
  activeId,
  editingId,
  editingName,
  onSelect,
  onStartRename,
  onEditingNameChange,
  onConfirmRename,
  onCancelRename,
  onCloseSession,
  onNewSession,
  newSessionTitle,
}: Props) {
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId) {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }
  }, [editingId]);

  return (
    <Flex
      data-tauri-drag-region
      align="center"
      flex="1"
      minW="0"
      height="full"
      gap="1"
      px="3"
      py="1"
      cursor="move"
    >
      {sessions.map((sess) => {
        const active = sess.id === activeId;
        return (
          <Flex
            key={sess.id}
            className="group"
            role="button"
            tabIndex={0}
            align="center"
            gap="1.5"
            px="3.5"
            height={APP_HEADER_TAB_HEIGHT}
            rounded="md"
            flexShrink={0}
            fontFamily="body"
            fontSize="sm"
            borderWidth="1px"
            borderColor={active ? 'accent.subtle' : 'transparent'}
            bg={active ? 'accent.subtle' : 'transparent'}
            color={active ? 'accent' : 'fg.subtle'}
            _hover={{ color: active ? 'accent' : 'fg.muted' }}
            cursor="pointer"
            onClick={() => onSelect(sess.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(sess.id);
              }
            }}
            onDoubleClick={() => onStartRename(sess.id, sess.name)}
          >
            <SessionDot status={sess.status} />
            {editingId === sess.id ? (
              <Input
                ref={editInputRef}
                value={editingName}
                onChange={(e) => onEditingNameChange(e.target.value)}
                onBlur={onConfirmRename}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter') {
                    onConfirmRename();
                  }
                  if (e.key === 'Escape') {
                    onCancelRename();
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                size="xs"
                width="100px"
            fontFamily="body"
            fontSize="sm"
                borderColor="accent.subtle"
              />
            ) : (
              <Text maxW="120px" truncate title={sess.name}>
                {sess.name}
              </Text>
            )}
            {editingId !== sess.id && (
              <Flex
                align="center"
                justify="center"
                alignSelf="stretch"
                w="4"
                flexShrink={0}
                position="relative"
              >
                {sess.tabDirty && (
                  <Flex
                    position="absolute"
                    inset="0"
                    align="center"
                    justify="center"
                    className="group-hover:opacity-0 transition-opacity"
                    pointerEvents="none"
                  >
                    <UnsavedDot />
                  </Flex>
                )}
                <CloseButton
                  size="2xs"
                  variant="plain"
                  minW="4"
                  h="4"
                  p="0"
                  lineHeight="1"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  color="fg.subtle"
                  _hover={{ bg: 'transparent', color: 'fg.muted' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    void onCloseSession(sess.id);
                  }}
                />
              </Flex>
            )}
          </Flex>
        );
      })}
      <IconButton
        aria-label={newSessionTitle}
        title={newSessionTitle}
        size="sm"
        minW={APP_HEADER_TAB_ADD_SIZE}
        height={APP_HEADER_TAB_ADD_SIZE}
        flexShrink={0}
        variant="outline"
        borderStyle="dashed"
        borderColor="border.emphasized"
        color="fg.muted"
        fontSize="sm"
        _hover={{
          color: 'accent',
          borderColor: 'accent',
          bg: 'accent.subtle',
        }}
        onClick={onNewSession}
      >
        <Plus size={16} strokeWidth={2.25} />
      </IconButton>
    </Flex>
  );
}
