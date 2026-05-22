import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Reorder } from 'framer-motion';
import { Plus } from 'lucide-react';
import {
  Box,
  CloseButton,
  Flex,
  IconButton,
  Input,
  Text,
} from '@chakra-ui/react';
import { isHttpSession, type Session } from '../../types';
import HttpMethodTabBadge from './HttpMethodTabBadge';
import {
  APP_HEADER_TAB_ADD_SIZE,
  APP_HEADER_TAB_HEIGHT,
} from '../../config/constants';

export type TabSessionView = Session & { tabDirty: boolean };

const TAB_LAYOUT_SPRING = { type: 'spring' as const, stiffness: 650, damping: 42, mass: 0.55 };
const TAB_DRAG_SPRING = { type: 'spring' as const, stiffness: 480, damping: 32 };

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

function TabLeadingIndicator({ session }: { session: TabSessionView }) {
  if (isHttpSession(session)) {
    return <HttpMethodTabBadge method={session.config.httpMethod ?? 'GET'} />;
  }
  return <SessionDot status={session.status} />;
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
  onReorderOrder: (orderedIds: string[]) => void;
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
  onReorderOrder,
  onNewSession,
  newSessionTitle,
}: Props) {
  const editInputRef = useRef<HTMLInputElement>(null);
  const draggedTabRef = useRef(false);
  const isDraggingRef = useRef(false);
  const localOrderRef = useRef<string[]>([]);

  const sessionMap = useMemo(
    () => new Map(sessions.map((session) => [session.id, session])),
    [sessions],
  );
  const incomingOrder = useMemo(() => sessions.map((session) => session.id), [sessions]);
  const [dragOrder, setDragOrder] = useState<string[] | null>(null);
  const activeOrder = dragOrder ?? incomingOrder;

  const orderedSessions = useMemo(
    () =>
      activeOrder
        .map((id) => sessionMap.get(id))
        .filter((session): session is TabSessionView => session !== undefined),
    [activeOrder, sessionMap],
  );

  const handleLocalReorder = useCallback((nextOrder: string[]) => {
    localOrderRef.current = nextOrder;
    setDragOrder(nextOrder);
  }, []);

  const handleDragStart = useCallback(() => {
    isDraggingRef.current = true;
    localOrderRef.current = incomingOrder;
    setDragOrder(incomingOrder);
  }, [incomingOrder]);

  const handleDragEnd = useCallback(() => {
    isDraggingRef.current = false;
    window.setTimeout(() => {
      draggedTabRef.current = false;
    }, 100);
    onReorderOrder(localOrderRef.current);
    setDragOrder(null);
  }, [onReorderOrder]);

  useEffect(() => {
    if (editingId) {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }
  }, [editingId]);

  return (
    <Flex
      align="center"
      flex="1"
      minW="0"
      height="full"
      gap="1"
      px="3"
      py="1"
    >
      <Flex align="center" gap="1" flexShrink={0}>
        <Reorder.Group
          axis="x"
          values={activeOrder}
          onReorder={handleLocalReorder}
          className="session-tab-reorder-group"
        >
        {orderedSessions.map((sess) => {
          const active = sess.id === activeId;
          const isEditing = editingId === sess.id;

          return (
            <Reorder.Item
              key={sess.id}
              value={sess.id}
              layout="position"
              drag={!isEditing}
              dragListener={!isEditing}
              dragElastic={0.04}
              dragTransition={{ bounceStiffness: 600, bounceDamping: 32 }}
              transition={{
                layout: TAB_LAYOUT_SPRING,
                default: TAB_DRAG_SPRING,
              }}
              onDragStart={handleDragStart}
              onDrag={() => {
                draggedTabRef.current = true;
              }}
              onDragEnd={handleDragEnd}
              whileDrag={{
                scale: 1.03,
                y: -2,
                zIndex: 30,
                cursor: 'grabbing',
              }}
              className="session-tab-reorder-item"
            >
              <Flex
                className="group session-tab-item"
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
                cursor={isEditing ? 'text' : 'grab'}
                onClick={() => {
                  if (draggedTabRef.current) {
                    draggedTabRef.current = false;
                    return;
                  }
                  onSelect(sess.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(sess.id);
                  }
                }}
                onDoubleClick={() => onStartRename(sess.id, sess.name)}
              >
                <TabLeadingIndicator session={sess} />
                {isEditing ? (
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
                    onPointerDown={(e) => e.stopPropagation()}
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
                {!isEditing && (
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
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        void onCloseSession(sess.id);
                      }}
                    />
                  </Flex>
                )}
              </Flex>
            </Reorder.Item>
          );
        })}
        </Reorder.Group>
        <IconButton
          aria-label={newSessionTitle}
          title={newSessionTitle}
          className="session-tab-item"
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
      <Box
        className="session-tab-bar-drag"
        flex="1"
        minW="2"
        alignSelf="stretch"
        data-tauri-drag-region
      />
    </Flex>
  );
}
