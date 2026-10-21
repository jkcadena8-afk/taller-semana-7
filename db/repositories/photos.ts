import { notifyChange } from '@/db/changes';
import { toPhoto, type Photo, type PhotoRow } from '@/db/schema';
import { supabase } from '@/lib/supabase';

export interface PhotoInput {
  uri: string;
  storagePath: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  source: Photo['source'];
}

export type PhotoPatch = Partial<Pick<Photo, 'note' | 'favorite' | 'albumId'>>;

export interface PhotoFilters {
  search: string;
  /** `null` = todos los albumes */
  albumId: number | null;
  onlyFavorites: boolean;
}

/** Escapa los comodines de ILIKE para que el texto se busque literal. */
function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Unica capa que conoce Supabase: hooks y pantallas solo ven `Photo`. */
export const photosRepo = {
  async list(filters?: PhotoFilters): Promise<Photo[]> {
    let query = supabase.from('photos').select('*');
    if (filters) {
      const term = filters.search.trim();
      if (term) query = query.ilike('note', `%${escapeLike(term)}%`);
      if (filters.albumId !== null) query = query.eq('album_id', filters.albumId);
      if (filters.onlyFavorites) query = query.eq('favorite', true);
    }
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .returns<PhotoRow[]>();
    if (error) throw error;
    return data.map(toPhoto);
  },

  async listWithLocation(): Promise<Photo[]> {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .order('created_at', { ascending: false })
      .returns<PhotoRow[]>();
    if (error) throw error;
    return data.map(toPhoto);
  },

  async findById(id: number): Promise<Photo | undefined> {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('id', id)
      .maybeSingle<PhotoRow>();
    if (error) throw error;
    return data ? toPhoto(data) : undefined;
  },

  async create(input: PhotoInput): Promise<void> {
    const { error } = await supabase.from('photos').insert({
      uri: input.uri,
      storage_path: input.storagePath,
      latitude: input.latitude,
      longitude: input.longitude,
      accuracy: input.accuracy,
      source: input.source,
    });
    if (error) throw error;
    notifyChange();
  },

  async update(id: number, patch: PhotoPatch): Promise<void> {
    const row: Partial<PhotoRow> = {};
    if (patch.note !== undefined) row.note = patch.note;
    if (patch.favorite !== undefined) row.favorite = patch.favorite;
    if (patch.albumId !== undefined) row.album_id = patch.albumId;
    const { error } = await supabase.from('photos').update(row).eq('id', id);
    if (error) throw error;
    notifyChange();
  },

  async remove(id: number): Promise<void> {
    const { error } = await supabase.from('photos').delete().eq('id', id);
    if (error) throw error;
    notifyChange();
  },

  /** Borra todas las filas y devuelve las rutas de Storage que quedan huerfanas. */
  async clearAll(): Promise<string[]> {
    const { data, error } = await supabase
      .from('photos')
      .delete()
      .not('id', 'is', null)
      .select('storage_path')
      .returns<Pick<PhotoRow, 'storage_path'>[]>();
    if (error) throw error;
    notifyChange();
    return data.map((r) => r.storage_path);
  },
};
