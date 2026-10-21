import { useCallback } from 'react';

import { useQuery } from '@/db/changes';
import { albumsRepo } from '@/db/repositories/albums';
import type { Album } from '@/db/schema';

const NO_ALBUMS: Album[] = [];

export function useAlbums() {
  const { data: albums } = useQuery(() => albumsRepo.list(), NO_ALBUMS);

  const createAlbum = useCallback(async (name: string): Promise<string | null> => {
    const clean = name.trim();
    if (!clean) return 'Escribe un nombre para el album.';
    try {
      await albumsRepo.create(clean);
      return null;
    } catch (e) {
      // 23505 = unique_violation en Postgres
      if (typeof e === 'object' && e !== null && 'code' in e && e.code === '23505') {
        return 'Ya existe un album con ese nombre.';
      }
      return 'No se pudo crear el album. Revisa la conexion.';
    }
  }, []);

  const removeAlbum = useCallback((id: number) => albumsRepo.remove(id), []);

  return { albums, createAlbum, removeAlbum };
}
