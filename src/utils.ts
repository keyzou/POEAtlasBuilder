import { releaseProxy, wrap } from 'comlink';
import { useEffect, useMemo } from 'react';

function makeWorkerApiAndCleanup() {
  const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  const workerApi = wrap<import('./worker').TreeWorker>(worker);
  const cleanup = () => {
    workerApi[releaseProxy]();
    worker.terminate();
  };

  const workerApiAndCleanup = { workerApi, cleanup };
  return workerApiAndCleanup;
}

export function useWorker() {
  const workerApiAndCleanup = useMemo(() => makeWorkerApiAndCleanup(), []);

  useEffect(() => {
    const { cleanup } = workerApiAndCleanup;

    return () => {
      cleanup();
    };
  }, [workerApiAndCleanup]);
  return workerApiAndCleanup;
}

export default { useWorker };
