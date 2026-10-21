import { useSyncExternalStore } from 'react';

/**
 * Devuelve `server` durante el render en servidor y `client` en el navegador.
 *
 * Implementado con `useSyncExternalStore` en lugar del clasico
 * `useState(server)` + `useEffect(() => setValue(client))`. El patron antiguo
 * provoca un render en cascada (primero el valor del servidor, luego el del
 * cliente) y la regla `react-hooks/set-state-in-effect` lo marca como error;
 * `useSyncExternalStore` recibe los snapshots ya distinguidos, asi que React
 * elige el correcto sin un segundo render.
 */

/** El valor nunca cambia en cliente, asi que no hay nada a lo que suscribirse. */
const subscribe = () => () => {};

export function useClientOnlyValue<S, C>(server: S, client: C): S | C {
  // El snapshot se tipa como `S | C` porque `useSyncExternalStore` exige que
  // los tres callbacks (subscribe/getSnapshot/getServerSnapshot) coincidan.
  return useSyncExternalStore<S | C>(
    subscribe,
    () => client, // snapshot en el cliente
    () => server, // snapshot durante SSR / build estatico
  );
}
