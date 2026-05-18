import type { Session } from '../../types';
import NetworkPanel from './NetworkPanel';
import ReceivePanel from './ReceivePanel';
import SendSettingsPanel from './SendSettingsPanel';
import HttpPanel from './HttpPanel';

interface Props {
  session: Session;
}

export default function ConnectionPanel({ session }: Props) {
  return (
    <>
      <NetworkPanel session={session} />
      {session.config.protocol === 'HTTP' && <HttpPanel session={session} />}
      <ReceivePanel session={session} />
      <SendSettingsPanel session={session} />
    </>
  );
}
