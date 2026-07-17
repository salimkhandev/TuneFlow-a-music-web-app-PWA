"use client";
import { SongList } from "@/components/song-list/SongList";
import { decodeHtmlEntities, fetchAlbumById } from "@/lib/utils";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

const page = () => {
  const { id } = useParams();
  const [album, setAlbum] = useState(null);
  const [isLoadingAlbum, setIsLoadingAlbum] = useState(true);

  const handleFetchAlbum = async () => {
    setIsLoadingAlbum(true);
    const newAlbum = await fetchAlbumById({ id });
    setAlbum(newAlbum);
    setIsLoadingAlbum(false);
  };

  useEffect(() => {
    handleFetchAlbum();
  }, [id]);

  const getLastImageUrl = (images) => {
    if (!Array.isArray(images) || images.length === 0) return null;
    const last = images[images.length - 1];
    return last?.url || null;
  };

  // Show content-matching skeleton immediately while fetching
  if (isLoadingAlbum || !album) {
    return (
      <div className="p-6 flex flex-col gap-6 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-4 w-72 bg-muted rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Blurred background image */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <img
          src={getLastImageUrl(album?.image) || ""}
          alt="album image"
          className="w-full h-full object-cover object-center blur-lg scale-105"
        />
        <div className="absolute inset-0 bg-background/70"></div>
      </div>

      <div className="p-6 flex flex-col gap-6">
        <div className="sticky top-0 bg-background/70 backdrop-blur-sm py-4 px-6 z-10">
          <h1 className="text-lg font-semibold">
            {decodeHtmlEntities(album?.name)}
          </h1>
          <p className="text-muted-foreground">
            {decodeHtmlEntities(album?.description)}
          </p>
        </div>

        <SongList songs={album?.songs} grid={true} />
      </div>
    </div>
  );
};

export default page;
