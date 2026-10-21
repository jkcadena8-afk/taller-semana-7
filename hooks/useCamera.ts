import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import { useCallback, useRef, useState } from 'react';

import { toPermissionState } from '@/lib/permissions';
import type { PermissionState } from '@/types/geo';

/**
 * Envoltura de `expo-camera` para el SDK 57.
 *
 * La API obsoleta (`import { Camera }` + `<Camera>` + `Camera.requestCameraPermissionsAsync`)
 * ya no existe como componente: en el SDK actual solo se exporta `CameraView`
 * y el hook `useCameraPermissions`, que ademas devuelve TRES elementos
 * (`[estado, pedir, consultar]`), no dos.
 */

/** Calidad JPEG de la captura. 0.85 mantiene el detalle sin inflar la cache. */
const PICTURE_QUALITY = 0.85;

export interface UseCameraResult {
  /**
   * Ref de callback para `<CameraView ref={attachCameraRef} />`.
   *
   * Se expone un CALLBACK ref y no el objeto `useRef` por dos motivos:
   * 1. El objeto ref nunca sale del hook, asi que no puede leerse durante el
   *    render por accidente (es el patron que exige la regla `react-hooks/refs`).
   * 2. La identidad es estable para siempre: no provoca el remonte de
   *    `CameraView` ni reconstruye la sesion nativa en cada render.
   */
  attachCameraRef: (node: CameraView | null) => void;
  facing: CameraType;
  permission: PermissionState;
  /** `true` cuando el preview ya esta listo y se puede capturar. */
  isReady: boolean;
  /** `true` mientras hay una captura en vuelo: deshabilita el boton. */
  isCapturing: boolean;
  toggleFacing: () => void;
  onCameraReady: () => void;
  onMountError: (message: string) => void;
  requestPermission: () => Promise<void>;
  capture: () => Promise<string | null>;
}

export function useCamera(): UseCameraResult {
  // SDK 57: `useCameraPermissions` ya consulta el estado al montar, por lo que
  // no hace falta ningun efecto adicional para leer el permiso.
  const [response, requestCameraPermission] = useCameraPermissions();
  const permission = toPermissionState(response);

  const [facing, setFacing] = useState<CameraType>('back');
  const [isReady, setIsReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  // El ref nunca se lee en render: solo se escribe desde el callback ref y se
  // lee dentro de `capture`, que corre en un evento.
  const cameraRef = useRef<CameraView | null>(null);

  const attachCameraRef = useCallback((node: CameraView | null) => {
    cameraRef.current = node;
  }, []);

  /**
   * Espejo de `isCapturing`.
   *
   * El estado de React no basta para proteger el doble toque: dos pulsaciones
   * dentro del mismo frame se resuelven ANTES del re-render, asi que ambas
   * leerian `isCapturing === false`. Un ref se actualiza de forma sincrona y
   * solo la primera pulsacion pasa el guardia.
   */
  const capturingRef = useRef(false);

  const toggleFacing = useCallback(() => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
    // Al cambiar `facing` el nativo reconstruye la sesion de camara: el preview
    // vuelve a estar "no listo" hasta el proximo onCameraReady. Sin este reset
    // el boton de disparo permitiria capturar sobre una sesion invalida.
    setIsReady(false);
  }, []);

  const onCameraReady = useCallback(() => {
    setIsReady(true);
  }, []);

  const onMountError = useCallback((message: string) => {
    setIsReady(false);
    console.warn('[GeoCam] La camara no pudo montarse:', message);
  }, []);

  const requestPermission = useCallback(async () => {
    await requestCameraPermission();
  }, [requestCameraPermission]);

  const capture = useCallback(async (): Promise<string | null> => {
    const camera = cameraRef.current;

    // Guardia de doble toque: el ref se comprueba y se marca en el mismo
    // tick, sin esperar al re-render.
    if (camera === null || !isReady || capturingRef.current) {
      return null;
    }

    capturingRef.current = true;
    setIsCapturing(true);

    try {
      const picture = await camera.takePictureAsync({ quality: PICTURE_QUALITY });
      return picture?.uri ?? null;
    } catch (e) {
      console.warn('[GeoCam] Fallo al capturar:', e instanceof Error ? e.message : e);
      return null;
    } finally {
      // El `finally` corre siempre: si la captura falla o el componente se
      // desmonta a mitad, el boton no se queda bloqueado para siempre.
      capturingRef.current = false;
      setIsCapturing(false);
    }
  }, [isReady]);

  return {
    attachCameraRef,
    facing,
    permission,
    isReady,
    isCapturing,
    toggleFacing,
    onCameraReady,
    onMountError,
    requestPermission,
    capture,
  };
}
