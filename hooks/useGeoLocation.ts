import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking } from 'react-native';

import { toPermissionState } from '@/lib/permissions';
import type { Coords, PermissionState } from '@/types/geo';

/**
 * Unica fuente de verdad de la ubicacion.
 *
 * Decisiones de diseno relevantes para el taller:
 *
 * 1. NUNCA se pide el permiso al montar. Al montar solo se CONSULTA con
 *    `getForegroundPermissionsAsync()`. Pedirlo aqui robaria el primer
 *    "no" al usuario sin contexto, que es la practica que iOS penaliza y que
 *    el propio enunciado de la semana prohibe. El dialogo del sistema solo
 *    aparece desde `requestPermission()`, invocado por un boton.
 *
 * 2. El seguimiento se abre SOLO con `permission === 'granted'`. Si el
 *    usuario revoca en Ajustes y vuelve a la app, el efecto se limpia solo.
 *
 * 3. `watchPositionAsync` es asincrono: devuelve una promesa con la
 *    suscripcion. Si el componente se desmonta antes de que resuelva, el
 *    `remove()` de la funcion de limpieza todavia no existe y la suscripcion
 *    se quedaria filtrada (el GPS seguiria despertando en segundo plano). Por
 *    eso se usa la bandera `cancelled`: es el patron obligatorio para cualquier
 *    suscripcion cuyo alta sea asincrona.
 */

/** Proyecta el objeto nativo de Expo a nuestro `Coords`. */
function toCoords(position: Location.LocationObject): Coords {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    // `accuracy` es `number | null` en nativo: se conserva el null en vez de
    // inventar un 0, para no mostrar una precision falsa.
    accuracy: position.coords.accuracy ?? null,
    timestamp: position.timestamp,
  };
}

const WATCH_OPTIONS: Location.LocationOptions = {
  // Balanced (~100 m) es suficiente para etiquetar una foto y consume mucho
  // menos que High/Highest, que mantienen el GPS encendido de forma continua.
  accuracy: Location.Accuracy.Balanced,
  // Freno de bateria: no emitimos evento si el usuario se ha movido menos de
  // 5 m. Sin esto el GPS se despierta en cada micro-vibracion de la mano.
  distanceInterval: 5,
  timeInterval: 5_000,
};

export interface UseGeoLocationResult {
  permission: PermissionState;
  /** GPS del sistema encendido. `null` mientras se consulta. Distinto del permiso de la app. */
  servicesEnabled: boolean | null;
  coords: Coords | null;
  /** `true` mientras se resuelve un fix puntual (`getCurrent`). */
  isLocating: boolean;
  error: string | null;
  requestPermission: () => Promise<void>;
  getCurrent: () => Promise<Coords | null>;
  openSettings: () => Promise<void>;
}

export interface UseGeoLocationOptions {
  /** `false` apaga el seguimiento (p. ej. cuando la pantalla pierde el foco). */
  watch?: boolean;
}

export function useGeoLocation({ watch = true }: UseGeoLocationOptions = {}): UseGeoLocationResult {
  const [permissionState, setPermissionState] = useState<PermissionState>('checking');
  const [servicesEnabled, setServicesEnabled] = useState<boolean | null>(null);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Espejo del estado para leerlo desde callbacks sin incluirlos en las
  // dependencias (y asi mantenerlas estables para los hijos).
  const permissionRef = useRef<PermissionState>('checking');
  permissionRef.current = permissionState;

  // --- 1. Consulta del permiso al montar (sin pedirlo) -----------------------
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await Location.getForegroundPermissionsAsync();
        // Sin esta guarda, un desmontaje rapido (o un remonte por StrictMode)
        // aplicaria el estado de una promesa ya olvidada.
        if (cancelled) return;
        setPermissionState(toPermissionState(response));
      } catch (e) {
        if (cancelled) return;
        setPermissionState('denied');
        setError(e instanceof Error ? e.message : 'No se pudo leer el permiso de ubicacion.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // --- 1b. Re-consulta permiso y GPS al volver a la app (el usuario pudo cambiarlos en Ajustes)
  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      try {
        const [response, enabled] = await Promise.all([
          Location.getForegroundPermissionsAsync(),
          Location.hasServicesEnabledAsync(),
        ]);
        if (cancelled) return;
        setPermissionState(toPermissionState(response));
        setServicesEnabled(enabled);
      } catch {
        if (!cancelled) setServicesEnabled(false);
      }
    };

    void refresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [watch]);

  // --- 2. Seguimiento continuo, condicionado a 'granted' --------------------
  useEffect(() => {
    if (permissionState !== 'granted' || servicesEnabled !== true || !watch) {
      // Sin permiso no hay suscripcion. Si lo habia, el cleanup del efecto
      // anterior ya la cerro al cambiar `permissionState`.
      return;
    }

    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;

    void Location.watchPositionAsync(WATCH_OPTIONS, (position) => {
      if (cancelled) return; // el evento llego tarde: ya no hay pantalla
      setCoords(toCoords(position));
    })
      .then((active) => {
        if (cancelled) {
          // CASO LIMITE: nos desmontaron entre el watchPositionAsync y su
          // .then. La suscripcion existe pero el cleanup ya corrio, asi que
          // hay que cerrarla aqui a mano o se pierde para siempre.
          active.remove();
          return;
        }
        subscription = active;
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Error en el seguimiento de ubicacion.');
      });

    return () => {
      // 1) Se marca la bandera: cualquier callback posterior se ignora.
      cancelled = true;
      // 2) Se cierra la suscripcion SOLO si llego a crearse.
      subscription?.remove();
      subscription = null;
    };
  }, [permissionState, servicesEnabled, watch]);

  // --- 3. Peticion explicita del permiso ------------------------------------
  const requestPermission = useCallback(async () => {
    setError(null);
    const response = await Location.requestForegroundPermissionsAsync();
    const next = toPermissionState(response);
    permissionRef.current = next;
    setPermissionState(next);

    if (next === 'denied' || next === 'blocked') {
      setError('Sin ubicacion las fotos se guardan sin coordenadas.');
    }
  }, []);

  // --- 4. Fix puntual a pedido ----------------------------------------------
  const getCurrent = useCallback(async (): Promise<Coords | null> => {
    if (permissionRef.current !== 'granted') return null;

    setIsLocating(true);
    try {
      const enabled = await Location.hasServicesEnabledAsync();
      setServicesEnabled(enabled);
      if (!enabled) return null; // GPS apagado: la foto se guarda sin coordenadas
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const next = toCoords(position);
      setCoords(next);
      return next;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo obtener la ubicacion.');
      // Degradacion elegante: null y la foto se guarda igual, sin coordenadas.
      return null;
    } finally {
      setIsLocating(false);
    }
  }, []);

  // --- 5. Escape cuando el permiso queda bloqueado --------------------------
  const openSettings = useCallback(async () => {
    try {
      await Linking.openSettings();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron abrir los ajustes.');
    }
  }, []);

  return {
    permission: permissionState,
    servicesEnabled,
    coords,
    isLocating,
    error,
    requestPermission,
    getCurrent,
    openSettings,
  };
}
