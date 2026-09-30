import type { Metadata } from 'next';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/cinzel/500.css';
import './globals.css';
import './bond.css';
import './motion.css';
import './drafts.css';
import { TrainingProvider } from '@/components/store';
export const metadata: Metadata = {
  title: 'ATLAS — Strength, with purpose',
  description: 'Understand your body. Build your rhythm. A thoughtful strength-training companion.',
  icons: { icon: '/atlas-logo.png', apple: '/atlas-logo.png' },
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TrainingProvider>{children}</TrainingProvider>
      </body>
    </html>
  );
}
