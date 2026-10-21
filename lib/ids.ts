/**
 * Generador de ids para `GeoPhoto`.
 *
 * No se usa `Math.random()` ni un contador global: se combina el reloj con un
 * valor aleatorio porque dos capturas en el mismo milisegundo (doble toque o
 * agitacion) generarian ids identicos y el `removePhoto` borraria la foto
 * equivocada.
 */
export function createPhotoId(): string {
  return `geo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
