"use client";
import {
  useGetLikedSongsQuery,
  useLikeSongMutation,
  useUnlikeSongMutation,
} from "@/lib/api/likedSongsApi";
import {
  fetchAlbums,
  fetchArtists,
  fetchSongs,
} from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { lazy, Suspense, useEffect, useState } from "react";
import Loader from "../loader/Loader";
import { Button } from "../ui/button";

// Lazy Load Components
const SongList = lazy(() =>
  import("../song-list/SongList").then((module) => ({
    default: module.SongList,
  }))
);
const ArtistsCrousel = lazy(() =>
  import("../artists-crousel/ArtistsCrousel").then((module) => ({
    default: module.default || module.ArtistsCrousel,
  }))
);
const AlbumsList = lazy(() =>
  import("../albums-list/AlbumsList").then((module) => ({
    default: module.default || module.AlbumsList,
  }))
);

const HomePage = () => {
  const { data: session } = useSession();
  const [artists, setArtists] = useState([]);
  const [songs, setSongs] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [isLoadingArtists, setIsLoadingArtists] = useState(false);
  const [isLoadingSongs, setIsLoadingSongs] = useState(false);
  const [isLoadingAlbums, setIsLoadingAlbums] = useState(false);
  const shouldFetchLiked = Boolean(session?.user?.email);
  const { data: likedData } = useGetLikedSongsQuery(undefined, { skip: !shouldFetchLiked });
  const likedSongs = Array.isArray(likedData?.items) ? likedData.items : [];
  const [ likeSong ] = useLikeSongMutation();
  const [ unlikeSong ] = useUnlikeSongMutation();
  const [isClient, setIsClient] = useState(false);

  const handleFetchArtists = async ({ query, limit }) => {
    setIsLoadingArtists(true);
    const artists = await fetchArtists({ query, limit });
    setArtists(artists?.data?.results);
    setIsLoadingArtists(false);
  };

  const handleFetchSongs = async ({ query, limit }) => {
    setIsLoadingSongs(true);
    const songs = await fetchSongs({ query, limit });
    setSongs(songs?.data?.results);
    setIsLoadingSongs(false);
  };

  const handleFetchAlbums = async ({ query, limit }) => {
    setIsLoadingAlbums(true);
    const albums = await fetchAlbums({ query, limit });
    setAlbums(albums?.data?.results);
    setIsLoadingAlbums(false);
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const artistQueries = ["arijit singh", "taylor swift", "the weeknd", "shreya ghoshal", "ed sheeran", "ar rahman"];
    const songQueries = ["bollywood hits", "english pop", "punjabi hits", "lofi chill", "latest punjabi"];
    const albumQueries = ["bollywood 2024", "english hits", "lofi mix"];

    const randomArtistQuery = artistQueries[Math.floor(Math.random() * artistQueries.length)];
    const randomSongQuery = songQueries[Math.floor(Math.random() * songQueries.length)];
    const randomAlbumQuery = albumQueries[Math.floor(Math.random() * albumQueries.length)];

    handleFetchArtists({ query: randomArtistQuery, limit: 15 });
    handleFetchSongs({ query: randomSongQuery, limit: 6 });
    handleFetchAlbums({ query: randomAlbumQuery, limit: 16 });
  }, []);

  // liked songs provided by RTK Query above

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
    <div className="flex flex-col gap-4 p-6 h-full overflow-y-auto">
      <h1 className="text-2xl font-bold">Songs</h1>
      <Suspense fallback={<Loader />}>
        {isLoadingSongs ? <Loader /> : <SongList songs={songs} grid={true} likedSongs={likedSongs} onToggleLike={handleToggleLike} onDownload={handleDownload} />}
      </Suspense>
      <div className="w-full flex items-center justify-center">
        <Link href={"/songs"}>
          <Button
            variant=""
            className="w-fit border border-border group transition-all"
          >
            Explore Songs{" "}
            <ArrowRight className="group-hover:translate-x-1 transition-all" />
          </Button>
        </Link>
      </div>

      <h1 className="text-2xl font-bold">Popular Artists</h1>
      <Suspense fallback={<Loader />}>
        {isLoadingArtists ? <Loader /> : <ArtistsCrousel artists={artists} />}
      </Suspense>
      <div className="w-full flex items-center justify-center">
        <Link href={"/artists"}>
          <Button
            variant=""
            className="w-fit border border-border group transition-all"
          >
            Explore Artists{" "}
            <ArrowRight className="group-hover:translate-x-1 transition-all" />
          </Button>
        </Link>
      </div>

      <h1 className="text-2xl font-bold">Popular Albums</h1>
      <Suspense fallback={<Loader />}>
        {isLoadingAlbums ? <Loader /> : <AlbumsList albums={albums} />}
      </Suspense>
      <div className="w-full flex items-center justify-center">
        <Link href={"/albums"}>
          <Button
            variant=""
            className="w-fit border border-border group transition-all"
          >
            Explore Albums{" "}
            <ArrowRight className="group-hover:translate-x-1 transition-all" />
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default HomePage;
