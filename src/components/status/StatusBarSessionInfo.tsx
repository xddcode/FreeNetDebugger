import { Text } from '@chakra-ui/react';
import HttpMethodTabBadge from '../layout/HttpMethodTabBadge';
import type { Session } from '../../types';
import { isHttpSession, isStreamSession } from '../../types';
import {
  formatStreamProtocolLabel,
  getHttpProtocolAddress,
  getStreamProtocolAddress,
} from '../../utils/protocolConfig';

interface Props {
  session: Session;
}

export default function StatusBarSessionInfo({ session }: Props) {
  if (isHttpSession(session)) {
    return (
      <>
        <HttpMethodTabBadge method={session.config.httpMethod ?? 'GET'} />
        <Text color="fg.muted" truncate maxW="480px" title={getHttpProtocolAddress(session.config)}>
          {getHttpProtocolAddress(session.config)}
        </Text>
      </>
    );
  }

  if (isStreamSession(session)) {
    const addr = session.remoteAddr || getStreamProtocolAddress(session.config);
    return (
      <>
        {addr && (
          <Text color="fg.muted" truncate maxW="320px" title={addr}>
            {addr}
          </Text>
        )}
        <Text color="fg.subtle">
          {formatStreamProtocolLabel(session.config.protocol)}
        </Text>
      </>
    );
  }

  return null;
}

export function statusBarShowsStatusLabel(session: Session | null): boolean {
  if (!session) {
    return false;
  }
  if (isHttpSession(session)) {
    return session.status === 'error';
  }
  return true;
}

export function statusBarShowsDuration(session: Session): boolean {
  if (!isStreamSession(session)) {
    return false;
  }
  return session.status === 'connected' || session.status === 'listening';
}

export function statusBarStatusKey(session: Session | null): string {
  if (!session || session.status === 'idle') {
    return 'ready';
  }
  if (isHttpSession(session) && session.status === 'connected') {
    return 'ready';
  }
  return session.status;
}
