import { CameraView } from 'expo-camera';
import { useIsFocused } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { PermissionPrimer } from '@/components/PermissionPrimer';
import { useCamera } from '@/hooks/useCamera';
import { useGeoLocation } from '@/hooks/useGeoLocation';
import { usePhotos } from '@/hooks/usePhotos';
import { useShake } from '@/hooks/useShake';

export default function GeoCamScreen() {
  // Las suscripciones (GPS, acelerometro) solo viven mientras la pestana tiene el foco
  const isFocused = useIsFocused();

  const {
    attachCameraRef,
    facing,
    permission: cameraPermission,
    isReady,
    isCapturing,
    toggleFacing,
    onCameraReady,
    onMountError,
    requestPermission: requestCameraPermission,
    capture,
  } = useCamera();
  const geo = useGeoLocation({ watch: isFocused });
  const { addPhoto, clearAll, error: photosError } = usePhotos();
  const [message, setMessage] = useState<string | null>(null);

  const confirmClear = useCallback(() => {
    Alert.alert('Borrar todas las fotos', 'Agitaste el telefono. ¿Borrar todas las fotos guardadas?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar todo', style: 'destructive', onPress: () => void clearAll() },
    ]);
  }, [clearAll]);

  useShake({ onShake: confirmClear, enabled: isFocused && cameraPermission === 'granted' });

  const openCameraSettings = useCallback(() => {
    void Linking.openSettings();
  }, []);

  const save = useCallback(
    async (uri: string, source: 'camera' | 'gallery') => {
      // Si no hay permiso de ubicacion getCurrent() devuelve null y la foto se guarda sin coordenadas
      const coords = await geo.getCurrent();
      try {
        await addPhoto({ uri, coords, source });
        setMessage(coords ? 'Foto guardada con ubicacion.' : 'Foto guardada sin ubicacion.');
      } catch (e) {
        setMessage(e instanceof Error ? `No se pudo guardar: ${e.message}` : 'No se pudo guardar la foto.');
      }
    },
    [addPhoto, geo],
  );

  const takePhoto = useCallback(async () => {
    const uri = await capture();
    if (uri) await save(uri, 'camera');
  }, [capture, save]);

  const pickFromGallery = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (!result.canceled && result.assets[0]) {
      await save(result.assets[0].uri, 'gallery');
    }
  }, [save]);

  const locationBanner = (() => {
    switch (geo.permission) {
      case 'granted':
        if (geo.servicesEnabled === false) {
          return {
            text: 'El GPS del telefono esta apagado. Las fotos se guardan sin coordenadas.',
            action: { label: 'Abrir Ajustes', run: () => void geo.openSettings() },
          };
        }
        if (geo.servicesEnabled === null) return null;
        return { text: 'Ubicacion activa: las fotos se guardan con coordenadas.', action: null };
      case 'blocked':
        return {
          text: 'Ubicacion bloqueada. Las fotos se guardan sin coordenadas.',
          action: { label: 'Abrir Ajustes', run: () => void geo.openSettings() },
        };
      case 'denied':
        return {
          text: 'Ubicacion rechazada. Las fotos se guardan sin coordenadas.',
          action: { label: 'Permitir ubicacion', run: () => void geo.requestPermission() },
        };
      case 'undetermined':
        return {
          text: 'Activa la ubicacion para ver tus fotos en el mapa.',
          action: { label: 'Permitir ubicacion', run: () => void geo.requestPermission() },
        };
      default:
        return null;
    }
  })();

  return (
    <PermissionPrimer
      state={cameraPermission}
      featureName="acceso a la camara"
      purpose="La camara se usa para tomar las fotos que luego veras en el mapa."
      benefits={['Toma fotos dentro de la app', 'Las fotos se guardan en tu dispositivo']}
      onRequestPermission={() => void requestCameraPermission()}
      onOpenSettings={openCameraSettings}>
      <View style={styles.container}>
        {isFocused ? (
          <CameraView
            ref={attachCameraRef}
            style={styles.camera}
            facing={facing}
            onCameraReady={onCameraReady}
            onMountError={(e) => onMountError(e.message)}
          />
        ) : null}

        {locationBanner ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>{locationBanner.text}</Text>
            {locationBanner.action ? (
              <Pressable onPress={locationBanner.action.run} style={styles.bannerButton}>
                <Text style={styles.bannerButtonText}>{locationBanner.action.label}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {/* Los errores de los hooks llegan a la UI como estado */}
        {geo.error || photosError ? (
          <Text style={styles.errorText}>{geo.error ?? photosError?.message}</Text>
        ) : null}

        {message ? <Text style={styles.message}>{message}</Text> : null}

        <View style={styles.controls}>
          <Pressable onPress={() => void pickFromGallery()} style={styles.sideButton}>
            <Text style={styles.sideButtonText}>Galeria</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Tomar foto"
            disabled={!isReady || isCapturing || geo.isLocating}
            onPress={() => void takePhoto()}
            style={[styles.captureButton, (!isReady || isCapturing) && styles.disabled]}>
            <View style={styles.innerCircle} />
          </Pressable>
          <Pressable onPress={toggleFacing} style={styles.sideButton}>
            <Text style={styles.sideButtonText}>Voltear</Text>
          </Pressable>
        </View>
      </View>
    </PermissionPrimer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  banner: {
    position: 'absolute',
    top: 56,
    left: 16,
    right: 16,
    padding: 12,
    gap: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(11,16,32,0.85)',
  },
  bannerText: { color: '#e2e8f0', fontSize: 13 },
  bannerButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#38bdf8',
  },
  bannerButtonText: { color: '#04121f', fontWeight: '700', fontSize: 13 },
  errorText: {
    position: 'absolute',
    top: 150,
    left: 16,
    right: 16,
    color: '#fecaca',
    backgroundColor: 'rgba(127,29,29,0.85)',
    padding: 10,
    borderRadius: 10,
    overflow: 'hidden',
  },
  message: {
    position: 'absolute',
    bottom: 140,
    alignSelf: 'center',
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  sideButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sideButtonText: { color: '#fff', fontWeight: '600' },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabled: { opacity: 0.5 },
  innerCircle: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#fff' },
});
