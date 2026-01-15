import type { Metadata } from 'next';
import '@kanak/ui/styles/globals.css';

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
