import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { useAlbums } from '@/hooks/useAlbums';
import { usePhotoDetail } from '@/hooks/usePhotoDetail';

export default function FotoScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const photoId = id ? Number(id) : null;

  const { photo, update, remove } = usePhotoDetail(photoId);
  const { albums } = useAlbums();
  // Borrador de la nota: null = el usuario aun no ha escrito, se muestra la nota guardada
  const [draft, setDraft] = useState<string | null>(null);

  if (!photo) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Foto no encontrada.</Text>
      </View>
    );
  }

  const note = draft ?? photo.note ?? '';

  const confirmDelete = () => {
    Alert.alert('Eliminar foto', 'Se borrara la foto y su archivo. No se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await remove();
          router.back();
        },
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image source={{ uri: photo.uri }} style={styles.image} resizeMode="cover" />

      <Text style={styles.muted}>
        {photo.createdAt.toLocaleString('es-CO')} ·{' '}
        {photo.latitude !== null && photo.longitude !== null
          ? `${photo.latitude.toFixed(5)}, ${photo.longitude.toFixed(5)}`
          : 'sin ubicacion'}
      </Text>

      <Text style={styles.label}>Nota</Text>
      <TextInput
        style={styles.input}
        multiline
        placeholder="Escribe una nota"
        placeholderTextColor="#64748b"
        value={note}
        onChangeText={setDraft}
        onBlur={() => void update({ note: note.trim() || null })}
      />

      <View style={styles.row}>
        <Text style={styles.label}>Favorita</Text>
        <Switch value={photo.favorite} onValueChange={(favorite) => void update({ favorite })} />
      </View>

      <Text style={styles.label}>Album</Text>
      <View style={styles.chips}>
        <Chip label="Sin album" active={photo.albumId === null} onPress={() => void update({ albumId: null })} />
        {albums.map((a) => (
          <Chip key={a.id} label={a.name} active={photo.albumId === a.id} onPress={() => void update({ albumId: a.id })} />
        ))}
      </View>

      <Pressable style={styles.delete} onPress={confirmDelete}>
        <Text style={styles.deleteText}>Eliminar foto</Text>
      </Pressable>
    </ScrollView>
  );
}

function Chip(props: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={props.onPress} style={[styles.chip, props.active && styles.chipActive]}>
      <Text style={[styles.chipText, props.active && styles.chipTextActive]}>{props.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, backgroundColor: '#0b1020' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0b1020' },
  image: { width: '100%', aspectRatio: 1, borderRadius: 12, backgroundColor: '#151b2e' },
  muted: { color: '#94a3b8' },
  label: { color: '#f8fafc', fontWeight: '700', fontSize: 16 },
  input: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#1f2a44',
    borderRadius: 10,
    padding: 12,
    color: '#f8fafc',
    backgroundColor: '#151b2e',
    textAlignVertical: 'top',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#38bdf8', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipActive: { backgroundColor: '#38bdf8' },
  chipText: { color: '#38bdf8' },
  chipTextActive: { color: '#04121f', fontWeight: '700' },
  delete: { marginTop: 8, padding: 14, borderRadius: 10, alignItems: 'center', backgroundColor: '#dc2626' },
  deleteText: { color: '#fff', fontWeight: '700' },
});
