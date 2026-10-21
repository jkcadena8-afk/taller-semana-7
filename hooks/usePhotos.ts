import { useCallback, useMemo } from 'react';

import { useQuery } from '@/db/changes';
import { photosRepo } from '@/db/repositories/photos';
import type { Photo } from '@/db/schema';
import { deletePhotoFiles, uploadPhoto } from '@/services/photoFiles';
import type { Coords, GeoPhotoSource } from '@/types/geo';

/** Foto con coordenadas garantizadas (sin `?? 0`: ver `LocatedPhoto` en types/geo.ts). */
export type LocatedPhotoRow = Photo & { latitude: number; longitude: number };

export function hasLocation(photo: Photo): photo is LocatedPhotoRow {
  return photo.latitude !== null && photo.longitude !== null;
}

export interface AddPhotoInput {
  /** URI temporal (cache) de la camara o la galeria. */
  uri: string;
  coords: Coords | null;
  source: GeoPhotoSource;
}

export interface UsePhotosResult {
  photos: Photo[];
  photosWithLocation: LocatedPhotoRow[];
  error: Error | undefined;
  addPhoto: (input: AddPhotoInput) => Promise<void>;
  removePhoto: (id: number) => Promise<void>;
  clearAll: () => Promise<void>;
}

const NO_PHOTOS: Photo[] = [];

export function usePhotos(): UsePhotosResult {
  const { data: photos, error } = useQuery(() => photosRepo.list(), NO_PHOTOS);
  const { data: located } = useQuery(() => photosRepo.listWithLocation(), NO_PHOTOS);

  // El filtro SQL ya garantiza coordenadas; el type guard estrecha el tipo sin `as`
  const photosWithLocation = useMemo(() => located.filter(hasLocation), [located]);

  const addPhoto = useCallback(async ({ uri, coords, source }: AddPhotoInput) => {
    // 1) Imagen a Storage  2) Registro en Postgres con la URL publica
    const { storagePath, publicUrl } = await uploadPhoto(uri);
    try {
      await photosRepo.create({
        uri: publicUrl,
        storagePath,
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
        accuracy: coords?.accuracy ?? null,
        source,
      });
    } catch (e) {
      // Si falla el INSERT no se deja un archivo huerfano en el bucket
      await deletePhotoFiles([storagePath]);
      throw e;
    }
  }, []);

  const removePhoto = useCallback(async (id: number) => {
    const photo = await photosRepo.findById(id);
    await photosRepo.remove(id);
    if (photo) await deletePhotoFiles([photo.storagePath]);
  }, []);

  const clearAll = useCallback(async () => {
    const paths = await photosRepo.clearAll();
    await deletePhotoFiles(paths);
  }, []);

  return { photos, photosWithLocation, error, addPhoto, removePhoto, clearAll };
}
