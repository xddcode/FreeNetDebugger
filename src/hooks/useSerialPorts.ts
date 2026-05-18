import { useState, useCallback, useEffect } from 'react';
import { invoke } from '../utils/tauri';

export function useSerialPorts() {
  const [ports, setPorts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await invoke<string[]>('list_serial_ports');
      setPorts(result);
    } catch {
      setPorts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 3000);
    return () => clearInterval(timer);
  }, [refresh]);

  return { ports, loading, refresh };
}
