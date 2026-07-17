"use client";
import Loader from "@/components/loader/Loader";
import { SongList } from "@/components/song-list/SongList";
import { Button } from "@/components/ui/button";
import {
  useGetLikedSongsQuery,
  useLikeSongMutation,
  useUnlikeSongMutation,
} from "@/lib/api/likedSongsApi";
import { fetchSongs } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

const Page = () => {
  const { data: session } = useSession();
  const [isLoadingSongs, setIsLoadingSongs] = useState(false);
  const [songs, setSongs] = useState([]);
  const [currentQuery, setCurrentQuery] = useState("a"); // Start with 'a'
  const [limit, setLimit] = useState(50);
  const shouldFetchLiked = Boolean(session?.user?.email);
  const { data: likedData } = useGetLikedSongsQuery(undefined, { skip: !shouldFetchLiked });
  const likedSongs = Array.isArray(likedData?.items) ? likedData.items : [];
  const [ likeSong ] = useLikeSongMutation();
  const [ unlikeSong ] = useUnlikeSongMutation();
  const [isClient, setIsClient] = useState(false);

  const handleFetchSongs = async (query) => {
    setIsLoadingSongs(true);
    const newSongs = await fetchSongs({ query, limit });
    const results = newSongs?.data?.results || [];
    
    // Filter out duplicate songs based on ID and Title + Artist
    setSongs((prevSongs) => {
      const getSongKey = (song) => {
        const name = song?.name?.toLowerCase().trim() || "";
        const primaryArtists = song?.artists?.primary;
        const artist = Array.isArray(primaryArtists) 
          ? primaryArtists.map(a => a?.name || "").join(",").toLowerCase().trim() 
          : "";
        return `${name}|${artist}`;
      };

      const existingIds = new Set(prevSongs.map(song => song.id));
      const existingKeys = new Set(prevSongs.map(getSongKey));

      const uniqueNewSongs = results.filter(song => {
        if (existingIds.has(song.id)) return false;
        
        const key = getSongKey(song);
        // If a song with the exact same name and artist is already present, skip it
        if (existingKeys.has(key) && key !== "|") return false;
        
        existingKeys.add(key);
        existingIds.add(song.id);
        return true;
      });

      return [...prevSongs, ...uniqueNewSongs];
    });
    
    setIsLoadingSongs(false);
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    handleFetchSongs(currentQuery);
  }, []);

  // liked songs are sourced via RTK Query above

  const loadMoreSongs = () => {
    if (currentQuery >= "z") return; // Stop at 'z'

    const nextQuery = String.fromCharCode(currentQuery.charCodeAt(0) + 1); // Increment alphabet
    setCurrentQuery(nextQuery);
    handleFetchSongs(nextQuery);
  };

  const handleToggleLike = async (song) => {
    if (!session?.user) return;
    const isLiked = likedSongs.some(likedSong => likedSong.id === song.id);
    try {
      if (isLiked) {
        await unlikeSong(song.id).unwrap();
      } else {
        const songWithTimestamp = { ...song, likedAt: new Date().toISOString() };
        await likeSong(songWithTimestamp).unwrap();
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleDownload = (song) => {
    if (!song.downloadUrl) return;
    
    const downloadUrl = song.downloadUrl.find(u => u.quality === "320kbps")?.url || 
                       song.downloadUrl[song.downloadUrl.length - 1]?.url;
    
    if (downloadUrl) {
      const params = new URLSearchParams({ url: downloadUrl, name: song.name || "song" });
      const a = document.createElement("a");
      a.href = `/api/download?${params.toString()}`;
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  };

  return (
    <div className="p-6 flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Songs</h1>
      {isLoadingSongs && songs.length === 0 ? (
        <Loader />
      ) : (
        <>
          <SongList 
            songs={songs} 
            grid={true} 
            likedSongs={likedSongs}
            onToggleLike={handleToggleLike}
            onDownload={handleDownload}
          />
          <div className="flex justify-center">
            <Button onClick={loadMoreSongs} disabled={currentQuery >= "z"}>
              Load More Songs
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default Page;
