import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { PermissionState } from '@/types/geo';

/**
 * Pantalla de explicacion previa al permiso.
 *
 * Es un componente, no una pantalla, precisamente para que cada pantalla
 * (camara, mapa) decida si la muestra a pantalla completa o como panel.
 *
 * Regla de copy: pedir un permiso sin explicar lo que se hace con el dato es la
 * Via rapida a que el usuario decline. Por eso el "que hacemos con el permiso"
 * va ANTES del boton, y el boton nunca se llama "Aceptar": se llama
 * "Permitir acceso", que describe la accion y no deceive.
 *
 * Cuando el permiso llega a 'blocked' el sistema ya no muestra otro dialogo:
 * el unico camino es Ajustes. El componente cambia de etiqueta y de handler
 * en lugar de dejar un boton que no hace nada.
 */

export interface PermissionPrimerProps {
  state: PermissionState;
  /** Que necesita la app. Ej: 'acceso a la camara'. */
  featureName: string;
  /** Que hara la app con el dato, en una frase. */
  purpose: string;
  /** Motivos de negocio, 2-3 maximo. */
  benefits?: string[];
  onRequestPermission: () => void;
  onOpenSettings: () => void;
  isRequesting?: boolean;
  /** Contenido a renderizar cuando el permiso ya esta concedido. */
  children?: React.ReactNode;
}

export function PermissionPrimer({
  state,
  featureName,
  purpose,
  benefits,
  onRequestPermission,
  onOpenSettings,
  isRequesting = false,
  children,
}: PermissionPrimerProps) {
  // Permiso concedido: la pantalla principal sustituye al primer.
  if (state === 'granted') {
    return <>{children}</>;
  }

  if (state === 'checking') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.checkingText}>Comprobando permisos...</Text>
      </View>
    );
  }

  const isBlocked = state === 'blocked';
  const bullets = benefits ?? [];
  const showBullets = bullets.length > 0 && state === 'undetermined';

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.badge}>Permiso necesario</Text>
        <Text style={styles.title}>GeoCam necesita {featureName}</Text>
        <Text style={styles.purpose}>{purpose}</Text>

        {showBullets ? (
          <View style={styles.list}>
            {bullets.map((benefit) => (
              <View key={benefit} style={styles.listItem}>
                <Text style={styles.bullet}>{'\u2022'}</Text>
                <Text style={styles.listText}>{benefit}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {isBlocked ? (
          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>Permiso bloqueado</Text>
            <Text style={styles.noticeText}>
              Ya rechazaste este permiso, asi que el sistema no volvera a mostrar el dialogo.
              Activalo en Ajustes {'\u2192'} GeoCam {'\u2192'} Permisos.
            </Text>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          disabled={isRequesting}
          onPress={isBlocked ? onOpenSettings : onRequestPermission}
          style={({ pressed }) => [
            styles.button,
            isBlocked && styles.buttonSecondary,
            pressed && styles.buttonPressed,
            isRequesting && styles.buttonDisabled,
          ]}>
          <Text style={styles.buttonText}>
            {isRequesting
              ? 'Solicitando...'
              : isBlocked
                ? 'Abrir Ajustes'
                : 'Permitir acceso'}
          </Text>
        </Pressable>

        {state === 'denied' ? (
          <Text style={styles.hint}>
            Sin este permiso la app sigue funcionando, pero las fotos se guardan sin
            coordenadas.
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#0b1020',
  },
  checkingText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#0b1020',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    padding: 24,
    gap: 12,
    backgroundColor: '#151b2e',
    borderWidth: 1,
    borderColor: '#1f2a44',
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: '#38bdf8',
    backgroundColor: '#0b2b40',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f8fafc',
  },
  purpose: {
    fontSize: 15,
    lineHeight: 22,
    color: '#cbd5f5',
  },
  list: {
    gap: 8,
    marginTop: 4,
  },
  listItem: {
    flexDirection: 'row',
    gap: 8,
  },
  bullet: {
    color: '#38bdf8',
    fontSize: 15,
    lineHeight: 22,
  },
  listText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    color: '#94a3b8',
  },
  notice: {
    borderRadius: 12,
    padding: 12,
    gap: 4,
    backgroundColor: '#2a1f10',
    borderWidth: 1,
    borderColor: '#4a3a1a',
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fbbf24',
  },
  noticeText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#e7d5b0',
  },
  button: {
    marginTop: 4,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#38bdf8',
  },
  buttonSecondary: {
    backgroundColor: '#f59e0b',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#04121f',
  },
  hint: {
    fontSize: 12,
    lineHeight: 18,
    color: '#64748b',
  },
});
