"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  GalleryHorizontalEnd,
  Heart,
  Home,
  Info,
  ListMusic,
  Music,
  Users
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

const routes = [
  {
    label: "Home",
    icon: Home,
    href: "/",
  },
  {
    label: "Liked Songs",
    icon: Heart,
    href: "/liked-songs",
  },
  {
    label: "Songs",
    icon: Music,
    href: "/songs",
  },
  {
    label: "Artists",
    icon: Users,
    href: "/artists",
  },
  {
    label: "Albums",
    icon: GalleryHorizontalEnd,
    href: "/albums",
  },
  {
    label: "About Dev & App",
    icon: Info,
    href: "/about",
  }
];

export function Sidebar() {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  // Get network status from Redux store
  const isOnline = useSelector((state) => state.network.netAvail);

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Check if screen is mobile size
  useEffect(() => {
    if (!isClient) return;
    
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Initial check
    checkScreenSize();

    // Add event listener for resize
    window.addEventListener("resize", checkScreenSize);

    // Clean up
    return () => window.removeEventListener("resize", checkScreenSize);
  }, [isClient]);

  // Use only liked songs and about routes when offline, all routes when online
  const filteredRoutes = isOnline ? routes : [routes[1], routes[5]]; // routes[1] is liked songs, routes[5] is about

  return (
    <div className="flex  flex-col h-full bg-card w-full overflow-auto scrollbar-hidden">
      <div className="flex flex-row sm:flex-col gap-2 sm:p-4">
        {filteredRoutes.map((route) => (
          <Link key={route.href} href={route.href}>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 px-3",
                pathname === route.href && "bg-accent",
                isMobile && "px-2"
              )}
            >
              <route.icon className={cn("h-5 w-5", isMobile && "h-4 w-4")} />
              {route.label}
            </Button>
          </Link>
        ))}
      </div>
    </div>
  );
}
