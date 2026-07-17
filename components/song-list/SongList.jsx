"use client";
import { Button } from "@/components/ui/button";
import {
  clearQueue,
  playSong,
  setProgress,
  togglePlayPause
} from "@/lib/slices/playerSlice";
import { decodeHtmlEntities } from "@/lib/utils";
import { AudioLines, Pause, Play } from "lucide-react";
import { memo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import SongMenu from "../song-menu/SongMenu";


// Memoized SongItem component to prevent unnecessary re-renders
const SongItem = memo(({ 
  song, 
  index, 
  currentSong, 
  isPlaying, 
  formatDuration, 
  handlePlayPause,
  isLiked = false,
  onToggleLike,
  onDownload
}) => {

  return (
    <div
      onClick={() => handlePlayPause(song, index)}

      className={`flex items-center justify-between cursor-pointer p-3 group rounded-md ${
        currentSong?.id === song.id && "bg-muted/50"
      } hover:bg-muted/50 transition-colors`}
    >
      <div  className="flex items-center gap-2">
        <div className="relative">
          <img
            src={song.image?.[song.image.length - 1]?.url || song.image?.[0]?.url || ''}
            alt={song.name || 'Song'}
            className="min-w-16 h-16 rounded-md object-cover bg-muted"
          />
          {/* Play/Pause button */}
          <Button
            size="icon"
            className={`absolute inset-0 m-auto opacity-0 ${
              currentSong?.id === song.id && "opacity-100"
            } group-hover:opacity-100 transition-opacity`}
          >
            {currentSong?.id === song.id && isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5" />
            )}
          </Button>
        </div>
        <div>
          <p className="font-medium line-clamp-1">{decodeHtmlEntities(song.name)}</p>
          <p className="text-sm text-muted-foreground space-x-2 line-clamp-2">
            {song.artists?.primary
              ?.map((artist) => decodeHtmlEntities(artist.name))
              .join(", ")}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {currentSong?.id === song?.id ? (
          <AudioLines className="text-foreground" />
        ) : (
          <p className="text-sm">{formatDuration(song.duration)}</p>
        )}
        <SongMenu
          song={song}
          isLiked={isLiked}
          onToggleLike={onToggleLike}
          onDownload={onDownload}
        />
      </div>
    </div>
  );
});

SongItem.displayName = 'SongItem';

export function SongList({ songs = [], grid = false, likedSongs = [], onToggleLike, onDownload, onItemClick }) {
  const dispatch = useDispatch();
  const { currentSong, isPlaying, queue } = useSelector(
    (state) => state.player
  );

  const formatDuration = useCallback((seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }, []);

  const handlePlayPause = useCallback((song, index) => {

    if (currentSong?.id === song.id) {
      dispatch(togglePlayPause()); // Toggle if the song is already playing
    } else {
      // Check if our songs array is the same as the current queue
      const isSameQueue =
        queue.length === songs.length &&
        songs.every((s, i) => s.id === queue[i]?.id);

      if (!isSameQueue) {
        // If we're playing from a different list, rebuild the queue
        dispatch(clearQueue());
        // Add all songs to the queue
        const songsQueue = [...songs];
        // Dispatch the playSong action with the queue and current index
        dispatch(playSong({ queue: songsQueue, index }));
      } else {
        // If we're in the same queue, just jump to the song
        const songIndex = queue.findIndex((s) => s.id === song.id);
        if (songIndex !== -1) {
          dispatch(playSong({ queue, index: songIndex }));
        }
      }
      dispatch(setProgress(0)); // Reset progress in Redux
      
      // Trigger user interaction for full-screen player
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('userInteraction'));
      }
    }
    if (onItemClick) {
      onItemClick();
    }
  }, [currentSong?.id, dispatch, queue, songs, onItemClick]);

  return (
    <div
      className={`${
        grid ? "grid grid-cols-1 md:grid-cols-2" : "flex flex-col"
      } gap-2`}
    >
      {songs.map((song, i) => (
        <SongItem
          key={`${song.id || 'unknown'}-${i}`}
          song={song}
          index={i}
          currentSong={currentSong}
          isPlaying={isPlaying}
          formatDuration={formatDuration}
          handlePlayPause={handlePlayPause}
          isLiked={likedSongs.some(likedSong => likedSong.id === song.id)}
          onToggleLike={onToggleLike}
          onDownload={onDownload}
        />
      ))}
    </div>
  );
}
