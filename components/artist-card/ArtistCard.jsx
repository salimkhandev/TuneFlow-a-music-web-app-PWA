"use client";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export function ArtistCard({ artist, onItemClick }) {
  return (
    <Link href={`/artists/${artist.id}`} onClick={onItemClick}>
      <Card className="overflow-hidden flex flex-col items-center justify-center w-full hover:opacity-75 transition text-center border-none shadow-none">
        <CardContent className="p-0">
          <div className="aspect-square relative w-full">
            <img
              src={artist.image[artist.image.length - 1].url}
              alt={artist.name}
              className="object-cover w-full h-full rounded-full"
            />
          </div>
          <div className="p-4">
            <h3 className="font-semibold truncate">{artist.name}</h3>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
