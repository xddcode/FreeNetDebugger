import { Dialog } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import AppDialog from '../ui/AppDialog';
import ProtocolPicker from './ProtocolPicker';

interface Props {
  open: boolean;
  /** Group to create the session in. `null` (default) drops it at workspace root. */
  parentGroupId?: string | null;
  onClose: () => void;
}

export default function ProtocolSelectorModal({ open, parentGroupId = null, onClose }: Props) {
  const { t } = useTranslation();

  return (
    <AppDialog open={open} onClose={onClose} size="lg" contentMaxW="600px" contentWidth="full">
      <Dialog.Body py="8" px="6">
        <ProtocolPicker
          selectTitle={t('workspace.selectProtocol')}
          selectDescription={t('workspace.selectProtocolDesc')}
          maxGridWidth="100%"
          showCancel
          parentGroupId={parentGroupId}
          onCancel={onClose}
          onCreated={onClose}
        />
      </Dialog.Body>
    </AppDialog>
  );
}
