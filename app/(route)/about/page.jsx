"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Github, Linkedin, Mail, WifiOff, CloudDownload, Smartphone, Zap, Code2 } from "lucide-react";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">About TuneFlow</h1>
        <p className="text-muted-foreground">
          Learn more about the application, its features, and the developer behind it.
        </p>
      </div>

      {/* Eye-catching Offline Support Banner */}
      <Card className="relative overflow-hidden border-primary/30 shadow-lg shadow-primary/5">
        {/* Animated gradient background for visual flair */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10 opacity-50 z-0"></div>
        <div className="absolute -top-12 -right-12 p-8 opacity-10 blur-2xl z-0 pointer-events-none">
           <WifiOff className="w-64 h-64 text-primary" />
        </div>

        <CardHeader className="relative z-10 pb-2">
          <div className="flex items-center gap-2 text-primary mb-2">
            <Zap className="w-5 h-5 fill-primary" />
            <span className="font-bold tracking-wider uppercase text-xs">Standout Feature</span>
          </div>
          <CardTitle className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
            Offline Music Superpowers
          </CardTitle>
          <p className="text-muted-foreground mt-2 max-w-2xl text-base">
            TuneFlow is designed to be fully progressive. It works seamlessly even when your internet connection drops, keeping your favorite tunes playing no matter where you are.
          </p>
        </CardHeader>
        
        <CardContent className="relative z-10 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
            <div className="flex flex-col gap-3 p-5 rounded-2xl bg-card/80 border border-border/50 backdrop-blur-md hover:border-primary/50 transition-colors shadow-sm">
              <div className="p-3 bg-primary/10 rounded-xl w-fit">
                <CloudDownload className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold text-lg">Listen Anywhere</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                As you discover and 'like' songs, they are automatically cached for offline playback. Take your music on a plane, subway, or road trip instantly.
              </p>
            </div>
            
            <div className="flex flex-col gap-3 p-5 rounded-2xl bg-card/80 border border-border/50 backdrop-blur-md hover:border-primary/50 transition-colors shadow-sm">
              <div className="p-3 bg-primary/10 rounded-xl w-fit">
                <WifiOff className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold text-lg">Seamless Transition</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The app intelligently switches to an offline mode the moment your network drops, providing a completely uninterrupted listening experience.
              </p>
            </div>

            <div className="flex flex-col gap-3 p-5 rounded-2xl bg-card/80 border border-border/50 backdrop-blur-md hover:border-primary/50 transition-colors shadow-sm">
              <div className="p-3 bg-primary/10 rounded-xl w-fit">
                <Smartphone className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold text-lg">Save Mobile Data</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your favorite tracks are stored locally on your device. Enjoy repeated listens of your top songs without consuming a single megabyte of mobile data.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Developer Info */}
        <Card className="flex flex-col h-full bg-card/40 backdrop-blur-sm border-white/10 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-xl text-primary flex items-center gap-2">
              <Code2 className="w-5 h-5" />
              About the Developer
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 flex-1">
            <div>
              <h2 className="text-2xl font-bold">Salim Khan</h2>
              <p className="text-sm text-primary font-medium tracking-wide uppercase mt-1">Full Stack Developer | BS Software Engineering</p>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed flex-1">
              Hi, I'm Salim Khan, a professional Full Stack Developer with expertise in building scalable, modern web applications. I am passionate about creating seamless user experiences and robust architectures. This music application is a testament to my skills in utilizing modern JavaScript frameworks, crafting responsive UI components, handling progressive web app features, and implementing intelligent offline capabilities.
            </p>
            <div className="flex items-center gap-3 pt-4 border-t border-border/50">
              <Link href="https://mail.google.com/mail/?view=cm&fs=1&to=salimkhandev@gmail.com" target="_blank" className="p-2.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-full transition-colors flex items-center gap-2">
                <Mail className="w-5 h-5" />
                <span className="text-sm font-medium pr-1">Email</span>
              </Link>
              <Link href="https://github.com/salimkhandev" target="_blank" className="p-2.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-full transition-colors flex items-center gap-2">
                <Github className="w-5 h-5" />
                <span className="text-sm font-medium pr-1">GitHub</span>
              </Link>
              <Link href="https://www.linkedin.com/in/salimkhandev" target="_blank" className="p-2.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-full transition-colors flex items-center gap-2">
                <Linkedin className="w-5 h-5" />
                <span className="text-sm font-medium pr-1">LinkedIn</span>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Tech Stack */}
        <Card className="flex flex-col h-full bg-card/40 backdrop-blur-sm border-white/10 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-xl text-primary flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Technology Stack
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 flex-1">
            <p className="text-sm text-muted-foreground leading-relaxed">
              TuneFlow is built using cutting-edge web technologies, designed for performance, aesthetics, and reliability:
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="font-semibold text-foreground">Next.js & React</div>
                <div className="text-xs text-muted-foreground">Server-side rendering and component architecture</div>
              </div>
              <div className="space-y-1">
                <div className="font-semibold text-foreground">Redux Toolkit</div>
                <div className="text-xs text-muted-foreground">Predictable state management & RTK Query caching</div>
              </div>
              <div className="space-y-1">
                <div className="font-semibold text-foreground">Tailwind CSS</div>
                <div className="text-xs text-muted-foreground">Utility-first styling for modern responsive aesthetics</div>
              </div>
              <div className="space-y-1">
                <div className="font-semibold text-foreground">PWA & IndexedDB</div>
                <div className="text-xs text-muted-foreground">Service workers and local storage for offline support</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
