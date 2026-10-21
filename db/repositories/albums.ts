import { notifyChange } from '@/db/changes';
import { toAlbum, type Album, type AlbumRow } from '@/db/schema';
import { supabase } from '@/lib/supabase';

export const albumsRepo = {
  async list(): Promise<Album[]> {
    const { data, error } = await supabase
      .from('albums')
      .select('*')
      .order('name', { ascending: true })
      .returns<AlbumRow[]>();
    if (error) throw error;
    return data.map(toAlbum);
  },

  async create(name: string): Promise<void> {
    const { error } = await supabase.from('albums').insert({ name });
    if (error) throw error;
    notifyChange();
  },

  // Gracias a on delete set null sus fotos quedan sin album, no se borran
  async remove(id: number): Promise<void> {
    const { error } = await supabase.from('albums').delete().eq('id', id);
    if (error) throw error;
    notifyChange();
  },
};
