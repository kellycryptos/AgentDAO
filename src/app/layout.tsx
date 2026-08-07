import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://agent-dao-gilt.vercel.app"),
  title: "AgentDAO | AI Governance Assistant on GIWA Sepolia",
  description: "AI assistant for everyday communities to draft proposals, summarize discussions, and vote onchain on GIWA Sepolia testnet.",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-64.png", sizes: "64x64", type: "image/png" },
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "AgentDAO | AI Governance Assistant on GIWA Sepolia",
    description: "Turn natural language ideas into structured onchain proposals and votes on GIWA Sepolia testnet.",
    url: "https://agent-dao-gilt.vercel.app",
    siteName: "AgentDAO",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "AgentDAO - AI Governance on GIWA Sepolia",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AgentDAO | AI Governance Assistant on GIWA Sepolia",
    description: "Turn natural language ideas into structured onchain proposals and votes on GIWA Sepolia testnet.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('agentdao_theme') || localStorage.getItem('theme');
                  if (!theme) { theme = 'dark'; }
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

