"use client";
import AlbumsList from "@/components/albums-list/AlbumsList";
import Loader from "@/components/loader/Loader";
import { Button } from "@/components/ui/button";
import { fetchAlbums } from "@/lib/utils";
import React, { useEffect, useState } from "react";

const Page = () => {
  const [isLoadingAlbums, setIsLoadingAlbums] = useState(false);
  const [albums, setAlbums] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentQuery, setCurrentQuery] = useState("new albums");
  const [limit, setLimit] = useState(50);

  const handleFetchAlbums = async (query, page = 1) => {
    setIsLoadingAlbums(true);
    const newAlbums = await fetchAlbums({ query, page, limit });
    const results = newAlbums?.data?.results;
    setAlbums((prevAlbums) => [...prevAlbums, ...results]); // Append new playlists
    setIsLoadingAlbums(false);
  };

  useEffect(() => {
    handleFetchAlbums(currentQuery, currentPage);
  }, []);

  const loadMoreAlbums = () => {
    if (currentPage >= 10) return; // Prevent excessive loading

    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    handleFetchAlbums(currentQuery, nextPage);
  };

  return (
    <div className="p-6 flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Albums</h1>
      {isLoadingAlbums && albums.length === 0 ? (
        <Loader />
      ) : (
        <>
          <AlbumsList albums={albums} />
          <div className="flex justify-center">
            <Button onClick={loadMoreAlbums} disabled={currentPage >= 10 || isLoadingAlbums}>
              Load More Songs
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default Page;
