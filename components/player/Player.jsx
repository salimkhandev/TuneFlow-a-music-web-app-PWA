"use client";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useMediaSession } from "@/hooks/useMediaSession";
import {
  useGetLikedSongsQuery,
  useGetSongLikeStatusQuery,
  useLikeSongMutation,
  useUnlikeSongMutation,
} from "@/lib/api/likedSongsApi";
import {
  hideBottomPlayer,
  nextSong,
  previousSong,
  setProgress,
  setVolume,
  togglePlayPause,
  toggleMute
} from "@/lib/slices/playerSlice";
import { getOfflineAudio, isAudioOffline, removeAudioOffline } from "@/lib/utils";
import {
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X
} from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import FullScreenPlayer from "./FullScreenPlayer";




const Player = () => {
  const dispatch = useDispatch();
  const { data: session } = useSession();
  const { currentSong, isPlaying, volume, progress, queue, queueIndex, isBottomPlayerVisible, repeatMode, isMuted} =
    useSelector((state) => state.player);
  const { netAvail: isOnline } = useSelector((state) => state.network);
  const audioRef = useRef(null);
  const animationRef = useRef(null);
  const isLoadingRef = useRef(false);
  const pendingPlayRef = useRef(false);
  const lastDispatchedProgressRef = useRef(progress);
  const [localProgress, setLocalProgress] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  // Visibility now comes from Redux: state.player.isBottomPlayerVisible
  // const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [showFullScreen, setShowFullScreen] = useState(true);

  // Initialize Media Session API for system media controls
  useMediaSession();

  // Ensure we're on the client side before accessing localStorage
  useEffect(() => {
    setIsClient(true);
    setIsHydrated(true);
    setLocalProgress(progress);
  }, [progress]);

  // Reset local progress when current song changes
  useEffect(() => {
    setLocalProgress(0);
    lastDispatchedProgressRef.current = 0;
  }, [currentSong]);

  // Track user interaction for autoplay policy


  // Show full-screen player when a song is selected and start playing


  const handlePlayClick = () => {
    console.log('toggle from', isPlaying);
    dispatch(togglePlayPause());
  };
  // useEffect(() => { console.log('isPlaying ->', isPlaying); }, [isPlaying]);

  // RTK Query: liked songs
  const shouldFetchLiked = Boolean(session?.user?.email);
  const { data: likedData } = useGetLikedSongsQuery(undefined, { skip: !shouldFetchLiked });
  const likedSongs = Array.isArray(likedData?.items) ? likedData.items : [];
  
  // Fast like status check for current song
  const { data: likeStatus } = useGetSongLikeStatusQuery(currentSong?.id, { 
    skip: !shouldFetchLiked || !currentSong?.id 
  });
  const isCurrentSongLiked = likeStatus?.isLiked ?? false;
  
  const [likeSong] = useLikeSongMutation();
  const [unlikeSong] = useUnlikeSongMutation();

  // Build current audio URL and download via API proxy to force attachment
  const getCurrentAudioUrl = async () => {
    if (!currentSong?.downloadUrl) {
      console.log('❌ No downloadUrl for song:', currentSong?.name);
      return "";
    }

    // Check if song is available offline
    const isOffline = await isAudioOffline(currentSong.id);
    console.log('🔍 Offline check for song:', currentSong.name, 'isOffline:', isOffline);

    if (isOffline) {
      console.log('💾 Playing from IndexedDB (offline storage):', currentSong.name);
      const offlineAudio = await getOfflineAudio(currentSong.id);
      console.log('💾 Offline audio result:', offlineAudio);
      if (offlineAudio?.audioUrl) {
        console.log('✅ Using offline audio URL:', offlineAudio.audioUrl);
        return offlineAudio.audioUrl;
      } else {
        console.log('❌ No offline audio URL found');
      }
    }

    console.log('🌐 Playing from network:', currentSong.name);
    const directUrl = (
      currentSong.downloadUrl.find((u) => u.quality === "320kbps")?.url ||
      currentSong.downloadUrl[currentSong.downloadUrl.length - 1]?.url ||
      ""
    );
    console.log('🌐 Network URL:', directUrl);
    // Return direct URL (no proxy)
    return directUrl;
  };



  // Fast like status check - now using RTK Query directly

  // Handle like/unlike song
  const handleToggleLike = useCallback(async () => {
    if (!isClient || !currentSong) return;
    if (!session?.user) {
      signIn("google", { callbackUrl: "/" });
      return;
    }
    const isAlready = isCurrentSongLiked;
    try {
      if (isAlready) {
        await unlikeSong(currentSong.id).unwrap();
        
        // Remove song from IndexedDB when unliked
        const isOfflineSong = await isAudioOffline(currentSong.id);
        if (isOfflineSong) {
          await removeAudioOffline(currentSong.id);
          console.log('🗑️ Removed offline song from IndexedDB:', currentSong.id);
          
          // Dispatch custom event to notify other components
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('offlineSongDeleted', { 
              detail: { songId: currentSong.id } 
            }));
          }
        }
      } else {
        const songWithTimestamp = { ...currentSong, likedAt: new Date().toISOString() };
        await likeSong(songWithTimestamp).unwrap();
      }
    } catch (_) {
      // noop
    }
  }, [isClient, currentSong, session, isCurrentSongLiked, likeSong, unlikeSong, isOnline]);

  // Initialize/load audio element - ONLY when currentSong changes
  useEffect(() => {
    if (!audioRef.current || isLoadingRef.current) return;

    const loadAudio = async () => {
      if (currentSong && currentSong.downloadUrl) {
        const audioUrl = await getCurrentAudioUrl();

        if (audioUrl && audioRef.current.src !== audioUrl) {
          isLoadingRef.current = true;

          // Pause and reset before loading new source
          audioRef.current.pause();
          audioRef.current.currentTime = 0;

          audioRef.current.src = audioUrl;
          audioRef.current.load();

          // Set pending play if the song should be playing
          if (isPlaying) {
            pendingPlayRef.current = true;
          }

          // Reset loading flag when load is complete and auto-play if pending
          audioRef.current.onloadeddata = () => {
            isLoadingRef.current = false;
            if (pendingPlayRef.current && isPlaying) {
              pendingPlayRef.current = false;
              audioRef.current.play().catch(() => { });
            }
          };

          // Restore progress time after loading (for offline songs)
          audioRef.current.onloadedmetadata = () => {
            if (!isNaN(audioRef.current.duration) && progress > 0) {
              audioRef.current.currentTime = (progress / 100) * audioRef.current.duration;
            }
          };
        }
      }
    };

    loadAudio();
  }, [currentSong]); // 🚨 FIX: Removed isPlaying from dependencies to prevent restart

  // 🚨 REMOVED: Duplicate audio loading logic that was causing conflicts
  // The audio loading is now handled only in the effect above

  // Handle volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  // Mirror global isPlaying to the single audio element (no reloads here)
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      const p = audioRef.current.play();
      if (p) {
        p.catch((err) => {
          if (err?.name !== 'AbortError') {
            console.error('Playback failed:', err);
          }
        });
      }
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  // Function to update progress smoothly
  const updateProgress = useCallback(() => {
    if (!audioRef.current) return;

    const duration = audioRef.current.duration;
    if (!isNaN(duration) && duration > 0) {
      const calculatedProgress =
        (audioRef.current.currentTime / duration) * 100;
      setLocalProgress(calculatedProgress);

      // Update Redux only when there's a significant change (reducing unnecessary re-renders)
      if (Math.abs(calculatedProgress - lastDispatchedProgressRef.current) > 0.5) {
        lastDispatchedProgressRef.current = calculatedProgress;
        dispatch(setProgress(calculatedProgress));
      }
    }

    animationRef.current = requestAnimationFrame(updateProgress);
  }, [dispatch]);

  // Start progress animation when song is playing
  useEffect(() => {
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(updateProgress);
    } else {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, updateProgress]);

  // Sync local progress with Redux when seeking
  const handleProgressChange = (value) => {
    if (!audioRef.current) return;

    const duration = audioRef.current.duration;
    if (!isNaN(duration)) {
      audioRef.current.currentTime = (value[0] / 100) * duration;
    }

    setLocalProgress(value[0]);
    lastDispatchedProgressRef.current = value[0];
    dispatch(setProgress(value[0]));
  };

  // Handle song ending - play next song
  const handleSongEnd = () => {
    dispatch(setProgress(0));
    
    if (repeatMode === 2) {
      // Repeat One
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
      return;
    }

    if (queue.length > 0) {
      if (repeatMode === 1) {
        // Repeat All
        dispatch(nextSong());
      } else {
        // No Repeat - only go to next if not at the end
        if (queueIndex < queue.length - 1) {
          dispatch(nextSong());
        } else {
          dispatch(togglePlayPause());
        }
      }
    }
  };

  // Handle next song button click
  const handleNextSong = () => {
    // setHasUserInteracted(true);
    dispatch(setProgress(0));
    dispatch(nextSong());
  };

  // Handle previous song button click
  const handlePreviousSong = () => {
    // setHasUserInteracted(true);
    // If we're more than 3 seconds into the song, go back to the start of the current song
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      dispatch(setProgress(0));
    } else {
      // Otherwise go to the previous song
      dispatch(setProgress(0));
      dispatch(previousSong());
    }
  };



  // Check if next/prev buttons should be disabled
  const isQueueEmpty = !queue || queue.length === 0;


  // Show loading state during hydration to prevent mismatch
  if (!isHydrated) {
    return (
      <div className="relative w-full bg-background p-3 border-t flex flex-col">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center  gap-4 min-w-0 flex-1">
            <div className="h-14 w-14 bg-muted rounded-md animate-pulse" />
            <div className="truncate">
              <div className="h-4 bg-muted rounded animate-pulse mb-2 w-32" />
              <div className="h-3 bg-muted rounded animate-pulse w-24" />
            </div>
          </div>
          <div className="flex items-center gap-4 flex-1 justify-center">
            <div className="h-10 w-10 bg-muted rounded animate-pulse" />
            <div className="h-10 w-10 bg-muted rounded animate-pulse" />
            <div className="h-10 w-10 bg-muted rounded animate-pulse" />
          </div>
          <div className="hidden sm:flex items-center gap-2 flex-1 justify-end">
            <div className="h-5 w-5 bg-muted rounded animate-pulse" />
            <div className="h-2 w-24 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }
  const url =
    currentSong?.downloadUrl?.find(u => u.quality === "320kbps")?.url ||
    currentSong?.downloadUrl?.[currentSong.downloadUrl.length - 1]?.url ||
    "";

  return (
    <>
      {/* Persistent hidden audio element — always mounted */}
      <div className="hidden">
        <audio ref={audioRef} onEnded={handleSongEnd} preload="auto" crossOrigin="anonymous" />
      </div>

      {/* FullScreenPlayer as a fixed overlay so it never blocks sidebar/navigation */}
      {showFullScreen && currentSong && (
        <FullScreenPlayer
          onClose={() => setShowFullScreen(false)}
        />
      )}

      {isBottomPlayerVisible && (
       <div className="relative w-full bg-background p-3 border-t flex flex-col cursor-pointer md:hover:bg-muted/50 transition-colors" onClick={() => currentSong && setShowFullScreen(true)} >
          {/* Audio Element URL (debug/link) */}
          {/* {audioRef.current?.src && (
          <a
            href={audioRef.current.src}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-muted-foreground break-all"
          >
            {audioRef.current.src}
          </a>
          )} */}
        {/* Progress Bar */}
        <div onClick={(e) => e.stopPropagation()}>
          <Slider
            className="absolute -top-[1px] left-0 w-full h-[2px] rounded-none"
            value={[localProgress]}
            onValueChange={handleProgressChange}
            max={100}
              step={0.1}
          />
        </div>
        <div className="flex justify-between text-xs sm:text-sm text-muted-foreground mt-1">
          <span>{Math.floor((localProgress / 100) * (currentSong?.duration || 0) / 60)}:{(Math.floor((localProgress / 100) * (currentSong?.duration || 0)) % 60).toString().padStart(2, '0')}</span>
          <span>{Math.floor((currentSong?.duration || 0) / 60)}:{(Math.floor(currentSong?.duration || 0) % 60).toString().padStart(2, '0')}</span>
        </div>

        {/* Player Content */}
        <div className="flex items-center justify-between gap-4">
          {/* Left: Song Info */}
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <img
              src={
                currentSong?.image?.[currentSong.image.length - 1]?.url ||
                "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTYiIGhlaWdodD0iNTYiIHZpZXdCb3g9IjAgMCA1NiA1NiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yOCA0MkMzNS43MzM3IDQyIDQyIDM1LjczMzcgNDIgMjhDNDIgMjAuMjY2MyAzNS43MzM3IDE0IDI4IDE0QzIwLjI2NjMgMTQgMTQgMjAuMjY2MyAxNCAyOEMxNCAzNS43MzM3IDIwLjI2NjMgNDIgMjggNDJaIiBmaWxsPSIjOUI5QkEwIi8+CjxwYXRoIGQ9Ik0yNCAyMkwyNCAzNEwyOCAzMEwzMiAzNEwzMiAyMkwyNCAyMloiIGZpbGw9IiNGRkZGRkYiLz4KPC9zdmc+"
              }
              alt="Album cover"
              className="h-14 w-14 rounded-md"
            />
            <div className="truncate">
              <h3 className="font-semibold text-foreground truncate">
                {currentSong?.name || "No Song Playing"}
              </h3>
              <p className="text-xs text-muted-foreground truncate">
                {currentSong?.artists?.primary
                  ?.map((artist) => artist.name)
                  .join(", ") || "Artist Name"}
              </p>
            </div>

            {/* Like button */}

          </div>

          {/* Center: Playback Controls */}
          <div className="flex items-center gap-4 flex-1 justify-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handlePreviousSong();
              }}
              disabled={isQueueEmpty}
              className="bg-transparent active:bg-transparent focus:bg-transparent md:hover:bg-muted"
            >
              <SkipBack className="h-5 w-5" />
            </Button>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                handlePlayClick();
              }}
              variant="outline"
              size="icon"
              disabled={!currentSong}
              className="bg-transparent active:bg-transparent focus:bg-transparent md:hover:bg-muted"
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handleNextSong();
              }}
              disabled={isQueueEmpty}
              className="bg-transparent active:bg-transparent focus:bg-transparent md:hover:bg-muted"
            >
              <SkipForward className="h-5 w-5" />
            </Button>
          </div>

          {/* Right: Volume Control */}
          <div className="hidden sm:flex items-center gap-2 flex-1 justify-end" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => dispatch(toggleMute())}>
               {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </Button>
            <Slider
              className="w-24"
              value={[volume]}
              onValueChange={(value) => dispatch(setVolume(value[0]))}
              max={100}
              step={1}
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-[40px] h-8 w-8"
                onClick={() => dispatch(hideBottomPlayer())}
              aria-label="Close player"
            >
              <X className="h-8 w-8" />
            </Button>
          </div>
        </div>
      </div>
        )}
        </>
    )

};

export default Player;