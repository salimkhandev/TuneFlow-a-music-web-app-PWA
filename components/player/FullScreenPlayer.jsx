"use client";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  useGetLikedSongsQuery,
  useGetSongLikeStatusQuery,
  useLikeSongMutation,
  useUnlikeSongMutation,
} from "@/lib/api/likedSongsApi";
import { useOffline } from "@/lib/hooks/useOffline";
import {
  nextSong,
  previousSong,
  setProgress,
  togglePlayPause,
  toggleRepeatMode,
  toggleShuffle,
  toggleMute
} from "@/lib/slices/playerSlice";
import { getAllOfflineAudio, getOfflineAudioCount, getOfflineAudioSize, isAudioOffline, removeAudioOffline, decodeHtmlEntities } from "@/lib/utils";
import {
  ArrowLeft,
  Heart,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  ListMusic,
  Share2
} from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

const FullScreenPlayer = ({ onClose }) => {
  const dispatch = useDispatch();
  const { data: session } = useSession();
  const { currentSong, isPlaying, volume, progress, queue, queueIndex, repeatMode, isShuffle, isMuted } =
    useSelector((state) => state.player);
  // No audio ref needed - uses bottom player's audio
  const [localProgress, setLocalProgress] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const { netAvail: isOnline } = useSelector((state) => state.network);

  // Get offline actions from Redux
  const { updateOfflineData } = useOffline();
  // Ensure we're on the client side before accessing localStorage
  useEffect(() => {
    setIsClient(true);
    setIsHydrated(true);
    setLocalProgress(progress);
  }, [progress]);

  // Track user interaction for autoplay policy
  useEffect(() => {
    const handleUserInteraction = () => {
      setHasUserInteracted(true);
    };

    // Add event listeners for user interaction
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, []);
  useEffect(() => {
    // Push a hash state. Next.js safely ignores hash changes, so this won't
    // trigger a hard refresh when the hardware back button is pressed.
    if (window.location.hash !== "#fs") {
      window.history.pushState(null, "", window.location.pathname + window.location.search + "#fs");
    }

    const handlePopState = () => {
      // If the hash is gone, the user pressed the back button.
      if (window.location.hash !== "#fs") {
        onClose();
      }
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      // Clean up the hash if the player is closed programmatically
      if (window.location.hash === "#fs") {
        window.history.back();
      }
    };
  }, [onClose]);

  // RTK Query: read liked songs when user is authenticated
  const shouldFetchLiked = Boolean(session?.user?.email);
  const { data: likedData } = useGetLikedSongsQuery(undefined, { skip: !shouldFetchLiked });
  const likedSongs = Array.isArray(likedData?.items) ? likedData.items : [];

  // Fast like status check for current song
  const { data: likeStatus } = useGetSongLikeStatusQuery(currentSong?.id, {
    skip: !shouldFetchLiked || !currentSong?.id
  });
  const isCurrentSongLiked = likeStatus?.isLiked ?? false;

  const [likeSong, { isLoading: isLiking }] = useLikeSongMutation();
  const [unlikeSong, { isLoading: isUnliking }] = useUnlikeSongMutation();
  const isLikeActionLoading = isLiking || isUnliking;

  // Build current audio URL and download via API proxy to force attachment
  const getCurrentAudioUrl = () => {
    if (!currentSong?.downloadUrl) return "";
    return (
      currentSong.downloadUrl.find((u) => u.quality === "320kbps")?.url ||
      currentSong.downloadUrl[currentSong.downloadUrl.length - 1]?.url ||
      ""
    );
  };

  const handleDownload = () => {
    const src = getCurrentAudioUrl();
    if (!src) return;
    const params = new URLSearchParams({ url: src, name: currentSong?.name || "song" });
    const a = document.createElement("a");
    a.href = `/api/download?${params.toString()}`;
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // Fast like status check - now using RTK Query directly

  // Handle like/unlike song
  const handleToggleLike = useCallback(async () => {
    if (!isClient || !currentSong) return;
    if (!session?.user) {
      signIn("google", { callbackUrl: "/" });
      return;
    }
    try {
      if (isCurrentSongLiked) {
        await unlikeSong(currentSong.id).unwrap();

        // Remove song from IndexedDB when unliked
        const isOfflineSong = await isAudioOffline(currentSong.id);
        if (isOfflineSong) {
          await removeAudioOffline(currentSong.id);
          const audio = await getAllOfflineAudio();
          const size = await getOfflineAudioSize();
          const count = await getOfflineAudioCount();
          updateOfflineData({ audio, size, count });
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
    } catch (e) {
      // no-op, network/UI will remain consistent via RTK Query
    }
  }, [isClient, currentSong, session, isCurrentSongLiked, likeSong, unlikeSong, isOnline]);

  // Get reference to the bottom player's audio element
  const getAudioElement = () => {
    return document.querySelector('audio');
  };

  // Ensure shared audio element allows CORS for proxied stream
  useEffect(() => {
    const el = getAudioElement();
    if (el) {
      el.crossOrigin = 'anonymous';
      // keep preload aggressive to reduce start latency
      el.preload = 'auto';
    }
  }, []);

  // Auto-play when full-screen opens
  useEffect(() => {
    if (isHydrated && currentSong && hasUserInteracted) {
      // Ensure the song starts playing when full-screen opens
      const audioElement = getAudioElement();
      if (audioElement && isPlaying) {
        const playPromise = audioElement.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log("Auto-playing in full screen");
            })
            .catch((err) => {
              if (err.name !== 'AbortError') {
                console.error("Auto-play failed:", err);
              }
            });
        }
      }
    }
  }, [isHydrated, currentSong, hasUserInteracted, isPlaying]);

  // Handle play/pause - control bottom player's audio
  useEffect(() => {
    const audioElement = getAudioElement();
    if (!audioElement || !isHydrated) return;

    if (isPlaying && hasUserInteracted) {
      const playPromise = audioElement.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log("Audio started playing in full screen");
          })
          .catch((err) => {
            if (err.name !== 'AbortError') {
              console.error("Playback failed:", err);
            }
          });
      }
    } else if (!isPlaying) {
      audioElement.pause();
    }
  }, [isPlaying, isHydrated, hasUserInteracted]);

  // Handle volume changes
  useEffect(() => {
    const audioElement = getAudioElement();
    if (audioElement) {
      audioElement.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  // Sync local progress with Redux progress
  useEffect(() => {
    setLocalProgress(progress);
  }, [progress]);

  // Handle progress seeking - control bottom player's audio directly
  const handleProgressChange = (value) => {
    setLocalProgress(value[0]);
    dispatch(setProgress(value[0]));

    // Update the audio element directly
    const audioElement = getAudioElement();
    if (audioElement && !isNaN(audioElement.duration)) {
      const duration = audioElement.duration;
      audioElement.currentTime = (value[0] / 100) * duration;
    }
  };

  // Handle next song button click
  const handleNextSong = () => {
    setHasUserInteracted(true);
    dispatch(setProgress(0));
    dispatch(nextSong());
  };

  // Handle previous song button click
  const handlePreviousSong = () => {
    setHasUserInteracted(true);
    // Go to the previous song (bottom player handles the 3-second logic)
    dispatch(setProgress(0));
    dispatch(previousSong());
  };

  // Check if next/prev buttons should be disabled
  const isQueueEmpty = !queue || queue.length === 0;

  // Show loading state during hydration to prevent mismatch
  if (!isHydrated) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!currentSong) {
    return null;
  }

  return (

    <div className="fixed inset-0 bg-background z-50 flex flex-col overflow-hidden">
      {/* Blurred background using current song image */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <img
          src={
            (currentSong?.image && currentSong.image[currentSong.image.length - 1]?.url) ||
            "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjMyMCIgdmlld0JveD0iMCAwIDMyMCAzMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMjAiIGhlaWdodD0iMzIwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNjAgMjQwQzIwNS40NjQgMjQwIDI0MCAyMDUuNDY0IDI0MCAxNjBDMjQwIDExNC41MzYgMjA1LjQ2NCA4MCAxNjAgODBDMTE0LjUzNiA4MCA4MCAxMTQuNTM2IDgwIDE2MEM4MCAyMDUuNDY0IDExNC41MzYgMjQwIDE2MCAyNDBaIiBmaWxsPSIjOUI5QkEwIi8+CjxwYXRoIGQ9Ik0xMzYgMTI4TDEzNiAxOTJMMTYwIDE3NkwxODQgMTkyTDE4NCAxMjhMMTM2IDEyOFoiIGZpbGw9IiNGRkZGRkYiLz4KPC9zdmc+"
          }
          alt="Background"
          className="w-full h-full object-cover object-center blur-2xl scale-110"
        />
        <div className="absolute inset-0 bg-background/70" />
      </div>
      {/* No separate audio element - uses the bottom player's audio */}

      {/* Header */}
      <div className="flex items-center justify-between p-4 sm:p-5 md:p-6 flex-shrink-0 min-h-[60px] sm:min-h-[70px] md:min-h-[80px]">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-foreground bg-transparent active:bg-transparent focus:bg-transparent md:hover:bg-muted h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12"
        >
          <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
        </Button>

        <div className="text-center">
          <p className="text-sm sm:text-base text-muted-foreground">Playing from</p>
          <p className="text-base sm:text-lg font-medium">Liked Songs</p>
        </div>

        <div className="w-8 sm:w-10 md:w-12" /> {/* Spacer for centering */}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center px-4 sm:px-8 pb-2 sm:pb-8 min-h-0 w-full gap-2 sm:gap-4 md:gap-6">

        {/* Album Art with Glow (Dynamic shrink) */}
        <div className="flex-1 min-h-0 w-full flex items-center justify-center relative">
          <div className="relative h-full aspect-square max-h-[320px] sm:max-h-[420px] md:max-h-[500px] max-w-full">
            <div className="absolute inset-0 bg-primary/40 rounded-xl blur-[40px] -z-10 animate-pulse"></div>
            <img
              src={
                currentSong?.image?.[currentSong.image.length - 1]?.url ||
                "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjMyMCIgdmlld0JveD0iMCAwIDMyMCAzMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMjAiIGhlaWdodD0iMzIwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNjAgMjQwQzIwNS40NjQgMjQwIDI0MCAyMDUuNDY0IDI0MCAxNjBDMjQwIDExNC41MzYgMjA1LjQ2NCA4MCAxNjAgODBDMTE0LjUzNiA4MCA4MCAxMTQuNTM2IDgwIDE2MEM4MCAyMDUuNDY0IDExNC41MzYgMjQwIDE2MCAyNDBaIiBmaWxsPSIjOUI5QkEwIi8+CjxwYXRoIGQ9Ik0xMzYgMTI4TDEzNiAxOTJMMTYwIDE3NkwxODQgMTkyTDE4NCAxMjhMMTM2IDEyOFoiIGZpbGw9IiNGRkZGRkYiLz4KPC9zdmc+"
              }
              alt="Album cover"
              className="absolute inset-0 w-full h-full rounded-xl object-cover shadow-2xl shadow-primary/30"
            />
          </div>
        </div>

        {/* Song Info (Strong Typography) */}
        <div className="text-center max-w-sm sm:max-w-md px-2 sm:px-4 flex-shrink-0 w-full flex flex-col items-center">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-foreground mb-1 line-clamp-2 bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70">
            {decodeHtmlEntities(currentSong?.name) || "No Song Playing"}
          </h1>
          <p className="text-xs sm:text-sm md:text-base font-medium text-primary/80 line-clamp-1 mb-1">
            {currentSong?.artists?.primary
              ?.map((artist) => decodeHtmlEntities(artist.name))
              .join(", ") || "Artist Name"}
          </p>

          {/* Genre Tags Badge Row */}
          {currentSong?.genre && (
            <div className="flex flex-wrap justify-center gap-2 mt-1">
              {(Array.isArray(currentSong.genre) ? currentSong.genre : [currentSong.genre]).slice(0, 2).map((g, i) => (
                <span key={i} className="px-2 py-0.5 text-[10px] sm:text-xs font-semibold uppercase tracking-wider bg-primary/10 text-primary rounded-full border border-primary/20">
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Progress Bar (Gradient styling applied via tailwind override) */}
        <div className="w-full max-w-xs sm:max-w-md px-2 sm:px-4 flex-shrink-0">
          <Slider
            value={[localProgress]}
            onValueChange={handleProgressChange}
            max={100}
            step={0.1}
            className="w-full [&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_[role=slider]]:border-2 [&_[role=slider]]:border-primary [&_[role=slider]]:bg-white [&_.bg-primary]:bg-gradient-to-r [&_.bg-primary]:from-primary/50 [&_.bg-primary]:to-primary [&_.bg-border]:bg-primary/20"
          />
          <div className="flex justify-between text-xs font-medium text-muted-foreground mt-2">
            <span>{Math.floor((localProgress / 100) * (currentSong?.duration || 0) / 60)}:{(Math.floor((localProgress / 100) * (currentSong?.duration || 0)) % 60).toString().padStart(2, '0')}</span>
            <span>{Math.floor((currentSong?.duration || 0) / 60)}:{(Math.floor(currentSong?.duration || 0) % 60).toString().padStart(2, '0')}</span>
          </div>
        </div>

        {/* Symmetric Controls */}
        <div className="flex items-center justify-between w-full max-w-[280px] sm:max-w-md flex-shrink-0 px-1 sm:px-2">
          {/* Shuffle Button */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => dispatch(toggleShuffle())}
            className={`${isShuffle ? 'text-primary' : 'text-muted-foreground'} hover:text-foreground hover:bg-transparent`}
          >
            <Shuffle className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-3 sm:gap-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePreviousSong}
              disabled={isQueueEmpty}
              className="text-foreground bg-transparent hover:bg-muted/50 h-10 w-10 sm:h-12 sm:w-12 rounded-full"
            >
              <SkipBack className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>

            <Button
              onClick={() => {
                setHasUserInteracted(true);
                dispatch(togglePlayPause());
              }}
              size="icon"
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95"
            >
              {isPlaying ? (
                <Pause className="h-6 w-6 sm:h-8 sm:w-8 fill-current" />
              ) : (
                <Play className="h-6 w-6 sm:h-8 sm:w-8 fill-current ml-1" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextSong}
              disabled={isQueueEmpty}
              className="text-foreground bg-transparent hover:bg-muted/50 h-10 w-10 sm:h-12 sm:w-12 rounded-full"
            >
              <SkipForward className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
          </div>

          {/* Repeat Button */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => dispatch(toggleRepeatMode())}
            className={`${repeatMode !== 0 ? 'text-primary' : 'text-muted-foreground'} hover:text-foreground hover:bg-transparent relative`}
          >
            {repeatMode === 2 ? (
              <Repeat1 className="h-5 w-5" />
            ) : (
              <Repeat className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Secondary Actions (Like, Volume) */}
        <div className="flex items-center justify-center gap-12 w-full max-w-[240px] flex-shrink-0">
          <Button variant="ghost" size="icon" onClick={() => dispatch(toggleMute())} className="text-muted-foreground hover:text-foreground">
            {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </Button>

          {isOnline ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleLike}
              disabled={isLikeActionLoading}
              className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
            >
              {isLikeActionLoading ? (
                <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Heart className={`w-5 h-5 ${isCurrentSongLiked ? 'fill-red-500 text-red-500' : ''}`} />
              )}
            </Button>
          ) : (
            <div className="w-10" />
          )}
        </div>
      </div>

      {/* Volume Control */}

    </div>
  );
};

export default FullScreenPlayer;
