import type { Session } from '../../types';
import NetworkPanel from './NetworkPanel';
import ReceivePanel from './ReceivePanel';
import SendSettingsPanel from './SendSettingsPanel';

interface Props {
  session: Session;
}

export default function ConnectionPanel({ session }: Props) {
  return (
    <>
      <NetworkPanel session={session} />
      <ReceivePanel session={session} />
      <SendSettingsPanel session={session} />
    </>
  );
}
