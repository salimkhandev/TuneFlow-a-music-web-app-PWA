import { CustomThemeProvider } from "@/components/custom-theme-provider";
import Header from "@/components/header/Header";
// NavigationLoader removed for performance
import { NetworkDetector } from '@/components/NetworkDetector/NetworkDetector';
import Player from "@/components/player/Player";
import PWAInstallButton from "@/components/pwa-install/PWAInstallButton";
import PWAExitModal from "@/components/pwa-exit/PWAExitModal";
import ServiceWorker from "@/components/ServiceWorker";
import AppSessionProvider from "@/components/session-provider/SessionProvider";
import { Sidebar } from "@/components/sidebar/Sidebar";
import StoreProvider from "@/components/store-provider/StoreProvider";
import { ThemeProvider } from "@/components/theme-provider";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Tune Flow",
  description: "A responsive music application",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* PWA Meta Tags */}
        <link rel="manifest" href="/manifest" />
        <meta name="theme-color" content="#1a1a1a" />

        {/* Modern PWA Meta Tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="TuneFlow" />
        
        {/* Windows 11 PWA Meta Tags */}
        <meta name="msapplication-TileColor" content="#1a1a1a" />
        <meta name="msapplication-TileImage" content="/icons/AppImages/windows11/Square150x150Logo.scale-100.png" />
        <meta name="msapplication-config" content="/icons/AppImages/windows11/browserconfig.xml" />
        <meta name="msapplication-square70x70logo" content="/icons/AppImages/windows11/SmallTile.scale-100.png" />
        <meta name="msapplication-square150x150logo" content="/icons/AppImages/windows11/Square150x150Logo.scale-100.png" />
        <meta name="msapplication-wide310x150logo" content="/icons/AppImages/windows11/Wide310x150Logo.scale-100.png" />
        <meta name="msapplication-square310x310logo" content="/icons/AppImages/windows11/LargeTile.scale-100.png" />

        {/* Icons */}
        {/* iOS Icons */}
        <link rel="apple-touch-icon" href="/icons/AppImages/ios/180.png" />
        <link rel="apple-touch-icon" sizes="57x57" href="/icons/AppImages/ios/57.png" />
        <link rel="apple-touch-icon" sizes="60x60" href="/icons/AppImages/ios/60.png" />
        <link rel="apple-touch-icon" sizes="72x72" href="/icons/AppImages/ios/72.png" />
        <link rel="apple-touch-icon" sizes="76x76" href="/icons/AppImages/ios/76.png" />
        <link rel="apple-touch-icon" sizes="114x114" href="/icons/AppImages/ios/114.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/icons/AppImages/ios/120.png" />
        <link rel="apple-touch-icon" sizes="144x144" href="/icons/AppImages/ios/144.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/AppImages/ios/152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/AppImages/ios/180.png" />
        
        {/* iOS Safari Pinned Tab */}
        <link rel="mask-icon" href="/icons/AppImages/ios/180.png" color="#1a1a1a" />
        
        {/* Android Icons */}
        <link rel="icon" type="image/png" sizes="48x48" href="/icons/AppImages/android/android-launchericon-48-48.png" />
        <link rel="icon" type="image/png" sizes="72x72" href="/icons/AppImages/android/android-launchericon-72-72.png" />
        <link rel="icon" type="image/png" sizes="96x96" href="/icons/AppImages/android/android-launchericon-96-96.png" />
        <link rel="icon" type="image/png" sizes="144x144" href="/icons/AppImages/android/android-launchericon-144-144.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/AppImages/android/android-launchericon-192-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/AppImages/android/android-launchericon-512-512.png" />
        
        {/* Standard Favicons */}
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/AppImages/ios/16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/AppImages/ios/32.png" />
        <link rel="icon" href="/icons/favicon.ico" />
      
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <StoreProvider>
          <AppSessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <CustomThemeProvider defaultTheme="default">

              {/** NavigationLoader removed for performance **/}
              {/** RoutePrefetcher removed for performance testing **/}
              <NetworkDetector />
              <div className="flex flex-col h-dvh">
                <Header />
                <ResizablePanelGroup
                  direction="horizontal"
                  className="flex-1 border-y"
                >
                  <ResizablePanel 
                    defaultSize={20}
                    minSize={0}
                    maxSize={20}
                    className="hidden sm:block"
                  >
                    <Sidebar />
                  </ResizablePanel>
                  <ResizableHandle withHandle className="hidden sm:flex" />
                  <ResizablePanel defaultSize={80} minSize={0}>
                    <div className="h-full overflow-y-auto">
                      <div className="block sm:hidden">
                        <div className="w-full py-2 px-4 bg-card border-b">
                          <Sidebar />
                        </div>
                      </div>
                      {children}
                    </div>
                  </ResizablePanel>
                </ResizablePanelGroup>
                <Player />
              </div>
              <PWAInstallButton />
              <PWAExitModal />

            </CustomThemeProvider>
          </ThemeProvider>
          </AppSessionProvider>
        </StoreProvider>
        <ServiceWorker/>
      </body>
    </html>
  );
}
