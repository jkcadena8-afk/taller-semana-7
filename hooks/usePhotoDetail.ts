import { useCallback } from 'react';

import { useQuery } from '@/db/changes';
import { photosRepo, type PhotoPatch } from '@/db/repositories/photos';
import { deletePhotoFiles } from '@/services/photoFiles';

/** Lectura de UNA foto (se refresca tras cada escritura) + acciones de edicion. */
export function usePhotoDetail(id: number | null) {
  const { data } = useQuery(
    () => (id === null ? Promise.resolve(undefined) : photosRepo.findById(id)),
    undefined,
    [id],
  );
  const photo = id === null ? undefined : data;

  const update = useCallback(
    async (patch: PhotoPatch) => {
      if (id !== null) await photosRepo.update(id, patch);
    },
    [id],
  );

  const remove = useCallback(async () => {
    if (id === null) return;
    const current = await photosRepo.findById(id);
    await photosRepo.remove(id);
    if (current) await deletePhotoFiles([current.storagePath]);
  }, [id]);

  return { photo, update, remove };
}
