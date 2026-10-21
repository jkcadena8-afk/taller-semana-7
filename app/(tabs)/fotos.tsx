import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAlbums } from '@/hooks/useAlbums';
import { usePhotoList } from '@/hooks/usePhotoList';

export default function FotosScreen() {
  const [search, setSearch] = useState('');
  const [albumId, setAlbumId] = useState<number | null>(null);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [newAlbum, setNewAlbum] = useState('');
  const [albumError, setAlbumError] = useState<string | null>(null);

  const { photos } = usePhotoList({ search, albumId, onlyFavorites });
  const { albums, createAlbum, removeAlbum } = useAlbums();

  const addAlbum = async () => {
    const error = await createAlbum(newAlbum);
    setAlbumError(error);
    if (!error) setNewAlbum('');
  };

  const confirmRemoveAlbum = (id: number, name: string) => {
    Alert.alert('Eliminar album', `"${name}" se eliminara pero sus fotos se conservan.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          if (albumId === id) setAlbumId(null);
          void removeAlbum(id);
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Buscar en las notas"
        placeholderTextColor="#64748b"
        value={search}
        onChangeText={setSearch}
      />

      <View style={styles.chips}>
        <Chip label="Todas" active={albumId === null} onPress={() => setAlbumId(null)} />
        {albums.map((a) => (
          <Chip
            key={a.id}
            label={a.name}
            active={albumId === a.id}
            onPress={() => setAlbumId(a.id)}
            onLongPress={() => confirmRemoveAlbum(a.id, a.name)}
          />
        ))}
        <Chip label="★ Favoritas" active={onlyFavorites} onPress={() => setOnlyFavorites((v) => !v)} />
      </View>

      <View style={styles.newAlbumRow}>
        <TextInput
          style={[styles.search, styles.flex]}
          placeholder="Nuevo album"
          placeholderTextColor="#64748b"
          value={newAlbum}
          onChangeText={setNewAlbum}
        />
        <Pressable style={styles.addButton} onPress={() => void addAlbum()}>
          <Text style={styles.addButtonText}>Crear</Text>
        </Pressable>
      </View>
      {albumError ? <Text style={styles.error}>{albumError}</Text> : null}

      <FlatList
        data={photos}
        keyExtractor={(p) => String(p.id)}
        numColumns={3}
        contentContainerStyle={styles.grid}
        ListEmptyComponent={<Text style={styles.empty}>No hay fotos con esos filtros.</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={styles.cell}
            onPress={() => router.push({ pathname: '/foto/[id]', params: { id: String(item.id) } })}>
            <Image source={{ uri: item.uri }} style={styles.thumb} />
            {item.favorite ? <Text style={styles.star}>★</Text> : null}
          </Pressable>
        )}
      />
    </View>
  );
}

function Chip(props: { label: string; active: boolean; onPress: () => void; onLongPress?: () => void }) {
  return (
    <Pressable
      onPress={props.onPress}
      onLongPress={props.onLongPress}
      style={[styles.chip, props.active && styles.chipActive]}>
      <Text style={[styles.chipText, props.active && styles.chipTextActive]}>{props.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, gap: 8, backgroundColor: '#0b1020' },
  flex: { flex: 1 },
  search: {
    borderWidth: 1,
    borderColor: '#1f2a44',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f8fafc',
    backgroundColor: '#151b2e',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#38bdf8', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipActive: { backgroundColor: '#38bdf8' },
  chipText: { color: '#38bdf8' },
  chipTextActive: { color: '#04121f', fontWeight: '700' },
  newAlbumRow: { flexDirection: 'row', gap: 8 },
  addButton: { justifyContent: 'center', paddingHorizontal: 16, borderRadius: 10, backgroundColor: '#38bdf8' },
  addButtonText: { color: '#04121f', fontWeight: '700' },
  error: { color: '#f87171' },
  grid: { gap: 4 },
  empty: { textAlign: 'center', marginTop: 40, color: '#94a3b8' },
  cell: { flex: 1 / 3, aspectRatio: 1, padding: 2 },
  thumb: { flex: 1, borderRadius: 6, backgroundColor: '#151b2e' },
  star: { position: 'absolute', top: 6, right: 8, color: '#fbbf24', fontSize: 16 },
});
