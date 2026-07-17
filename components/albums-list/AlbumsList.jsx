import { decodeHtmlEntities } from "@/lib/utils";
import Link from "next/link";
import { Card, CardContent } from "../ui/card";

const AlbumsList = ({ albums, onItemClick }) => {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {albums?.map((album, i) => (
        <Link href={`/albums/${album.id}`} key={i} onClick={onItemClick}>
          <Card className="overflow-hidden hover:opacity-75 transition">
            <CardContent className="p-0">
              <div className="aspect-square relative">
                <img
                  src={album.image[album.image.length - 1].url}
                  alt={album.name}
                  className="object-cover w-full h-full"
                />
              </div>
              <div className="p-4">
                <h3 className="font-semibold truncate line-clamp-1 flex items-center justify-between">
                  {decodeHtmlEntities(album.name)} <span>{album.year}</span>
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {album.artists.primary
                    .map((artist) => artist.name)
                    .join(", ")}
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
};

export default AlbumsList;
