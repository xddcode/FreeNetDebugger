import { Flex } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import ProtocolPicker from './ProtocolPicker';

export default function EmptyWorkspace() {
  const { t } = useTranslation();

  return (
    <Flex align="center" justify="center" height="full" width="full" p="8">
      <ProtocolPicker
        selectTitle={t('workspace.emptyTitle')}
        selectDescription={t('workspace.selectProtocolDesc')}
        iconSize="lg"
        maxGridWidth="480px"
      />
    </Flex>
  );
}
