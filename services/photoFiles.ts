import { File } from 'expo-file-system';

import { PHOTOS_BUCKET, supabase } from '@/lib/supabase';

/**
 * Archivos de las fotos en Supabase Storage.
 *
 * `takePictureAsync` e `ImagePicker` devuelven URIs en la carpeta de CACHE.
 * Se leen como bytes con la API nueva de `expo-file-system` (File) y se suben
 * al bucket publico; la BD guarda la URL publica y la ruta dentro del bucket.
 */
export interface UploadedPhoto {
  storagePath: string;
  publicUrl: string;
}

export async function uploadPhoto(cacheUri: string): Promise<UploadedPhoto> {
  const bytes = await new File(cacheUri).arrayBuffer();
  const storagePath = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;

  const { error } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .upload(storagePath, bytes, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;

  const { data } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(storagePath);
  return { storagePath, publicUrl: data.publicUrl };
}

export async function deletePhotoFiles(storagePaths: string[]): Promise<void> {
  if (storagePaths.length === 0) return;
  const { error } = await supabase.storage.from(PHOTOS_BUCKET).remove(storagePaths);
  if (error) {
    // Borrar el archivo nunca debe impedir borrar el registro
    console.warn('[GeoCam] No se pudo borrar el archivo:', error.message);
  }
}
