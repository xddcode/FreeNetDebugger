import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
  type ComponentProps,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Button, Flex, Stack } from '@chakra-ui/react';
import { Wand2 } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { FieldSelect } from '../../sidebar/ui';
import { defineAppMonacoThemeSync, MONACO_BASE_EDITOR_OPTIONS } from '../../../utils/monacoTheme';
import type { HttpBody } from '../../../types';
import HttpEmptyPlaceholder from './HttpEmptyPlaceholder';

export interface HttpBodyEditorHandle {
  getContent: () => string;
  flush: () => void;
}

interface HttpBodyEditorProps {
  bodyType: HttpBody['type'];
  initialContent: string;
  bodyAllowed: boolean;
  appTheme: 'dark' | 'light';
  onCommit: (content: string) => void;
  onTypeChange: (type: HttpBody['type']) => void;
  onEditStart?: () => void;
}

const HttpBodyEditor = forwardRef<HttpBodyEditorHandle, HttpBodyEditorProps>(function HttpBodyEditor(
  {
    bodyType,
    initialContent,
    bodyAllowed,
    appTheme,
    onCommit,
    onTypeChange,
    onEditStart,
  },
  ref,
) {
  const { t } = useTranslation();
  const [content, setContent] = useState(initialContent);
  const contentRef = useRef(initialContent);
  const bodyEditorRef = useRef<Parameters<NonNullable<ComponentProps<typeof Editor>['onMount']>>[0] | null>(null);

  const flush = useCallback(() => {
    onCommit(contentRef.current);
  }, [onCommit]);

  useImperativeHandle(ref, () => ({
    getContent: () => contentRef.current,
    flush,
  }), [flush]);

  const handleChange = useCallback((value: string | undefined) => {
    const next = value ?? '';
    contentRef.current = next;
    setContent(next);
    onEditStart?.();
  }, [onEditStart]);

  const handleFormatJson = () => {
    bodyEditorRef.current?.getAction('editor.action.formatDocument')?.run();
  };

  return (
    <Stack gap="0" flex="1" minH="0" h="full">
      <Flex align="center" gap="2" px="4" py="2" flexShrink={0}>
        <FieldSelect
          value={bodyType}
          onChange={(v) => onTypeChange(v as HttpBody['type'])}
          options={[
            { value: 'none', label: t('http.bodyTypeNone') },
            { value: 'text', label: t('http.bodyTypeText') },
            { value: 'json', label: t('http.bodyTypeJson') },
          ]}
          width="72px"
          minWidth="72px"
          fontSize="2xs"
          disabled={!bodyAllowed}
        />
        {bodyType === 'json' && bodyAllowed && (
          <Button
            onClick={handleFormatJson}
            title={t('http.formatJson')}
            size="xs"
            variant="outline"
            colorPalette="blue"
            fontSize="2xs"
            fontFamily="mono"
          >
            <Wand2 size={12} />
            {t('http.formatJson')}
          </Button>
        )}
      </Flex>

      {bodyType === 'none' || !bodyAllowed ? (
        <HttpEmptyPlaceholder>{t('http.noBody')}</HttpEmptyPlaceholder>
      ) : (
        <Box flex="1" minH="0" overflow="hidden" className="http-editor-pane">
          <Editor
            value={content}
            onChange={handleChange}
            onMount={(editor) => { bodyEditorRef.current = editor; }}
            beforeMount={(monaco) => { defineAppMonacoThemeSync(monaco, appTheme); }}
            language={bodyType === 'json' ? 'json' : 'plaintext'}
            theme={`app-${appTheme}`}
            options={{
              ...MONACO_BASE_EDITOR_OPTIONS,
              renderLineHighlight: 'none',
            }}
          />
        </Box>
      )}
    </Stack>
  );
});

export default HttpBodyEditor;
