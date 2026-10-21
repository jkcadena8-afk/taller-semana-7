# AI-LOG — Taller Integrador, Semana 6 (GeoCam)

Registro de la implementacion de la semana. Sirve para tres cosas:

1. **Trazabilidad**: que se le pidio a la IA y que se cambio a mano.
2. **Aprendizaje**: que APIs obsoletas aparecieron por inercia y como se detectaron.
3. **Auditoria**: donde hay codigo que puede fallar y por que se escribio asi.

> Regla de la casa: **una entrada por commit relevante**, no por archivo.
> Si no hay cambios respecto al commit anterior, no se agrega entrada.

---

## Convenciones

- **Fecha**: ISO 8601 corto (`2026-09-28`).
- **Estado**: `ACEPTADO` | `REVISADO` | `RECHAZADO` (cambios propuestos por el taller).
- **Alcance**: `SDK 57` (toda la semana se desarrollo sobre Expo SDK 57 / RN 0.86 / React 19.2).

---

## 1. Registro de prompts

> Prompt = instruccion tal cual se le dio al modelo, no un resumen. Se copia literal
> para poder reproducir la decision.

| # | Fecha | Prompt (resumen fiel) | Autor | Estado |
|---|-------|-----------------------|-------|--------|
| 001 | 2026-09-28 | Implementar Semana 6 (GeoCam) con las APIs actuales del SDK de Expo, limpieza estricta de suscripciones, sin `any`, con tipos de permiso explicitos. | Taller | ACEPTADO |
| 002 | 2026-09-28 | Verificar cada API contra la documentacion versionada del SDK antes de escribir codigo (no confiar en memoria del modelo). | AGENTS.md | ACEPTADO |

---

## 2. Verificacion de APIs antes de escribir codigo

Regla aplicada: antes de implementar, se consulto `https://docs.expo.dev/versions/v57.0.0/sdk/<modulo>`
para **cada** modulo tocado. Resultado de la verificacion:

| Modulo | Version instalada | API confirmada contra docs |
|--------|-------------------|-----------------------------|
| `expo-camera` | 57.0.5 | `CameraView`, `useCameraPermissions`, `onCameraReady`, `onMountError`, `takePictureAsync` |
| `expo-image-picker` | 57.0.20 | `launchImageLibraryAsync`, `mediaTypes: ['images']` |
| `expo-location` | 57.0.20 | `getForegroundPermissionsAsync`, `requestForegroundPermissionsAsync`, `watchPositionAsync`, `getCurrentPositionAsync`, `Accuracy.Balanced` |
| `expo-sensors` | 57.0.3 | `Accelerometer.addListener`, `setUpdateInterval`, `isAvailableAsync` |
| `react-native-maps` | 1.27.2 | `MapView`, `Marker`, `Region` |

Ademas se leyeron los `.d.ts` instalados (`node_modules/expo-camera/build/CameraView.d.ts`,
`expo-sensors/build/DeviceSensor.d.ts`) para confirmar las firmas exactas, en concreto:

- `CameraView` es una **clase** exportada, no una funcion: eso obliga a `useRef<CameraView | null>(null)`
  para poder llamar a `takePictureAsync` imperativamente.
- `Accelerometer.addListener` devuelve `EventSubscription`; `expo-sensors` **no** reexporta ese
  tipo desde su indice, asi que se derivo con `ReturnType<typeof Accelerometer.addListener>`
  en vez de importar de `expo-modules-core` (dependencia transitiva, no declarada).

---

## 3. Alucinaciones y APIs obsoletas detectadas

Estos son los puntos donde la inercia del modelo proponia codigo de una version
anterior de Expo. Se listan porque son los errores mas probables al repetir la semana.

### 3.1 `expo-camera`: componente `Camera`

- **Inercia tipica**: `import { Camera } from 'expo-camera'` + `<Camera type={CameraType.back}>` +
  `Camera.requestCameraPermissionsAsync()`.
- **Realidad SDK 57**: el componente `Camera` ya no existe. Solo se exporta `CameraView`.
  El objeto `Camera` que sigue exportandose es **un namespace con helpers de permisos**
  (`Camera.getCameraPermissionsAsync`, `Camera.scanFromURLAsync`...), no un componente.
- **Como se detecto**: la guia oficial ya no lo documenta; ademas `index.d.ts` del paquete
  exporta `CameraView` como clase y `Camera` con `/** @hidden *\/`.
- **Decision**: `useCameraPermissions()` + `<CameraView ref={...} />`.

### 3.2 `expo-camera`: aridad de `useCameraPermissions`

- **Inercia tipica**: tratar el hook como `const [perm, request] = useCameraPermissions()`
  (2 elementos), igual que en SDK <= 49.
- **Realidad SDK 57**: devuelve una tupla de **3** elementos
  `[estado, pedir, consultar]`. Tomar el segundo elemento sigue funcionando, pero
  Y para el "consultar" (3.o) hace falta la tupla completa.
- **Decision**: se tomo el elemento `[0]` (estado) y `[1]` (pedir), y se documento la aridad.

### 3.3 `expo-image-picker`: `MediaTypeOptions`

- **Inercia tipica**: `mediaTypes: ImagePicker.MediaTypeOptions.Images`.
- **Realidad SDK 57**: la opcion acepta un **array** de `MediaType`:
  `mediaTypes: ['images']` (valores `'images' | 'videos' | 'livePhotos'`).
  El enum `MediaTypeOptions` sigue exportandose pero la propia guia lo marca como
  via heredada.
- **Decision**: `mediaTypes: ['images']`.

### 3.4 Permisos de ubicacion

- **Inercia tipica**: `import * as Permissions from 'expo-permissions'` +
  `Permissions.requestAsync(Permissions.PERMISSIONS.IOS.LOCATION_WHEN_IN_USE)`.
- **Realidad SDK 57**: `expo-permissions` esta obsoleto para este caso. `expo-location`
  expone sus propios permisos: `Location.getForegroundPermissionsAsync()` (consultar)
  y `Location.requestForegroundPermissionsAsync()` (pedir).
- **Decision**: nada de `expo-permissions` en todo el proyecto.

### 3.5 `StyleSheet.absoluteFillObject` (no es de Expo, pero broke el build)

- **Inercia tipica**: `...StyleSheet.absoluteFillObject` dentro de un `StyleSheet.create`.
- **Realidad RN 0.86**: `absoluteFillObject` **ya no existe** en los tipos; solo queda
  `absoluteFill` (un objeto plano, no un estilo registrado, asi que no se puede expandir).
- **Como se detecto**: fallo de `tsc` con `TS2551: Property 'absoluteFillObject' does not exist`.
- **Decision**: se escribieron `position/top/left/right/bottom` a mano en los dos estilos afectados.

### 3.6 Mapas: `expo-maps` vs `react-native-maps`

- **Inercia / recomendacion de la guia**: la guia de Expo senala `expo-maps` como
  alternativa propia a `react-native-maps`.
- **Realidad SDK 57**: `expo-maps` esta en **alpha**, **no funciona en Expo Go** (requiere
  development build) y **no expone componentes `MapView` / `Marker`**: su API es
  `AppleMaps.View` / `GoogleMaps.View` con un array `markers` en props.
- **Decision**: `react-native-maps`. Motivos: (a) el enunciado de la semana pide componentes
  `MapView` y `Marker`; (b) funciona en Expo Go, que es como se prueba en clase;
  (c) no esta en alpha.
- **Pendiente para el taller**: si en la semana 7 se decide adoptar `expo-maps`, el cambio
  es local a `app/(tabs)/mapa.tsx` + development build + API key de Google Maps en
  `android.config.googleMaps.apiKey`.

### 3.7 `newArchEnabled` en `app.json`

- **Inercia tipica**: añadir `"newArchEnabled": true` al bloque `expo` "para activar la
  New Architecture", como se hacia en SDK 51-53.
- **Realidad SDK 57**: la propiedad **ya no existe**. En el SDK 57 la New Architecture es
  la unica opcion (se elimino la possibility de hacer opt-out), asi que no hay nada que
  activar.
- **Como se detecto**: `npx expo-doctor` fallo con
  `should NOT have additional property 'newArchEnabled'` al validar el schema de `app.json`.
- **Decision**: quitar la propiedad. Este taller ya corre sobre New Architecture por
  defecto, sin ningun flag.

### 3.8 Otros verificados y descartados

| API | Hallazgo |
|--------------|
| `Accelerometer.removeAllListeners()` | Sigue existiendo pero la guia la marca **deprecada**: se usa `subscription.remove()`. |
| `HIGH_SAMPLING_RATE_SENSORS` en `app.json` | Solo hace falta para >200 Hz. `useShake` va a 100 ms (=10 Hz), asi que se **elimino** del manifiesto para no pedir un permiso de alta frecuencia que la app no usa. |
| `NSMotionUsageDescription` | `expo-sensors` en iOS no lo pide para el acelerometro; se dejo el mensaje por el config plugin del paquete pero sin requesting en runtime. |

---

## 4. Modificaciones sobre la generacion original

| # | Fichero | Cambio | Motivo |
|---|---------|--------|--------|
| 001 | `app/(tabs)/geocam.tsx` | Reescrito a mano tras la primera generacion | La primera version tenia un tipo roto en `showToast` (`tone: Toast extends null ? never : ...`) y dos controles de camara mal alineados. |
| 002 | `context/GeoPhotosContext.tsx` | `addPhoto` genera `id`/`createdAt`; el reducer **no** los vuelve a generar | La primera version generaba el id **dos veces** (reducer + callback), asi que el id devuelto por `addPhoto` no era el que se guardaba en el estado y `removePhoto` no borraba la foto. |
| 003 | `hooks/useCamera.ts` | Guardia de doble toque con **ref** (`capturingRef`) en lugar de solo estado | Dos pulsaciones en el mismo frame se resuelven antes del re-render: con solo `isCapturing` las dos pasan el guardia y se toman dos fotos. |
| 004 | `app/(tabs)/geocam.tsx` + `mapa.tsx` | `absoluteFillObject` -> `position/top/left/right/bottom` | Rompia `tsc` en RN 0.86 (ver 3.5). |
| 005 | `app/(tabs)/_layout.tsx` | Pestanas `Tab One` / `Tab Two` del scaffold sustituidas por `GeoCam` / `Mapa`; `headerShown: false` en la camara | El preview de camara ocupa toda la pantalla. |
| 006 | `app/(tabs)/index.tsx`, `two.tsx`, `app/modal.tsx` | **Eliminados** | Pantallas de demo del scaffold; aparecian como pestanas extra y `modal` ya no tenia ninguna referencia. |
| 007 | `app/_layout.tsx` | `<GeoPhotosProvider>` envuelve al `Stack` completo | Si el provider viviera dentro de una pantalla, las fotos se perderian al cambiar de pestana. |
| 008 | `app.json` | `name`/`slug`/`scheme` -> GeoCam; plugins de camara, galeria, ubicacion y sensores; se **quito** `HIGH_SAMPLING_RATE_SENSORS` | Ver 3.8. |
| 009 | `hooks/useGeoLocation.ts` | `requestPermission` marca tambien `error` cuando no se concede | La primera version solo actualizaba el estado; el usuario no veia el motivo de que las fotos salieran sin coordenadas. |
| 010 | `app.json` | `newArchEnabled` **eliminado** | La propiedad ya no existe en el schema del SDK 57 (ver 3.7); `expo-doctor` lo detecto. |

---

## 5. Decisiones de arquitectura (y por que)

### 5.1 Limpieza de suscripciones: la bandera `cancelled`

`Location.watchPositionAsync` **y** `Accelerometer.isAvailableAsync()` son asincronas.
Si el componente se desmonta antes de que resuelvan, en la funcion de limpieza de
`useEffect` la suscripcion **todavia no existe** (`subscription === null`), asi que
`subscription.remove()` no hace nada y la suscucion **se queda filtrada**: el GPS o el
acelerometro siguen despertando en segundo plano.

Patron aplicado en los tres sitios:

```ts
let cancelled = false;
let subscription: S | null = null;

void iniciar().then((s) => {
  if (cancelled) {   // <-- nos desmontaron antes de resolver
    s.remove();      //     cleanup manual: sin esto se pierde para siempre
    return;
  }
  subscription = s;
});

return () => {
  cancelled = true;        // 1) cortar callbacks en vuelo
  subscription?.remove();  // 2) cerrar solo si llego a crearse
  subscription = null;
};
```

En `Accelerometer` el caso limite es el inverso: `addListener` es **sincrono**, pero
`isAvailableAsync()` no. Por eso la bandera se comprueba **despues** del `await`, justo
antes de suscribir.

### 5.2 Degradacion elegante

Regla: **el permiso de camara es bloqueante, el de ubicacion no.**

| Camara | Ubicacion | Resultado |
|--------|-----------|-----------|
| SI | SI | `GeoPhoto` con `coords` |
| SI | NO | `GeoPhoto` con `coords: null`, se muestra en la seccion "Sin ubicacion" del mapa |
| NO | - | `PermissionPrimer` bloquea la pantalla (no hay app sin camara) |

`getCurrent()` devuelve `null` en lugar de lanzar cuando no hay permiso o cuando el GPS
falla, de modo que la pantalla nunca tiene que decidir "descartar la foto". El
`catch` del GPS devuelve `null`, no propaga.

### 5.3 `coords: null` es un estado de primera clase

`GeoPhoto.coords` es `Coords | null`, no `Coords` con un valor centinela. El mapa
deriva dos listas en el provider (`photosWithCoords` / `photosWithoutCoords`) y la
seccion de "sin ubicacion" es una UI de primer nivel, no un `if` defensivo escondido.

### 5.4 `useReducer` en lugar de `useState` para la lista

`setPhotos([...photos, foto])` captura el array del render en curso. Con tres sitios
escritores (camara, galeria, mapa) eso es una fuente clasica de escritura perdida.
El reducer serializa todas las transiciones y hace imposible el bug por construccion.

---

## 6. Deuda tecnica conocida

- [ ] **Persistencia**: las fotos viven en memoria. Un reinicio de la app las borra.
      Semana 7 candidata: `expo-sqlite` o `AsyncStorage` + `expo-file-system` para copiar
      las imagenes de la cache a un directorio permanente (la `uri` que devuelve
      `takePictureAsync` es **temporal**).
- [ ] **Location EXIF**: las fotos importadas se etiquetan con la ubicacion actual,
      no con el EXIF del archivo. Leerlo requiere `exif` permissions en iOS.
- [ ] **`react-native-maps` en web**: no hay soporte; `mapa.tsx` muestra un mensaje
      de fallback en `Platform.OS === 'web'`.
- [ ] **API key de Google Maps**: necesaria para build nativo en Android
      (`android.config.googleMaps.apiKey` en `app.json` + SHA-1 del keystore).
      En Expo Go funciona sin ella.
- [ ] **Shake en iOS**: `Accelerometer` no esta en el simulador de iOS. Solo en
      dispositivo fisico.

---

## 7. Como reproducir la verificacion

```bash
# 1. Versions exactas del SDK en uso
npm ls expo expo-camera expo-image-picker expo-location expo-sensors react-native-maps --depth=0

# 2. Tipos
npx tsc --noEmit

# 3. Diagnostico de dependencias y config
npx expo-doctor

# 4. Documentacion consultada (append .md para Markdown plano)
#    https://docs.expo.dev/versions/v57.0.0/sdk/camera.md
#    https://docs.expo.dev/versions/v57.0.0/sdk/location.md
#    https://docs.expo.dev/versions/v57.0.0/sdk/imagepicker.md
#    https://docs.expo.dev/versions/v57.0.0/sdk/accelerometer.md
#    https://docs.expo.dev/versions/v57.0.0/sdk/sensors.md
#    https://docs.expo.dev/versions/v57.0.0/sdk/map-view.md
#    https://docs.expo.dev/versions/v57.0.0/sdk/maps.md
```

> Nota: las URLs de docs **deben** incluir el segmento de version (`v57.0.0`).
> Sin el, se sirve la documentacion `latest` y las APIs pueden no coincidir con
> el SDK instalado.

---

# Semana 7 — GeoCam persistente (SQLite + Drizzle)

## 1. Prompts utilizados

- "Reemplaza el GeoPhotosContext en memoria por SQLite con Drizzle; agrega álbumes (FK opcional, `set null`), segunda migración (`note`, `favorite`), CRUD, filtros y archivos permanentes."

## 2. Código generado vs. modificado

- **Generado:** esquema, repositorios (`photos`, `albums`), hooks, pantallas `fotos` y `foto/[id]`, `services/photoFiles.ts`.
- **Modificado / decidido a mano:**
  - Dos migraciones separadas con `drizzle-kit generate` (`inicial`, `nota_favorito`), ninguna editada a mano; se probaron sobre SQLite real: la foto previa se conserva y al borrar un álbum la foto queda con `album_id = NULL`.
  - `useShake` no llama `clearAll` directamente: pide confirmación antes (un gesto accidental no debe borrar todo).
  - `useGeoLocation` recibe `{ watch }` para apagar el GPS cuando la pestaña pierde el foco.
  - La consulta de una sola foto vive en el repositorio (`byIdQuery`) para que ningún hook ni pantalla importe Drizzle directamente.

## 3. Alucinaciones o errores detectados

- `react-hooks/refs`: el linter rechazó usar el objeto devuelto por `useCamera()` en el render; se desestructuró el resultado.
- `react-hooks/set-state-in-effect`: copiar la nota a un estado dentro de `useEffect` se reemplazó por un borrador (`draft ?? photo.note`).
- Verificado contra los `.d.ts` instalados: `File`, `Directory`, `Paths` de `expo-file-system` (API nueva, sin `copyAsync`) y `openDatabaseSync` con `enableChangeListener`.

---

# Migracion a Supabase (2026-10-20)

## 1. Prompts utilizados

- "necesito conectar este proyecto a supabase" (OpenCode). Decisiones del usuario: migracion completa a Supabase, proyecto ya creado, imagenes en Supabase Storage, acceso anonimo (sin login).
- OpenCode se quedo sin respuesta tras las preguntas; la implementacion la termino Claude Code con esas mismas decisiones.

## 2. Codigo generado vs. modificado

- **Generado:** `supabase/schema.sql` (tablas, RLS anonima, bucket `photos`), `lib/supabase.ts`, `db/changes.ts` (`useQuery` + `notifyChange`, sustituto de `useLiveQuery`), repositorios y hooks reescritos sobre `@supabase/supabase-js`, `services/photoFiles.ts` (subida a Storage).
- **Se mantuvo:** la API publica de hooks (`usePhotos`, `usePhotoList`, `usePhotoDetail`, `useAlbums`) para que las pantallas no cambien.
- **Eliminado:** `db/client.ts` y las migraciones en `app/_layout.tsx`. La carpeta `drizzle/` queda solo como historial de la semana 7.

## 3. Verificado contra docs

- Cliente segun la guia oficial de Expo (`docs.expo.dev/guides/using-supabase`): `expo-sqlite/localStorage/install`, `detectSessionInUrl: false`, variables `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. No hace falta `react-native-url-polyfill`.
- Subida con `File(...).arrayBuffer()` de `expo-file-system` + `storage.upload(path, ArrayBuffer, { contentType })`.
- Duplicado de album: Postgres devuelve `code === '23505'` (unique_violation).
