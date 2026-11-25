import type { MetadataRoute } from 'next';

// Lets people add NovaFides to their phone's home screen like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NovaFides Marketplace', short_name: 'NovaFides', description: 'Compare local pros. You choose who gets your request. Verified home pros in the Bay Area.',
    start_url: '/', scope: '/', display: 'standalone', background_color: '#0C0C0E', theme_color: '#0C0C0E', orientation: 'portrait',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Find a pro', url: '/search', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
      { name: 'Messages', url: '/messages', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
      { name: 'Orders', url: '/orders', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
    ],
  };
}
