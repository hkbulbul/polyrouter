import { JetBrains_Mono, Schibsted_Grotesk } from "next/font/google";
import "material-symbols/outlined.css";
import "./globals.css";
import { ThemeProvider } from "@/shared/components/ThemeProvider";
import GoogleAnalyticsProvider from "@/shared/components/GoogleAnalyticsProvider";
import PostHogProvider from "@/shared/components/PostHogProvider";
import DashboardAnalyticsProvider from "@/shared/components/DashboardAnalyticsProvider";
import "@/lib/network/initOutboundProxy"; // Auto-initialize outbound proxy env
import "@/shared/services/bootstrap"; // Auto-run initializeApp (watchdog, auto-resume tunnel)
import { initConsoleLogCapture } from "@/lib/consoleLogBuffer";
import { RuntimeI18nProvider } from "@/i18n/RuntimeI18nProvider";

// Hook console immediately at module load time (server-side only, runs once)
initConsoleLogCapture();

// Same type pairing as the landing site: grotesk for UI, mono for labels and code.
const schibstedGrotesk = Schibsted_Grotesk({
  subsets: ["latin"],
  variable: "--font-schibsted",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata = {
  title: "PolyRouter - AI Infrastructure Management",
  description: "One endpoint for all your AI providers. Manage keys, monitor usage, and scale effortlessly.",
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon-mark.png",
  },
};

export const viewport = {
  themeColor: "#0a0c0b",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${schibstedGrotesk.variable} ${jetbrainsMono.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `if(document.fonts&&document.fonts.ready){document.fonts.ready.then(function(){document.documentElement.classList.add('fonts-loaded')})}else{document.documentElement.classList.add('fonts-loaded')}`,
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <DashboardAnalyticsProvider>
          <GoogleAnalyticsProvider>
            <PostHogProvider>
              <ThemeProvider>
                <RuntimeI18nProvider>
                  {children}
                </RuntimeI18nProvider>
              </ThemeProvider>
            </PostHogProvider>
          </GoogleAnalyticsProvider>
        </DashboardAnalyticsProvider>
      </body>
    </html>
  );
}
