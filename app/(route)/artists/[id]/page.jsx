"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { fetchArtistById, formatNumber, getInitials } from "@/lib/utils";
import { useParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";
import { SongList } from "@/components/song-list/SongList";
import AlbumsList from "@/components/albums-list/AlbumsList";

const page = () => {
  const { id } = useParams();
  const [artist, setArtist] = useState(null);
  const [isLoadingArtist, setIsLoadingArtist] = useState();

  const handleFetchPlaylist = async () => {
    setIsLoadingArtist(true);
    const newPlaylist = await fetchArtistById({ id });

    setArtist(newPlaylist); // Append new playlists
    setIsLoadingArtist(false);
  };

  useEffect(() => {
    handleFetchPlaylist();
  }, [id]);

  const getLastImageUrl = (images) => {
    if (!Array.isArray(images) || images.length === 0) return null;
    const last = images[images.length - 1];
    return last?.url || null;
  };

  if (isLoadingArtist || !artist) {
    return (
      <div className="flex flex-col gap-4 p-6 animate-pulse">
        <div className="flex items-center gap-4 p-4 border rounded-xl">
          <div className="h-20 w-20 sm:h-32 sm:w-32 rounded-full bg-muted shrink-0" />
          <div className="flex flex-col gap-2 flex-1">
            <div className="h-5 w-40 bg-muted rounded" />
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="h-6 w-20 bg-muted rounded-full" />
          </div>
        </div>
        <div className="h-6 w-16 bg-muted rounded" />
        <div className="h-32 bg-muted rounded-xl" />
        <div className="h-6 w-24 bg-muted rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <Card className="flex items-center gap-4 p-4">
        <Avatar className="h-20 w-20 sm:h-32 sm:w-32">
          <AvatarImage
            src={getLastImageUrl(artist?.image) || undefined}
            alt="@shadcn"
          />
          <AvatarFallback>{getInitials(artist?.name)}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col justify-center">
          <h1 className="text-xl font-semibold">{artist?.name || "Artist"}</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            {formatNumber(artist?.followerCount)} Followers
          </p>
          <Badge className={"w-fit mt-1"}>
            {artist?.isVerified ? (
              <span className="flex items-center gap-1">
                <ShieldCheck size={15} />
                Verified
              </span>
            ) : (
              "Not Verified"
            )}
          </Badge>
        </div>
      </Card>
      <h1 className="text-2xl font-semibold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
        Bio
      </h1>
      <Card className="p-4 md:p-6 border border-border/60 bg-card/60 backdrop-blur-md shadow-lg rounded-xl">
        <p className="text-sm text-muted-foreground mb-2">
          {artist?.bio?.length === 0 && "No Bio Available"}
        </p>
        <Accordion type="single" collapsible className="w-full space-y-2">
          {artist?.bio?.map((bio, i) => (
            <AccordionItem
              key={i}
              value={bio?.sequence}
              className="rounded-lg border border-border/60 overflow-hidden"
            >
              <AccordionTrigger className="hover:no-underline py-3 px-3 bg-muted/10 hover:bg-muted/20 transition-colors">
                <span className="font-medium tracking-wide">{bio?.title}</span>
              </AccordionTrigger>
              <AccordionContent className="px-3 pb-4 leading-relaxed text-sm md:text-base text-muted-foreground">
                {bio?.text}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Card>
      <h1 className="text-2xl font-semibold">Top Songs</h1>
      <Card className="p-4">
        <SongList songs={artist?.topSongs} grid={true} />
      </Card>
      <h1 className="text-2xl font-semibold">Top Albums</h1>
      <Card className="p-4">
        <AlbumsList albums={artist?.topAlbums} />
      </Card>
    </div>
  );
};

export default page;
