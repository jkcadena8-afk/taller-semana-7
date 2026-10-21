/**
 * Contratos de datos compartidos por toda la Semana 6 (GeoCam).
 *
 * Este archivo solo declara tipos: no logica, no imports de plataformas.
 */

/**
 * Estado normalizado de un permiso.
 *
 * Expo devuelve `PermissionResponse` con `status` ('granted' | 'denied' |
 * 'undetermined') y `canAskAgain`. Un permiso 'denied' con
 * `canAskAgain === false` ya no se puede volver a pedir desde la app, por lo
 * que la unica salida es Ajustes -> de ahi el estado 'blocked' propio.
 *
 * - 'checking'     la consulta inicial aun no resolvio (o el sensor no responde)
 * - 'undetermined' el usuario todavia no ha visto el dialogo del sistema
 * - 'granted'      concedido
 * - 'denied'       rechazado, pero se puede volver a pedir
 * - 'blocked'      rechazado de forma permanente -> `Linking.openSettings()`
 */
export type PermissionState =
  | 'checking'
  | 'undetermined'
  | 'granted'
  | 'denied'
  | 'blocked';

/**
 * Subconjunto de `expo-location.LocationObjectCoords` que conservamos.
 *
 * Se mantiene propio (y no el tipo nativo) para que el estado global de la app
 * no dependa del modulo de plataforma y para poder degradar `accuracy` a
 * `null` sin romper a los consumidores.
 */
export interface Coords {
  latitude: number;
  longitude: number;
  /** Radio de incertidumbre en metros. `null` cuando el sensor no lo reporta. */
  accuracy: number | null;
  /** Epoch en milisegundos. OJO: `expo-sensors` usa SEGUNDOS, `expo-location` milisegundos. */
  timestamp: number;
}

/** Origen de la imagen. */
export type GeoPhotoSource = 'camera' | 'gallery';

/**
 * Una foto registrada por GeoCam.
 *
 * `coords` es `null` a proposito: es el mecanismo de degradacion elegante.
 * Si el permiso de ubicacion no estaba concedido (o el fix fallo) la foto se
 * guarda igual y simply no aparece en el mapa.
 */
export interface GeoPhoto {
  id: string;
  uri: string;
  coords: Coords | null;
  source: GeoPhotoSource;
  /** Epoch en milisegundos, generado con `Date.now()`. */
  createdAt: number;
}

/**
 * `GeoPhoto` con la garantia de que `coords` NO es `null`.
 *
 * Existe para que los consumidores del mapa no tengan que escribir
 * `photo.coords?.latitude ?? 0`. Ese `?? 0` es peligroso: coloca el marker en
 * Null Island (0,0) en el golfo de Guinea en vez de fallar, asi que un bug de
 * datos se ve como "un pin raro en el mapa" en vez de como un error. Con este
 * tipo, `photo.coords.latitude` es `number` y el compilador se encarga.
 *
 * Se obtiene con el type guard `hasCoords` del provider, nunca con un `as`.
 */
export interface LocatedPhoto extends GeoPhoto {
  coords: Coords;
}

/** Type guard que estrecha `GeoPhoto` a `LocatedPhoto` sin `as` ni `!`. */
export function hasCoords(photo: GeoPhoto): photo is LocatedPhoto {
  return photo.coords !== null;
}

/** Payload de entrada para crear una foto, sin `id` ni `createdAt` (los genera el contexto). */
export type NewGeoPhoto = Omit<GeoPhoto, 'id' | 'createdAt'>;
