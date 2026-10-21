import { useQuery } from '@/db/changes';
import { photosRepo, type PhotoFilters } from '@/db/repositories/photos';
import type { Photo } from '@/db/schema';

const NO_PHOTOS: Photo[] = [];

/** Lista filtrada: se recalcula sola cuando cambian los filtros (C4). */
export function usePhotoList(filters: PhotoFilters) {
  const { data, error } = useQuery(() => photosRepo.list(filters), NO_PHOTOS, [
    filters.search,
    filters.albumId,
    filters.onlyFavorites,
  ]);
  return { photos: data, error };
}
