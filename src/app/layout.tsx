import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'WACRM — CRM Omnichannel',
  description: 'Kelola percakapan pelanggan dan kanal bisnis dari satu ruang kerja.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="id"><body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f7f8fa', color: '#17202a' }}>{children}</body></html>;
}
