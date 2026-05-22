import { memo, useRef, type ChangeEvent } from 'react';

import { useTranslation } from 'react-i18next';

import { Box, Button, Flex, IconButton } from '@chakra-ui/react';

import { Upload, Download } from 'lucide-react';

import { FieldSelect } from '../../sidebar/ui';
import HttpUrlInput from './HttpUrlInput';

import { HTTP_METHODS } from '../../../utils/http';

import { useHttpRequestEditor } from './requestEditor.shared';

import type { HttpMethod } from '../../../types';

import { exportSessionProfile, importSessionProfileFromFile } from '../../../services/sessionProfileService';

import { showToast } from '../../../store/toastStore';

import { useUnsavedGuard } from '../../../context/UnsavedGuardContext';



interface HttpUrlBarProps {

  sending: boolean;

  onSend: () => void;

  onConfigImported: () => void;

}



function HttpUrlBar({ sending, onSend, onConfigImported }: HttpUrlBarProps) {

  const { t } = useTranslation();

  const { requestGuardedAction } = useUnsavedGuard();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const {

    sessionId,

    httpMethod,

    displayUrl,

    handleUrlChange,

    markFieldEditPending,

    handleMethodChange,

  } = useHttpRequestEditor();



  const runExport = async () => {

    const result = await exportSessionProfile(sessionId);

    if (result.cancelled) {

      return;

    }

    if (result.ok) {

      showToast('success', t('toast.exportSuccess'));

    } else {

      showToast('error', t('toast.exportFailed'));

    }

  };



  const handleExport = () => {

    requestGuardedAction({ kind: 'export', sessionId }, runExport);

  };



  const handleImport = async (e: ChangeEvent<HTMLInputElement>) => {

    const file = e.target.files?.[0];

    if (!file) {

      return;

    }

    const result = await importSessionProfileFromFile(sessionId, file);

    e.target.value = '';

    if (result.ok) {

      onConfigImported();

      showToast('success', t('toast.importSuccess'));

      return;

    }

    showToast(
      'error',
      !result.ok && result.reason === 'protocolMismatch'
        ? t('toast.importProtocolMismatch')
        : t('toast.importFailed'),
    );

  };



  return (

    <Flex

      align="center"

      gap="3"

      px="4"

      py="3"

      flexShrink={0}

      borderBottomWidth="1px"

      borderColor="border"

    >

      <FieldSelect

        value={httpMethod}

        onChange={(v) => handleMethodChange(v as HttpMethod)}

        options={HTTP_METHODS.map((m) => ({ value: m, label: m }))}

        width="110px"

        minWidth="110px"

        fontSize="xs"

      />

      <Box flex="1" minW="0">
        <HttpUrlInput
          value={displayUrl}
          onChange={handleUrlChange}
          onLiveChange={markFieldEditPending}
          placeholder="https://api.example.com"
        />
      </Box>

      <Button

        flexShrink={0}

        size="md"

        onClick={onSend}

        disabled={sending || !displayUrl}

        bg="accent"

        color="accent.fg"

        _hover={{ bg: 'accent.emphasized' }}

        fontSize="sm"

        fontFamily="mono"

        fontWeight="normal"

      >

        <Flex align="center" gap="1">

          {t('send.sendBtn')}

          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">

            <line x1="22" y1="2" x2="11" y2="13" />

            <polygon points="22 2 15 22 11 13 2 9 22 2" />

          </svg>

        </Flex>

      </Button>

      <Flex align="center" gap="1" flexShrink={0}>

        <IconButton

          aria-label={t('http.importConfig')}

          title={t('http.importConfig')}

          size="sm"

          variant="ghost"

          colorPalette="blue"

          onClick={() => fileInputRef.current?.click()}

        >

          <Upload size={16} strokeWidth={2} />

        </IconButton>

        <IconButton

          aria-label={t('http.exportConfig')}

          title={t('http.exportConfig')}

          size="sm"

          variant="ghost"

          colorPalette="blue"

          onClick={handleExport}

        >

          <Download size={16} strokeWidth={2} />

        </IconButton>

        <input ref={fileInputRef} type="file" accept=".json" hidden onChange={(e) => void handleImport(e)} />

      </Flex>

    </Flex>

  );

}



export default memo(HttpUrlBar);

