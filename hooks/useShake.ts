import { Accelerometer, type AccelerometerMeasurement } from 'expo-sensors';
import { useEffect, useRef, useState } from 'react';

/**
 * Detecta la "sacudida" del dispositivo con el acelerometro.
 *
 * Por que se calcula la MAGNITUD y no un eje concreto: si listenamos solo `x`,
 * Depends del angulo con el que el usuario sostiene el telefono. La magnitud
 * `sqrt(x^2 + y^2 + z^2)` es invariante a la orientacion.
 *
 * En reposo la gravedad aporta ~1 g al eje que apunte hacia abajo, asi que la
 * magnitud en reposo ronda 1.0. Un umbral de 2.2 g descarta el temblor de la
 * mano al caminar y solo dispara con un gesto real.
 */

/** 100 ms = 10 muestras/s. Suficiente para detectar el pico de una sacudida
 *  sin dejar el sensor consuming bateria de forma continua (200 Hz seria
 *  10x mas caro y no aportaria nada aqui). */
const UPDATE_INTERVAL_MS = 100;

/** Umbral en g's. Por encima del ~1 g que aporta la gravedad en reposo. */
const DEFAULT_THRESHOLD = 2.2;

/** Ventana de bloqueo tras disparar: evita la ráfaga de eventos de un solo
 *  gesto continuo (el acelerometro emite 10 veces/segundo mientras sacudes). */
const DEFAULT_COOLDOWN_MS = 1_500;

/**
 * `expo-sensors` no reexporta el tipo de la suscripcion desde su indice, asi
 * que se deriva con `ReturnType` en vez de importar `expo-modules-core`
 * directamente (dependencia transitiva, no declarada en package.json).
 */
type AccelerometerSubscription = ReturnType<typeof Accelerometer.addListener>;

export interface UseShakeOptions {
  onShake: () => void;
  /** Permite dejar el sensor apagado (p. ej. mientras la camara no esta lista). */
  enabled?: boolean;
  threshold?: number;
  cooldownMs?: number;
}

export interface UseShakeResult {
  /** `null` mientras `isAvailableAsync()` no ha respondido. */
  isAvailable: boolean | null;
}

export function useShake({
  onShake,
  enabled = true,
  threshold = DEFAULT_THRESHOLD,
  cooldownMs = DEFAULT_COOLDOWN_MS,
}: UseShakeOptions): UseShakeResult {
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  /**
   * `onShake` vive en un ref para que el handler del sensor tenga una
   * identidad estable. Si dependiera del callback, cada re-render de la
   * pantalla desuscribiria y resuscribiria el acelerometro.
   */
  const onShakeRef = useRef(onShake);
  onShakeRef.current = onShake;

  const lastShakeAtRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setIsAvailable(null);
      return;
    }

    /**
     * Bandera local del efecto. `Accelerometer.addListener` es sincrono, pero
     * `isAvailableAsync()` NO lo es: sin esta bandera, un desmontaje durante
     * esa llamada acabaria suscribiendo el sensor a un componente ya muerto y
     * `subscription` seguiria siendo `null` en el cleanup, asi que la
     * suscripcion quedaria filtrada para siempre (bateria drain + crash en
     * produccion con Fast Refresh).
     */
    let cancelled = false;
    let subscription: AccelerometerSubscription | null = null;

    void (async () => {
      try {
        const available = await Accelerometer.isAvailableAsync();

        // El componente se desmontó mientras esperábamos la respuesta.
        if (cancelled) return;

        setIsAvailable(available);

        // Sin acelerometro (simulador, web sin HTTPS, sensor deshabilitado en
        // Ajustes) no hay error que gestionar: la app sigue funcionando.
        if (!available) return;

        Accelerometer.setUpdateInterval(UPDATE_INTERVAL_MS);

        subscription = Accelerometer.addListener(({ x, y, z }: AccelerometerMeasurement) => {
          const magnitude = Math.sqrt(x * x + y * y + z * z);
          if (magnitude < threshold) return;

          const now = Date.now();
          if (now - lastShakeAtRef.current < cooldownMs) return;
          lastShakeAtRef.current = now;

          onShakeRef.current();
        });
      } catch (e) {
        if (cancelled) return;
        setIsAvailable(false);
        console.warn('[GeoCam] Acelerometro no disponible:', e instanceof Error ? e.message : e);
      }
    })();

    return () => {
      // 1) Corta cualquier callback en vuelo.
      cancelled = true;
      // 2) Cierra la suscripcion si llego a crearse.
      subscription?.remove();
      subscription = null;
    };
  }, [enabled, threshold, cooldownMs]);

  return { isAvailable };
}
