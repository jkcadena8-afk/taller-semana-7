import { useCallback, useEffect, useState } from 'react';

/**
 * Sustituto de `useLiveQuery`.
 *
 * Supabase no avisa de los cambios hechos por esta misma app sin activar
 * Realtime, asi que cada escritura de los repositorios llama `notifyChange()`
 * y todas las consultas montadas se vuelven a ejecutar.
 */
type Listener = () => void;
const listeners = new Set<Listener>();

export function notifyChange(): void {
  listeners.forEach((listener) => listener());
}

export function useQuery<T>(fetcher: () => Promise<T>, initial: T, deps: readonly unknown[] = []) {
  const [data, setData] = useState<T>(initial);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [version, setVersion] = useState(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fetcher, deps);

  useEffect(() => {
    const listener = () => setVersion((v) => v + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    // Una respuesta tardia de unos filtros viejos no debe pisar la actual
    let cancelled = false;
    run().then(
      (result) => {
        if (cancelled) return;
        setData(result);
        setError(undefined);
      },
      (e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e : new Error(String(e)));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [run, version]);

  return { data, error };
}
