import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MutableRefObject,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  Avatar,
  Box,
  Flex,
  IconButton,
  Input,
  Menu,
  Portal,
  Stack,
  Text,
} from '@chakra-ui/react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  FilePlus,
  FolderPlus,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import { APP } from '../../config/app';
import { SIDEBAR_WIDTH } from '../../config/constants';
import { useSessionStore, isGroup, isSession } from '../../store';
import { invoke } from '../../utils/tauri';
import { showToast } from '../../store/toastStore';
import type { GroupNode, SessionItem, Session, WorkspaceItem } from '../../types';

export type NavItemKey = 'workspace' | 'analytics' | 'history' | 'settings';

interface Props {
  /** Creates a session under `parentGroupId` (null = root). */
  onAddSession: (parentGroupId: string | null) => void;
}

const LIVE_STATUSES: ReadonlySet<Session['status']> = new Set([
  'connecting',
  'connected',
  'listening',
  'disconnecting',
]);

function NavIcon({ itemKey }: { itemKey: NavItemKey }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      {itemKey === 'workspace' && (
        <>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </>
      )}
      {itemKey === 'analytics' && (
        <>
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </>
      )}
      {itemKey === 'history' && (
        <>
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </>
      )}
      {itemKey === 'settings' && (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
        </>
      )}
    </svg>
  );
}

function StatusDot({ status }: { status: Session['status'] }) {
  const color =
    {
      connected: 'success',
      listening: 'accent',
      connecting: 'warning',
      disconnecting: 'warning',
      error: 'danger',
      idle: 'fg.subtle',
    }[status] ?? 'fg.subtle';
  return <Box w="2" h="2" rounded="full" bg={color} flexShrink={0} />;
}

/** Tree rows are nested under the "Workspace" nav entry, so they start at depth 1. */
const TREE_BASE_INDENT = 20;
const TREE_INDENT_STEP = 14;

function RenameInput({
  value,
  onChange,
  onCommit,
  onCancel,
}: {
  value: string;
  onChange: (v: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  return (
    <Input
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onCommit}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
        e.stopPropagation();
        if (e.key === 'Enter') { onCommit(); }
        if (e.key === 'Escape') { onCancel(); }
      }}
      size="sm"
      flex="1"
      minW="0"
      fontFamily="body"
      fontSize="sm"
      borderColor="accent.subtle"
    />
  );
}

/** Inline draft row — group is only persisted after explicit confirm (Enter / ✓). */
function PendingGroupRow({
  depth,
  name,
  onNameChange,
  onConfirm,
  onCancel,
}: {
  depth: number;
  name: string;
  onNameChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <Flex
      align="center"
      gap="1"
      pl={`${TREE_BASE_INDENT + depth * TREE_INDENT_STEP}px`}
      pr="2"
      py="2"
      rounded="sm"
      bg="accent.subtle"
      onClick={(e) => e.stopPropagation()}
    >
      <Box as="span" display="flex" color="fg.subtle" flexShrink={0} w="3.5" />
      <Input
        ref={ref}
        value={name}
        placeholder={t('groups.namePlaceholder')}
        onChange={(e) => onNameChange(e.target.value)}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
          e.stopPropagation();
          if (e.key === 'Enter') { onConfirm(); }
          if (e.key === 'Escape') { onCancel(); }
        }}
        size="sm"
        flex="1"
        minW="0"
        fontFamily="body"
        fontSize="sm"
        borderColor="accent"
      />
      <IconButton
        aria-label={t('groups.confirmCreate')}
        title={t('groups.confirmCreate')}
        size="2xs"
        variant="plain"
        color="accent"
        bg="transparent"
        _hover={{ bg: 'transparent', color: 'accent.emphasized' }}
        onClick={(e) => {
          e.stopPropagation();
          onConfirm();
        }}
      >
        <Check size={12} />
      </IconButton>
      <IconButton
        aria-label={t('groups.cancelCreate')}
        title={t('groups.cancelCreate')}
        size="2xs"
        variant="plain"
        color="fg.subtle"
        bg="transparent"
        _hover={{ bg: 'transparent', color: 'fg.muted' }}
        onClick={(e) => {
          e.stopPropagation();
          onCancel();
        }}
      >
        <X size={12} />
      </IconButton>
    </Flex>
  );
}

// ─────────────────────────────────────────────────────────────
// Context / "···" menu — shared between group rows and session rows.
// ─────────────────────────────────────────────────────────────

interface MenuAction {
  value: string;
  icon: ReactNode;
  label: string;
  /** Visually emphasise destructive actions (e.g. delete) in red. */
  destructive?: boolean;
  onSelect: () => void;
}

/** Set while a menu action runs so dismiss clicks don't toggle expand rows beneath. */
const MenuClickSuppressContext = createContext<MutableRefObject<boolean> | null>(null);

function useMenuClickSuppress() {
  return useContext(MenuClickSuppressContext);
}

const MENU_ICON_BOX = '14px';

function MenuItemIcon({ children, destructive }: { children: ReactNode; destructive?: boolean }) {
  return (
    <Box
      w={MENU_ICON_BOX}
      h={MENU_ICON_BOX}
      flexShrink={0}
      display="flex"
      alignItems="center"
      justifyContent="center"
      color={destructive ? 'danger' : 'fg.subtle'}
    >
      {children}
    </Box>
  );
}

/** Shared menu body — reused by both the context-trigger menu and the "···" trigger menu. */
function NodeMenuContent({ actions }: { actions: MenuAction[] }) {
  return (
    <Portal>
      <Menu.Positioner>
        <Menu.Content
          minW="168px"
          fontSize="sm"
          fontFamily="body"
          letterSpacing="normal"
          bg="bg.panel"
          borderWidth="1px"
          borderColor="border"
          boxShadow="none"
          py="1"
          gap="0"
          outline="none"
          _focusVisible={{ outline: 'none', boxShadow: 'none' }}
        >
          {actions.map((a) => (
            <Menu.Item
              key={a.value}
              value={a.value}
              display="flex"
              alignItems="center"
              gap="2"
              px="3"
              py="2"
              color={a.destructive ? 'danger' : 'fg.muted'}
              _hover={{
                bg: a.destructive ? 'danger.subtle' : 'bg.muted',
                color: a.destructive ? 'danger' : 'fg',
              }}
              _highlighted={{
                bg: a.destructive ? 'danger.subtle' : 'bg.muted',
                color: a.destructive ? 'danger' : 'fg',
              }}
              _focusVisible={{ outline: 'none' }}
            >
              <MenuItemIcon destructive={a.destructive}>{a.icon}</MenuItemIcon>
              <Menu.ItemText
                flex="1"
                minW="0"
                letterSpacing="normal"
                lineHeight="normal"
                fontFamily="body"
                fontSize="sm"
              >
                {a.label}
              </Menu.ItemText>
            </Menu.Item>
          ))}
        </Menu.Content>
      </Menu.Positioner>
    </Portal>
  );
}

/** Defer work until after the current task (same timing as queueMicrotask). */
function deferMicrotask(fn: () => void): void {
  void Promise.resolve().then(fn);
}

function menuRootProps(actions: MenuAction[], suppressRef?: MutableRefObject<boolean>) {
  return {
    positioning: { placement: 'right-start' as const, gutter: 4 },
    loopFocus: true,
    onSelect: (details: { value: string }) => {
      const action = actions.find((a) => a.value === details.value);
      if (!action) { return; }
      if (suppressRef) {
        suppressRef.current = true;
      }
      // Run after the menu closes so the dismiss click doesn't fall through
      // to a parent row's onClick (which would toggle expand/collapse).
      deferMicrotask(() => {
        action.onSelect();
        deferMicrotask(() => {
          if (suppressRef) {
            suppressRef.current = false;
          }
        });
      });
    },
  };
}

/**
 * Right-click context menu wrapper. Wrap a row in this and right-clicking
 * anywhere inside opens the actions menu. The "···" button is a *separate*
 * Menu.Root (see `NodeMenuButton`) — Ark UI's state machine only binds to one
 * trigger per Menu.Root, so combining both into the same root breaks one of
 * them.
 */
function NodeMenu({
  children,
  actions,
}: {
  children: ReactNode;
  actions: MenuAction[];
}) {
  const suppressRef = useMenuClickSuppress();
  return (
    <Menu.Root {...menuRootProps(actions, suppressRef ?? undefined)}>
      <Menu.ContextTrigger asChild>
        <Box width="full">{children}</Box>
      </Menu.ContextTrigger>
      <NodeMenuContent actions={actions} />
    </Menu.Root>
  );
}

/** Hover-only "···" button that opens the same set of actions on click. */
function NodeMenuButton({
  actions,
  ariaLabel,
}: {
  actions: MenuAction[];
  ariaLabel: string;
}) {
  const suppressRef = useMenuClickSuppress();
  return (
    <Menu.Root {...menuRootProps(actions, suppressRef ?? undefined)}>
      <Menu.Trigger asChild>
        <IconButton
          aria-label={ariaLabel}
          title={ariaLabel}
          size="2xs"
          variant="plain"
          color="fg.subtle"
          bg="transparent"
          _hover={{ color: 'accent', bg: 'transparent' }}
          _active={{ bg: 'transparent' }}
          _open={{ color: 'accent', bg: 'transparent' }}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal size={12} />
        </IconButton>
      </Menu.Trigger>
      <NodeMenuContent actions={actions} />
    </Menu.Root>
  );
}

// ─────────────────────────────────────────────────────────────
// Tree row components — depth-aware, indented by `depth * 12px`
// ─────────────────────────────────────────────────────────────

interface TreeHandlers {
  activeSessionId: string | null;
  editingId: string | null;
  draftName: string;
  setDraftName: (v: string) => void;
  beginRename: (id: string, current: string) => void;
  commitRename: () => void;
  cancelRename: () => void;
  /** `parentGroupId === null` → draft at workspace root; `undefined` in pendingGroup means idle. */
  pendingGroup: { parentGroupId: string | null } | null;
  pendingGroupName: string;
  setPendingGroupName: (v: string) => void;
  commitPendingGroup: () => void;
  cancelPendingGroup: () => void;
  onToggleExpanded: (id: string) => void;
  onAddSession: (parentGroupId: string | null) => void;
  onAddGroup: (parentGroupId: string | null) => void;
  onRemoveGroup: (id: string) => void;
  onSelectSession: (id: string) => void;
  onRemoveSession: (id: string) => void;
}

function GroupRow({
  group,
  depth,
  handlers,
}: {
  group: GroupNode;
  depth: number;
  handlers: TreeHandlers;
}) {
  const { t } = useTranslation();
  const isEditing = handlers.editingId === group.id;

  const actions: MenuAction[] = [
    {
      value: 'add-session',
      icon: <FilePlus size={14} strokeWidth={2} />,
      label: t('groups.addSession'),
      onSelect: () => handlers.onAddSession(group.id),
    },
    {
      value: 'add-subgroup',
      icon: <FolderPlus size={14} strokeWidth={2} />,
      label: t('groups.addSubGroup'),
      onSelect: () => handlers.onAddGroup(group.id),
    },
    {
      value: 'rename',
      icon: <Pencil size={14} strokeWidth={2} />,
      label: t('groups.rename'),
      onSelect: () => handlers.beginRename(group.id, group.name),
    },
    {
      value: 'remove',
      icon: <Trash2 size={14} strokeWidth={2} />,
      label: t('groups.remove'),
      destructive: true,
      onSelect: () => handlers.onRemoveGroup(group.id),
    },
  ];

  const suppressRef = useMenuClickSuppress();
  const toggleExpand = () => {
    if (suppressRef?.current) { return; }
    handlers.onToggleExpanded(group.id);
  };
  const showExpanded =
    group.expanded
    || (
      handlers.pendingGroup !== null
      && handlers.pendingGroup.parentGroupId === group.id
    );

  return (
    <Flex
      align="center"
      gap="0"
      pl={`${TREE_BASE_INDENT + depth * TREE_INDENT_STEP}px`}
      pr="2"
      py="2"
      rounded="sm"
      className="group"
      color="fg.muted"
    >
      <NodeMenu actions={actions}>
        <Flex
          flex="1"
          align="center"
          gap="2"
          minW="0"
          cursor="pointer"
          _hover={{ bg: 'bg.muted' }}
          onClick={toggleExpand}
        >
          <Box as="span" display="flex" color="fg.subtle" flexShrink={0}>
            {showExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </Box>
          {isEditing ? (
            <RenameInput
              value={handlers.draftName}
              onChange={handlers.setDraftName}
              onCommit={handlers.commitRename}
              onCancel={handlers.cancelRename}
            />
          ) : (
            <Text
              flex="1"
              minW="0"
              truncate
              fontSize="sm"
              fontFamily="body"
            >
              {group.name}
            </Text>
          )}
        </Flex>
      </NodeMenu>
      {!isEditing && (
        <Box
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <NodeMenuButton actions={actions} ariaLabel={t('groups.more')} />
        </Box>
      )}
    </Flex>
  );
}

function SessionRow({
  sess,
  depth,
  handlers,
}: {
  sess: SessionItem;
  depth: number;
  handlers: TreeHandlers;
}) {
  const { t } = useTranslation();
  const active = sess.id === handlers.activeSessionId;
  const isEditing = handlers.editingId === sess.id;
  const actions: MenuAction[] = [
    {
      value: 'rename',
      icon: <Pencil size={14} strokeWidth={2} />,
      label: t('groups.rename'),
      onSelect: () => handlers.beginRename(sess.id, sess.name),
    },
    {
      value: 'remove',
      icon: <Trash2 size={14} strokeWidth={2} />,
      label: t('groups.deleteSession'),
      destructive: true,
      onSelect: () => handlers.onRemoveSession(sess.id),
    },
  ];

  const showStatus = sess.status !== 'idle';

  return (
    <NodeMenu actions={actions}>
      <Flex
        width="full"
        align="center"
        gap="0"
        pl={`${TREE_BASE_INDENT + depth * TREE_INDENT_STEP}px`}
        pr="2"
        minH="9"
        py="1.5"
        rounded="md"
        className="group/session"
        cursor="pointer"
        bg={active ? 'accent.subtle' : 'transparent'}
        _hover={{
          bg: active ? 'accent.subtle' : 'bg.muted',
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (!isEditing) { handlers.onSelectSession(sess.id); }
        }}
      >
        {/* Same 12px column as group chevrons — keeps labels aligned in the tree. */}
        <Box
          w="3.5"
          flexShrink={0}
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          {showStatus && <StatusDot status={sess.status} />}
        </Box>
        {isEditing ? (
          <RenameInput
            value={handlers.draftName}
            onChange={handlers.setDraftName}
            onCommit={handlers.commitRename}
            onCancel={handlers.cancelRename}
          />
        ) : (
          <Text
            flex="1"
            minW="0"
            truncate
            fontFamily="body"
            fontSize="sm"
            lineHeight="normal"
            color={active ? 'accent' : 'fg.muted'}
            title={sess.name}
          >
            {sess.name}
          </Text>
        )}
        {!isEditing && (
          <Box
            className="opacity-0 group-hover/session:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <NodeMenuButton actions={actions} ariaLabel={t('groups.more')} />
          </Box>
        )}
      </Flex>
    </NodeMenu>
  );
}

/** Recursive tree renderer. Renders the children of a group at `depth`. */
function TreeBranch({
  items,
  depth,
  branchParentGroupId,
  handlers,
}: {
  items: WorkspaceItem[];
  depth: number;
  /** Which group's `children` this branch lists; `null` = workspace root. */
  branchParentGroupId: string | null;
  handlers: TreeHandlers;
}) {
  const showPending =
    handlers.pendingGroup !== null
    && handlers.pendingGroup.parentGroupId === branchParentGroupId;

  return (
    <Stack gap="0">
      {items.map((it) => {
        if (isGroup(it)) {
          return (
            <Box key={it.id}>
              <GroupRow group={it} depth={depth} handlers={handlers} />
              {(
                it.expanded
                || (
                  handlers.pendingGroup !== null
                  && handlers.pendingGroup.parentGroupId === it.id
                )
              ) && (
                <TreeBranch
                  items={it.children}
                  depth={depth + 1}
                  branchParentGroupId={it.id}
                  handlers={handlers}
                />
              )}
            </Box>
          );
        }
        return <SessionRow key={it.id} sess={it} depth={depth} handlers={handlers} />;
      })}
      {showPending && (
        <PendingGroupRow
          depth={depth}
          name={handlers.pendingGroupName}
          onNameChange={handlers.setPendingGroupName}
          onConfirm={handlers.commitPendingGroup}
          onCancel={handlers.cancelPendingGroup}
        />
      )}
    </Stack>
  );
}

// ─────────────────────────────────────────────────────────────
// Top-level nav entry — also acts as a collapsible section header.
// ─────────────────────────────────────────────────────────────

function NavSection({
  itemKey,
  label,
  expanded,
  onToggle,
  menuActions,
  children,
  suppressRef,
}: {
  itemKey: NavItemKey;
  label: string;
  expanded: boolean;
  onToggle: () => void;
  suppressRef?: MutableRefObject<boolean>;
  /** Optional dropdown menu (right-click or "···") for this section. */
  menuActions?: MenuAction[];
  /** Section content rendered below the header when expanded. */
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  const toggleTarget = (
    <Flex
      flex="1"
      align="center"
      gap="2"
      minW="0"
      height="10"
      cursor="pointer"
      onClick={() => {
        if (suppressRef?.current) { return; }
        onToggle();
      }}
    >
      <Box as="span" display="flex" color="fg.subtle" flexShrink={0}>
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </Box>
      <Box as="span" display="flex" flexShrink={0}>
        <NavIcon itemKey={itemKey} />
      </Box>
      <Text
        flex="1"
        minW="0"
        truncate
        fontFamily="body"
        fontSize="sm"
        color="fg.muted"
      >
        {label}
      </Text>
    </Flex>
  );

  return (
    <Box>
      <Flex
        align="center"
        gap="0"
        width="full"
        pl="4"
        pr="3"
        py="1"
        rounded="md"
        className="group"
        color="fg.muted"
        _hover={{ bg: 'bg.muted', color: 'fg' }}
      >
        {menuActions && menuActions.length > 0 ? (
          <NodeMenu actions={menuActions}>{toggleTarget}</NodeMenu>
        ) : (
          toggleTarget
        )}
        {menuActions && menuActions.length > 0 && (
          <Box
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <NodeMenuButton actions={menuActions} ariaLabel={t('groups.more')} />
          </Box>
        )}
      </Flex>
      {expanded && children}
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

export default function SideNavBar({ onAddSession }: Props) {
  const { t } = useTranslation();
  const rootChildren = useSessionStore((s) => s.rootChildren);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const setActiveSession = useSessionStore((s) => s.setActiveSession);
  const toggleGroupExpanded = useSessionStore((s) => s.toggleGroupExpanded);
  const addGroup = useSessionStore((s) => s.addGroup);
  const removeGroup = useSessionStore((s) => s.removeGroup);
  const renameGroup = useSessionStore((s) => s.renameGroup);
  const renameSession = useSessionStore((s) => s.renameSession);
  const removeSession = useSessionStore((s) => s.removeSession);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [pendingGroup, setPendingGroup] = useState<{ parentGroupId: string | null } | null>(null);
  const [pendingGroupName, setPendingGroupName] = useState('');

  // Multiple sections can be expanded at the same time, VSCode-style.
  const [sectionExpanded, setSectionExpanded] = useState<Record<NavItemKey, boolean>>({
    workspace: true,
    analytics: false,
    history: false,
    settings: false,
  });
  const toggleSection = (key: NavItemKey) =>
    setSectionExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const beginRename = (id: string, current: string) => {
    setPendingGroup(null);
    setPendingGroupName('');
    setEditingId(id);
    setDraftName(current);
  };
  const commitRename = () => {
    if (editingId) {
      // Without tracking what kind of node owns `editingId` we just try both —
      // store actions look up by id and quietly no-op when there's no match.
      renameGroup(editingId, draftName);
      renameSession(editingId, draftName);
    }
    setEditingId(null);
    setDraftName('');
  };
  const cancelRename = () => {
    setEditingId(null);
    setDraftName('');
  };

  /** Hard delete a session — disconnects first if it's currently live. */
  const deleteSession = async (sessionId: string) => {
    const sess = useSessionStore.getState().rootChildren
      .flatMap(walkSessions)
      .find((s) => s.id === sessionId);
    if (sess && LIVE_STATUSES.has(sess.status)) {
      try {
        await invoke('disconnect', { id: sessionId });
      } catch (e) {
        showToast('error', `${t('toast.disconnectFailed')}: ${e}`);
      }
    }
    removeSession(sessionId);
  };

  /** Disconnect every live session inside the group, then delete the group itself. */
  const deleteGroup = async (groupId: string) => {
    const group = findGroupInTree(useSessionStore.getState().rootChildren, groupId);
    if (group) {
      for (const s of walkSessions(group)) {
        if (LIVE_STATUSES.has(s.status)) {
          try {
            await invoke('disconnect', { id: s.id });
          } catch {
            // best-effort — proceed even if disconnect fails
          }
        }
      }
    }
    removeGroup(groupId);
  };

  const startPendingGroup = (parentGroupId: string | null) => {
    setEditingId(null);
    setDraftName('');
    if (parentGroupId === null) {
      setSectionExpanded((prev) => ({ ...prev, workspace: true }));
    } else {
      const parent = findGroupInTree(rootChildren, parentGroupId);
      if (parent && !parent.expanded) {
        toggleGroupExpanded(parentGroupId);
      }
    }
    setPendingGroup({ parentGroupId });
    setPendingGroupName('');
  };

  const menuClickSuppressRef = useRef(false);
  const workspaceExpanded =
    sectionExpanded.workspace
    || (pendingGroup !== null && pendingGroup.parentGroupId === null);

  const commitPendingGroup = () => {
    if (!pendingGroup) { return; }
    const name = pendingGroupName.trim() || t('groups.untitled');
    addGroup(name, pendingGroup.parentGroupId);
    setPendingGroup(null);
    setPendingGroupName('');
  };

  const cancelPendingGroup = () => {
    setPendingGroup(null);
    setPendingGroupName('');
  };

  const handlers: TreeHandlers = {
    activeSessionId,
    editingId,
    draftName,
    setDraftName,
    beginRename,
    commitRename,
    cancelRename,
    pendingGroup,
    pendingGroupName,
    setPendingGroupName,
    commitPendingGroup,
    cancelPendingGroup,
    onToggleExpanded: toggleGroupExpanded,
    onAddSession: (gid) => onAddSession(gid),
    onAddGroup: (gid) => startPendingGroup(gid),
    onRemoveGroup: (id) => { void deleteGroup(id); },
    onSelectSession: setActiveSession,
    onRemoveSession: (id) => { void deleteSession(id); },
  };

  return (
    <MenuClickSuppressContext.Provider value={menuClickSuppressRef}>
    <Box
      as="aside"
      position="fixed"
      left="0"
      top="0"
      height="full"
      width={SIDEBAR_WIDTH}
      zIndex="50"
      display="flex"
      flexDirection="column"
      borderRightWidth="1px"
      borderColor="border"
      bg="bg.subtle"
    >
      <Box px="4" pt="4" pb="3" flexShrink={0}>
        <Text
          fontSize="lg"
          color="accent"
          fontWeight="normal"
          letterSpacing="tight"
          lineHeight="tight"
          title={APP.name}
        >
          {APP.name}
        </Text>
        <Text
          fontSize="2xs"
          color="fg.subtle"
          fontFamily="mono"
          letterSpacing="label"
          mt="1"
        >
          v{APP.version}
        </Text>
      </Box>

      <Box flex="1" overflowY="auto" px="3" pb="4" className="sidebar-scroll">
        <Stack gap="1">
          <NavSection
            itemKey="workspace"
            label={t('nav.workspace')}
            expanded={workspaceExpanded}
            suppressRef={menuClickSuppressRef}
            onToggle={() => toggleSection('workspace')}
            menuActions={[
              {
                value: 'add-session',
                icon: <FilePlus size={14} strokeWidth={2} />,
                label: t('header.newSession'),
                onSelect: () => onAddSession(null),
              },
              {
                value: 'add-group',
                icon: <FolderPlus size={14} strokeWidth={2} />,
                label: t('groups.add'),
                onSelect: () => startPendingGroup(null),
              },
            ]}
          >
            {rootChildren.length === 0 && pendingGroup === null ? (
              <Text
                pl={`${TREE_BASE_INDENT}px`}
                py="2"
                fontSize="sm"
                fontFamily="body"
                color="fg.subtle"
              >
                {t('groups.empty')}
              </Text>
            ) : (
              <TreeBranch
                items={rootChildren}
                depth={0}
                branchParentGroupId={null}
                handlers={handlers}
              />
            )}
          </NavSection>

          {/* <NavSection
            itemKey="settings"
            label={t('nav.settings')}
            expanded={sectionExpanded.settings}
            onToggle={() => toggleSection('settings')}
          >
            <ComingSoonRow />
          </NavSection> */}
        </Stack>
      </Box>

      <Flex
        px="4"
        py="3.5"
        flexShrink={0}
        borderTopWidth="1px"
        borderColor="border"
        align="center"
        gap="3"
      >
        <Avatar.Root size="md" bg="bg.emphasized" color="fg.subtle">
          <Avatar.Fallback>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </Avatar.Fallback>
        </Avatar.Root>
        <Text fontSize="sm" color="fg.muted" fontFamily="body" lineHeight="normal">
          {t('nav.userProfile')}
        </Text>
      </Flex>
    </Box>
    </MenuClickSuppressContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────
// Local read-only helpers (no store mutation needed)
// ─────────────────────────────────────────────────────────────

function walkSessions(item: WorkspaceItem): SessionItem[] {
  if (isSession(item)) { return [item]; }
  return item.children.flatMap(walkSessions);
}

function findGroupInTree(items: WorkspaceItem[], id: string): GroupNode | null {
  for (const it of items) {
    if (isGroup(it)) {
      if (it.id === id) { return it; }
      const inner = findGroupInTree(it.children, id);
      if (inner) { return inner; }
    }
  }
  return null;
}
