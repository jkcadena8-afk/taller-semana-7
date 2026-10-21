import { Link } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import type { ComponentProps } from 'react';
import { Platform } from 'react-native';

export function ExternalLink({ href, ...rest }: Omit<ComponentProps<typeof Link>, 'href'> & { href: string }) {
  return (
    <Link
      target="_blank"
      {...rest}
      // `href` llega como `string` abierto (el componente acepta cualquier URL),
      // pero con `typedRoutes` activado `Link` solo admite las rutas declaradas
      // de la app mas `ExternalPathString`. El cast se hace aqui, en un unico
      // sitio, en vez de relajar el tipo de `Link`.
      href={href as ComponentProps<typeof Link>['href']}
      onPress={(e) => {
        if (Platform.OS !== 'web') {
          // Prevent the default behavior of linking to the default browser on native.
          e.preventDefault();
          // Open the link in an in-app browser.
          WebBrowser.openBrowserAsync(href);
        }
      }}
    />
  );
}
