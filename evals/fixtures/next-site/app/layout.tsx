import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Pebble — the habit app for kids', description: 'Tiny daily habits, big smiles.' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
