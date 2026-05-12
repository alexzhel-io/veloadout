import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Veloadout — Bikepacking Gear Volume Calculator',
    short_name: 'Veloadout',
    description: 'Calculate the total volume of your bikepacking gear and get bag recommendations.',
    start_url: '/',
    display: 'standalone',
    background_color: '#13111c',
    theme_color: '#7c3aed',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
