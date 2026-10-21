import type { PermissionResponse } from 'expo-modules-core';

import type { PermissionState } from '@/types/geo';

/**
 * Traduce el `PermissionResponse` de Expo a nuestro `PermissionState`.
 *
 * Se centraliza aqui porque `expo-camera`, `expo-location` y `expo-sensors`
 * devuelven la misma forma y la regla `denied + !canAskAgain => blocked` es
 * sutil: es el unico caso en el que volver a pedir el permiso no muestra
 * dialogo y el usuario debe ir a Ajustes del sistema.
 *
 * `null` (el hook todavia no resolvio la consulta) se traduce a 'checking'
 * para que la UI pueda distinguir "consultando" de "sin permiso".
 */
export function toPermissionState(response: PermissionResponse | null): PermissionState {
  if (response === null) {
    return 'checking';
  }
  if (response.granted) {
    return 'granted';
  }
  if (!response.canAskAgain) {
    return 'blocked';
  }
  // response.status es 'granted' | 'denied' | 'undetermined' y ya sabemos
  // que no es 'granted', asi que solo quedan 'denied' y 'undetermined'.
  return response.status === 'undetermined' ? 'undetermined' : 'denied';
}
