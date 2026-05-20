import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  Checkbox,
  Flex,
  Stack,
  Text,
} from '@chakra-ui/react';
import Editor from '@monaco-editor/react';
import { CheckboxControl } from '../sidebar/ui';
import { useScriptStore } from '../../store';
import { showToast } from '../../store/toastStore';
import { runScript } from '../../services/scriptService';
import type { Script } from '../../types';

interface Props {
  sessionId?: string;
}

export default function ScriptsPanel({ sessionId }: Props) {
  const { t } = useTranslation();
  const scripts = useScriptStore((s) => s.scripts);
  const activeId = useScriptStore((s) => s.activeScriptId);
  const addScript = useScriptStore((s) => s.addScript);
  const removeScript = useScriptStore((s) => s.removeScript);
  const updateScript = useScriptStore((s) => s.updateScript);
  const setActive = useScriptStore((s) => s.setActiveScript);
  const linkToSession = useScriptStore((s) => s.linkToSession);
  const unlinkFromSession = useScriptStore((s) => s.unlinkFromSession);

  const [output, setOutput] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const activeScript = scripts.find((s) => s.id === activeId) ?? null;

  const handleAdd = () => {
    addScript();
    showToast('success', t('toast.scriptAdded'));
  };

  const handleDelete = (id: string) => {
    removeScript(id);
    showToast('info', t('toast.scriptDeleted'));
  };

  const activeIdRef = useRef(activeId);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  const debounceTimerRef = useRef<number | null>(null);

  const handleSourceChange = useCallback(
    (value: string | undefined) => {
      if (!activeIdRef.current || value === undefined) return;
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = window.setTimeout(() => {
        debounceTimerRef.current = null;
        updateScript(activeIdRef.current!, { source: value });
      }, 500);
    },
    [updateScript],
  );

  const handleToggleAutoRun = (script: Script) => {
    updateScript(script.id, { autoRun: !script.autoRun });
  };

  const handleToggleLink = (script: Script) => {
    if (!sessionId) { return; }
    if (script.linkedSessionIds.includes(sessionId)) {
      unlinkFromSession(script.id, sessionId);
    } else {
      linkToSession(script.id, sessionId);
    }
  };

  const handleRun = async () => {
    if (!activeScript || !sessionId) { return; }
    setIsRunning(true);
    setOutput((prev) => [...prev, `> Running "${activeScript.name}"...`]);
    try {
      const result = await runScript(sessionId, activeScript.source);
      setOutput((prev) => [...prev, ...result.map((line) => `  ${line}`), '> Done.']);
    } catch (e) {
      setOutput((prev) => [...prev, `> Error: ${e}`]);
      showToast('error', `${t('toast.scriptRunFailed')}: ${e}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleStop = () => {
    setIsRunning(false);
    setOutput((prev) => [...prev, '> Stopped.']);
    showToast('warning', t('toast.scriptStopped'));
  };

  const clearOutput = () => setOutput([]);

  return (
    <Flex direction="column" h="full" gap="2">
      <Flex align="center" gap="1" flexShrink={0}>
        <Flex flex="1" align="center" gap="1" overflowX="auto" className="sidebar-scroll">
          {scripts.map((sc) => (
            <Button
              key={sc.id}
              onClick={() => setActive(sc.id)}
              size="xs"
              variant={sc.id === activeId ? 'surface' : 'outline'}
              colorPalette={sc.id === activeId ? 'blue' : 'gray'}
              fontFamily="mono"
              fontSize="2xs"
              whiteSpace="nowrap"
              flexShrink={0}
            >
              {sc.name}
              {sc.autoRun && (
                <Text as="span" ml="1" color="success">
                  ●
                </Text>
              )}
            </Button>
          ))}
        </Flex>
        <Button
          onClick={handleAdd}
          size="xs"
          variant="outline"
          colorPalette="blue"
          flexShrink={0}
          fontSize="2xs"
        >
          + {t('shortcuts.add')}
        </Button>
      </Flex>

      {activeScript ? (
        <>
          <Flex align="center" justify="space-between" flexShrink={0}>
            <Flex align="center" gap="2" flexWrap="wrap">
              <Button
                onClick={isRunning ? handleStop : handleRun}
                disabled={!activeScript}
                size="xs"
                variant="outline"
                colorPalette={isRunning ? 'red' : 'green'}
                textTransform="uppercase"
                fontSize="2xs"
                fontWeight="bold"
              >
                {isRunning ? 'Stop' : 'Run'}
              </Button>
              <Checkbox.Root
                checked={activeScript.autoRun}
                onCheckedChange={() => handleToggleAutoRun(activeScript)}
                colorPalette="blue"
                variant="outline"
                size="sm"
              >
                <Checkbox.HiddenInput />
                <CheckboxControl />
                <Checkbox.Label fontSize="2xs" color="fg.muted">
                  Auto-run
                </Checkbox.Label>
              </Checkbox.Root>
              {sessionId && (
                <Checkbox.Root
                  checked={activeScript.linkedSessionIds.includes(sessionId)}
                  onCheckedChange={() => handleToggleLink(activeScript)}
                  colorPalette="blue"
                  variant="outline"
                  size="sm"
                >
                  <Checkbox.HiddenInput />
                  <CheckboxControl />
                  <Checkbox.Label fontSize="2xs" color="fg.muted">
                    Link
                  </Checkbox.Label>
                </Checkbox.Root>
              )}
            </Flex>
            <Button
              onClick={() => handleDelete(activeScript.id)}
              size="xs"
              variant="ghost"
              colorPalette="red"
              fontSize="2xs"
            >
              {t('profile.delete')}
            </Button>
          </Flex>

          <Box flex="1" minH="0" rounded="md" borderWidth="1px" borderColor="border" overflow="hidden">
            <Editor
              value={activeScript.source}
              onChange={handleSourceChange}
              language="javascript"
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                lineNumbers: 'on',
                roundedSelection: false,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 8 },
              }}
            />
          </Box>

          <Flex
            direction="column"
            flexShrink={0}
            h="120px"
            rounded="md"
            borderWidth="1px"
            borderColor="border"
            bg="bg.muted"
            overflow="hidden"
          >
            <Flex
              align="center"
              justify="space-between"
              px="2"
              py="1"
              borderBottomWidth="1px"
              borderColor="border"
            >
              <Text fontSize="2xs" textTransform="uppercase" letterSpacing="wider" color="fg.subtle">
                Output
              </Text>
              <Button onClick={clearOutput} size="xs" variant="ghost" fontSize="2xs" color="fg.subtle">
                {t('send.clear')}
              </Button>
            </Flex>
            <Box flex="1" overflowY="auto" p="2" fontFamily="mono" fontSize="2xs" color="fg.muted" className="sidebar-scroll">
              {output.length === 0 ? (
                <Text color="fg.subtle">Ready...</Text>
              ) : (
                <Stack gap="0">
                  {output.map((line, i) => (
                    <Text key={i} lineHeight="relaxed">
                      {line}
                    </Text>
                  ))}
                </Stack>
              )}
            </Box>
          </Flex>
        </>
      ) : (
        <Flex flex="1" direction="column" align="center" justify="center" gap="3" color="fg.subtle">
          <Text fontSize="2xs">{t('sendCenter.emptyShortcuts')}</Text>
          <Button onClick={handleAdd} size="sm" variant="outline" colorPalette="blue" fontSize="2xs">
            + {t('shortcuts.add')}
          </Button>
        </Flex>
      )}
    </Flex>
  );
}
