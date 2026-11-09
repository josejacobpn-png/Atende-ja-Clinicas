import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { QueueProvider } from '@/context/QueueContext';
import ToastContainer from '@/components/ToastContainer';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Atende Já - Sistema de Gestão de Filas',
  description: 'Sistema moderno e integrado para gerenciamento e chamada de atendimento em tempo real na Unidade Básica de Saúde (UBS). Sem papel, eficiente e 100% digital.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300">
        <QueueProvider>
          <div className="min-h-screen flex flex-col">
            {children}
          </div>
          <ToastContainer />
        </QueueProvider>
      </body>
    </html>
  );
}
