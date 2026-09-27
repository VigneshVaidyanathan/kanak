import { ConvexAuthNextjsServerProvider } from '@convex-dev/auth/nextjs/server';
import type { Metadata } from 'next';
import '@kanak/ui/styles/globals.css';
import { ConvexClientProvider } from '@/providers/convex-client-provider';

export const metadata: Metadata = {
  title: 'Kanak App',
  description: 'Expense Tracker Application',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="en">
        <body>
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
