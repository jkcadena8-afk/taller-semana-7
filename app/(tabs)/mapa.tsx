import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { usePhotos } from '@/hooks/usePhotos';

const CENTRO_POR_DEFECTO = { latitude: 11.5442, longitude: -72.9072 };

// Página con Leaflet + mosaicos de OpenStreetMap
const HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
    .badge {
      width: 52px; height: 52px; box-sizing: border-box;
      padding: 3px; background: #fff; border: 2px solid #007AFF;
      border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.35);
    }
    .badge img { width: 100%; height: 100%; object-fit: cover; border-radius: 6px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map').setView([${CENTRO_POR_DEFECTO.latitude}, ${CENTRO_POR_DEFECTO.longitude}], 15);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    var capa = L.layerGroup().addTo(map);

    // La app llama a esta función cada vez que cambian las fotos
    window.setPhotos = function (photos) {
      capa.clearLayers();
      photos.forEach(function (p) {
        var icono = L.divIcon({
          className: '',
          html: '<div class="badge"><img src="' + p.uri + '" /></div>',
          iconSize: [52, 52],
          iconAnchor: [26, 26]
        });
        L.marker([p.latitude, p.longitude], { icon: icono }).addTo(capa);
      });
      // photos[0] es la foto más reciente
      if (photos.length > 0) {
        map.setView([photos[0].latitude, photos[0].longitude], 17);
      }
    };
  </script>
</body>
</html>
`;

export default function MapaScreen() {
  const { photosWithLocation: photos } = usePhotos();
  const webViewRef = useRef<WebView>(null);
  const [listo, setListo] = useState(false);

  // Envía las fotos al mapa cuando carga y cada vez que cambian
  useEffect(() => {
    if (!listo) return;
    webViewRef.current?.injectJavaScript(
      `window.setPhotos(${JSON.stringify(
        photos.map((p) => ({ uri: p.uri, latitude: p.latitude, longitude: p.longitude })),
      )}); true;`
    );
  }, [photos, listo]);

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: HTML, baseUrl: 'https://localhost' }}
        style={styles.map}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess
        allowFileAccessFromFileURLs
        allowUniversalAccessFromFileURLs
        mixedContentMode="always"
        onLoadEnd={() => setListo(true)}
      />

      {photos.length === 0 && (
        <View style={styles.overlayInfo} pointerEvents="none">
          <Text style={styles.overlayText}>Aún no hay fotos con ubicación.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  overlayInfo: {
    position: 'absolute',
    top: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  overlayText: {
    color: '#ffffff',
    fontSize: 13,
  },
});