"use client";
import { ArtistCard } from "@/components/artist-card/ArtistCard";
import Loader from "@/components/loader/Loader";
import { Button } from "@/components/ui/button";
import { fetchArtists } from "@/lib/utils";
import { useEffect, useState } from "react";

const Page = () => {
  const [isLoadingArtists, setIsLoadingArtists] = useState(false);
  const [artists, setArtists] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentQuery, setCurrentQuery] = useState("arijit singh");
  const [limit, setLimit] = useState(50);

  const handleFetchArtists = async (query, page = 1) => {
    setIsLoadingArtists(true);
    const newArtists = await fetchArtists({ query, page, limit });
    const results = newArtists?.data?.results || [];
    // Filter out artists with default/placeholder images or missing image
    const filtered = results.filter((a) => {
      const images = a?.image;
      const url = Array.isArray(images) && images.length > 0 ? images[images.length - 1]?.url : undefined;
      if (!url || typeof url !== "string") return false;
      const lowered = url.toLowerCase();
      return !lowered.includes("artist-default-music.png") && !lowered.includes("placeholder") && !lowered.includes("default");
    });
    setArtists((prevArtists) => [...prevArtists, ...filtered]); // Append filtered artists
    setIsLoadingArtists(false);
  };

  useEffect(() => {
    handleFetchArtists(currentQuery, currentPage);
  }, []);

  const loadMoreArtists = () => {
    if (currentPage >= 10) return; // Prevent excessive loading

    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    handleFetchArtists(currentQuery, nextPage);
  };

  return (
    <div className="p-6 flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Artists</h1>
      {isLoadingArtists && artists.length === 0 ? (
        <Loader />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {artists.map((artist, i) => (
              <ArtistCard key={i} artist={artist} />
            ))}
          </div>
          <div className="flex justify-center">
            <Button onClick={loadMoreArtists} disabled={currentPage >= 10 || isLoadingArtists}>
              Load More Songs
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default Page;
