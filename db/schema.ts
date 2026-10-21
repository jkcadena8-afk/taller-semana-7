/**
 * Tipos de dominio. La BD vive en Supabase (ver `supabase/schema.sql`);
 * aqui solo se describen las filas ya traducidas a camelCase.
 */

export interface Album {
  id: number;
  name: string;
  createdAt: Date;
}

export interface Photo {
  id: number;
  /** URL publica de la imagen en Supabase Storage. */
  uri: string;
  /** Ruta dentro del bucket; se usa para borrar el archivo. */
  storagePath: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  source: 'camera' | 'gallery';
  albumId: number | null;
  note: string | null;
  favorite: boolean;
  createdAt: Date;
}

/** Filas tal como las devuelve PostgREST (snake_case). */
export interface AlbumRow {
  id: number;
  name: string;
  created_at: string;
}

export interface PhotoRow {
  id: number;
  uri: string;
  storage_path: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  source: 'camera' | 'gallery';
  album_id: number | null;
  note: string | null;
  favorite: boolean;
  created_at: string;
}

export function toAlbum(row: AlbumRow): Album {
  return { id: row.id, name: row.name, createdAt: new Date(row.created_at) };
}

export function toPhoto(row: PhotoRow): Photo {
  return {
    id: row.id,
    uri: row.uri,
    storagePath: row.storage_path,
    latitude: row.latitude,
    longitude: row.longitude,
    accuracy: row.accuracy,
    source: row.source,
    albumId: row.album_id,
    note: row.note,
    favorite: row.favorite,
    createdAt: new Date(row.created_at),
  };
}
