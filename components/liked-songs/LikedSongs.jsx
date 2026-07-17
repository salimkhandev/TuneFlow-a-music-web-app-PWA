"use client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  useGetLikedSongsQuery,
  useLikeSongMutation,
  useUnlikeSongMutation,
} from "@/lib/api/likedSongsApi";
import { useOffline, useOfflineSongIds } from "@/lib/hooks/useOffline";
import { clearQueue, playSong, setProgress, showBottomPlayer, togglePlayPause } from "@/lib/slices/playerSlice";
import { clearAllOfflineAudio, decodeHtmlEntities, getAllOfflineAudio, getOfflineAudioCount, getOfflineAudioSize, initOfflineAudioDB, isAudioOffline, removeAudioOffline, storeAudioOffline } from "@/lib/utils";
import { AudioLines, CheckCircle, Clock, Download, HardDrive, Heart, Pause, Play, Trash2, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Loader from "../loader/Loader";
import SongMenu from "../song-menu/SongMenu";

const LikedSongs = () => {
  const dispatch = useDispatch();

  const { currentSong, isPlaying, queue } = useSelector((state) => state.player);
  const { netAvail: isOnline, isInitialized } = useSelector((state) => state.network); // ✅ Get network status and initialization
  const [likedSongs, setLikedSongs] = useState([]);
  const { data: session } = useSession();
  const [isClient, setIsClient] = useState(false);
  
  // Offline audio states from Redux
  const {
    offlineAudio,
    offlineStorageSize,
    offlineCount,
    isStoring,
    storingSongId,
    showOfflineInfo,
    setOfflineAudio,
    setOfflineStorageSize,
    setOfflineCount,
    setIsStoring,
    setStoringSongId,
    setShowOfflineInfo,
    updateOfflineData,
    clearOfflineData,
    addOfflineAudio,
    removeOfflineAudio
  } = useOffline();
  const [isLoadingSongs, setIsLoadingSongs] = useState(true);
  
  // Get offline song IDs from Redux
  const offlineSongIds = useOfflineSongIds();

  // Ensure we're on the client side before accessing localStorage
  useEffect(() => {
    setIsClient(true);
  }, []);

  // RTK Query: online fetch with skip when offline/unauthenticated
  const shouldFetch = Boolean(isOnline && isInitialized && session?.user?.email);
  const { data: likedData } = useGetLikedSongsQuery(undefined, { skip: !shouldFetch });
  const [likeSong] = useLikeSongMutation();
  const [unlikeSong] = useUnlikeSongMutation();

  // Load liked songs from RTK Query (online) or offline storage (IDB)
  useEffect(() => {
    if (!isClient || !isInitialized) return;

    const loadSongs = async () => {
      setIsLoadingSongs(true);
      
      try {
        if (shouldFetch) {
          setLikedSongs(Array.isArray(likedData?.items) ? likedData.items : []);
        } else {
          const db = await initOfflineAudioDB();
          if (!db) {
            setLikedSongs([]);
            return;
          }

          const transaction = db.transaction(['offlineMetadata'], 'readonly');
          const store = transaction.objectStore('offlineMetadata');

          const offlineSongs = await new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
          });

          // Sort offline songs by likedAt (most recently liked first) to match online ordering
          const sortedOfflineSongs = offlineSongs.sort((a, b) => 
            new Date(b.likedAt || b.storedAt) - new Date(a.likedAt || a.storedAt)
          );

          const formattedSongs = sortedOfflineSongs.map(song => ({
            ...song,
            id: song.songId,
            downloadUrl: song.downloadUrl || [{ url: '', quality: 'offline' }]
          }));

          setLikedSongs(formattedSongs);
        }
      } catch (error) {
        console.error('Failed to load songs:', error);
        setLikedSongs([]);
      } finally {
        setIsLoadingSongs(false);
      }
    };

    loadSongs();
  }, [isClient, isInitialized, shouldFetch, likedData?.items]);

  // Load offline audio data
  useEffect(() => {
    if (!isClient) return;
    
    const loadOfflineData = async () => {
      const audio = await getAllOfflineAudio();
      const size = await getOfflineAudioSize();
      const count = await getOfflineAudioCount();
      updateOfflineData({ audio, size, count });
    };
    
    loadOfflineData();
  }, [isClient]);

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const formatStorageSize = (sizeMb) => {
    if (typeof sizeMb !== 'number' || isNaN(sizeMb)) return '0 MB';
    if (sizeMb >= 1024) {
      const sizeGb = sizeMb / 1024;
      // Show one decimal place for GB (e.g., 1.2 GB)
      return `${sizeGb.toFixed(1)} GB`;
    }
    // For MB, show without decimals for clean look
    return `${Math.round(sizeMb)} MB`;
  };

  const handlePlayPause = (song, index) => {
    if (currentSong?.id === song.id) {
      dispatch(togglePlayPause());
    } else {
      // Check if our songs array is the same as the current queue
      const isSameQueue =
        queue.length === likedSongs.length &&
        likedSongs.every((s, i) => s.id === queue[i]?.id);

      if (!isSameQueue) {
        // If we're playing from a different list, rebuild the queue
        dispatch(clearQueue());
        dispatch(playSong({ queue: likedSongs, index }));
      } else {
        // Ensure bottom player is visible when switching within the same queue
        dispatch(showBottomPlayer());
        // If we're in the same queue, just jump to the song
        const songIndex = queue.findIndex((s) => s.id === song.id);
        if (songIndex !== -1) {
          dispatch(playSong({ queue, index: songIndex }));
        }
      }
      dispatch(setProgress(0));
      
      // Trigger user interaction for full-screen player
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('userInteraction'));
      }
    }
  };

  const handleRemoveFromLiked = async (songId) => {
    if (!isClient || !session?.user) return;
    try {
      await unlikeSong(songId).unwrap();
      
      setLikedSongs(prev => prev.filter(s => s.id !== songId));
      const isOffline = await isAudioOffline(songId);
      if (isOffline) {
        await removeAudioOffline(songId);
        console.log('🗑️ Removed offline song from IndexedDB:', songId);
        const audio = await getAllOfflineAudio();
        const size = await getOfflineAudioSize();
        const count = await getOfflineAudioCount();
        updateOfflineData({ audio, size, count });
      }
    } catch (error) {
      console.error('❌ Error removing song from liked songs:', error);
    }
  };

  const handleToggleLike = async (song) => {
    try {
      // Since we're in LikedSongs page, this should always remove the song
      await unlikeSong(song.id).unwrap();
      // delete from the idb
      await removeAudioOffline(song.id);
      const audio = await getAllOfflineAudio();
      const size = await getOfflineAudioSize();
      const count = await getOfflineAudioCount();
      updateOfflineData({ audio, size, count });
      
      // Remove song from IndexedDB when unliked
      const isOfflineSong = await isAudioOffline(song.id);
      if (isOfflineSong) {
        await removeAudioOffline(song.id);
        console.log('🗑️ Removed offline song from IndexedDB:', song.id);
      }
      
      setLikedSongs(prev => prev.filter(s => s.id !== song.id));
    } catch (error) {
      console.error('❌ Error removing song from liked songs:', error);
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

  // Store audio offline
  const handleStoreAudioOffline = async (song) => {
    if (!song?.id || !song?.downloadUrl) {
      console.error('❌ Song missing required data for offline storage');
      return;
    }
    
    setIsStoring(true);
    setStoringSongId(song.id);
    
    try {
      console.log('🌐 Starting offline storage for:', song.name);
      const success = await storeAudioOffline(song);
      
      if (success) {
        // Refresh offline data
        const audio = await getAllOfflineAudio();
        const size = await getOfflineAudioSize();
        const count = await getOfflineAudioCount();
        updateOfflineData({ audio, size, count });
        console.log('✅ Audio stored offline successfully');
      }
    } catch (error) {
      console.error('❌ Error storing audio offline:', error);
    } finally {
      setIsStoring(false);
      setStoringSongId(null);
    }
  };

  // Remove audio from offline storage
  const handleRemoveAudioOffline = async (songId) => {
    try {
      const success = await removeAudioOffline(songId);
      if (success) {
        // Only remove from likedSongs list when offline
        if (!isOnline) {
          setLikedSongs(prev => prev.filter(song => song.id !== songId));
        }
        
        // If the removed song is currently playing, stop playback and clear audio
        // if (currentSong?.id === songId) {
        //   dispatch(togglePlayPause()); // This will pause the current song
        //   // Force clear the audio element to prevent stale URL issues
        //   const audioElement = document.querySelector('audio');
        //   if (audioElement) {
        //     audioElement.pause();
        //     audioElement.src = '';
        //     audioElement.load();
        //   }
        // }
        
        // Refresh offline data
        const audio = await getAllOfflineAudio();
        const size = await getOfflineAudioSize();
        const count = await getOfflineAudioCount();
        updateOfflineData({ audio, size, count });
        console.log('✅ Audio removed from offline storage', isOnline ? '(kept in liked songs)' : '(removed from liked songs)');
      }
    } catch (error) {
      console.error('❌ Error removing audio from offline storage:', error);
    }
  };

  // Clear all offline audio
  const handleClearAllOffline = async () => {
    try {
      const success = await clearAllOfflineAudio();
      if (success) {
        clearOfflineData();
        console.log('✅ All offline audio cleared');
      }
    } catch (error) {
      console.error('❌ Error clearing offline audio:', error);
    }
  };


  // // Show consistent loading state during hydration
  // if (!isClient) {
  //   return (
  //     <div className="p-6 space-y-6">
  //       <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6">
  //         <div className="w-32 h-32 sm:w-48 sm:h-48 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-2xl">
  //           <Heart className="w-12 h-12 sm:w-20 sm:h-20 text-white" />
  //         </div>
  //         <div className="flex-1 space-y-4 text-center sm:text-left">
  //           <div>
  //             <p className="text-sm font-medium text-muted-foreground">Playlist</p>
  //             <h1 className="text-2xl sm:text-4xl font-bold">Liked Songs</h1>
  //           </div>
  //           <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-muted-foreground">
  //             <Heart className="w-4 h-4 fill-red-500 text-red-500" />
  //             <span>0 songs</span>
  //           </div>
  //         </div>
  //       </div>
        
  //       {/* Action Buttons - Show but disabled */}
  //       <div className="flex items-center justify-center sm:justify-start gap-4">
  //         <Button 
  //           size="lg" 
  //           className="rounded-full bg-green-600 hover:bg-green-700 w-full sm:w-auto"
  //           disabled
  //         >
  //           <Play className="w-6 h-6 mr-2" />
  //           Play
  //         </Button>
  //       </div>

  //       {/* Offline Audio Storage Section - Show but empty */}
  
  //       {/* Empty State */}
  //       <div className="text-center py-12">
  //         <Heart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
  //         <h3 className="text-xl font-semibold mb-2">No liked songs yet</h3>
  //         <p className="text-muted-foreground">
  //           Songs you like will appear here
  //         </p>
  //       </div>
  //     </div>
  //   );
  // }

  // Show loader while loading songs
  if (isLoadingSongs) {
    return (
      <div className="p-6 space-y-6 relative">
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6">
          <div className="w-32 h-32 sm:w-48 sm:h-48 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center shadow-2xl">
            <Heart className="w-12 h-12 sm:w-20 sm:h-20 text-white" />
          </div>
          <div className="flex-1 space-y-4 text-center sm:text-left">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Playlist</p>
              <h1 className="text-2xl sm:text-4xl font-bold">Liked Songs</h1>
            </div>
            <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-muted-foreground">
              <Heart className="w-4 h-4 fill-destructive text-destructive" />
              <span>Loading songs...</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 relative">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6">
        <div className="w-32 h-32 sm:w-48 sm:h-48 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center shadow-2xl">
          <Heart className="w-12 h-12 sm:w-20 sm:h-20 text-white" />
        </div>
        
        <div className="flex-1 space-y-4 text-center sm:text-left">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Playlist</p>
            <h1 className="text-2xl sm:text-4xl font-bold">Liked Songs</h1>
          </div>
          
          <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-muted-foreground">
            <Heart className="w-4 h-4 fill-destructive text-destructive" />
            <span>{likedSongs.length} songs</span>
          </div>
        </div>

        {/* Inline Offline info trigger now positioned globally at top-right of page content */}
        
      </div>
      {/* Top-right anchored button */}
      <div className="absolute top-2 right-2 md:top-4 md:right-6 z-20">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowOfflineInfo((v) => !v)}
          className="rounded-full shadow-sm"
          title="Offline audio info"
        >
          <HardDrive className="w-5 h-5" />
        </Button>
      </div>

      {showOfflineInfo && (
        <div
          className="fixed inset-x-3 bottom-3 md:inset-auto md:absolute md:right-6 md:top-16 md:bottom-auto md:w-80 bg-background/95 backdrop-blur border rounded-xl p-4 shadow-2xl z-50 max-w-[100vw]"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Offline Audio Storage</h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowOfflineInfo(false)}
              className="h-8 w-8"
              aria-label="Close offline info"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-2 md:gap-3 mb-3">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Storage used</span>
              <span className="font-medium text-foreground">{formatStorageSize(offlineStorageSize)}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {offlineCount} audio files available offline
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleClearAllOffline()}
              disabled={offlineCount === 0}
              className="text-destructive hover:opacity-90 w-full md:w-auto justify-center"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All Offline
            </Button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-center sm:justify-start gap-4">
        <Button 
          size="lg" 
          className="rounded-full bg-green-600 hover:bg-green-700 w-full sm:w-auto"
          onClick={() => likedSongs.length > 0 && handlePlayPause(likedSongs[0], 0)}
        >
          <Play className="w-6 h-6 mr-2" />
          Play
        </Button>
      </div>

      {/* Removed floating versions; panel is anchored inline to header button on desktop */}

      {/* Songs List */}
      <div className="space-y-2">
        {/* Header Row - Hidden on mobile */}
        <div className="hidden md:grid grid-cols-10 gap-4 px-4 py-2 text-sm font-medium text-muted-foreground border-b">
          <div className="col-span-1">#</div>
          <div className="col-span-6">Title</div>
          <div className="col-span-2">Album</div>
          <div className="col-span-1 flex justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        {/* Songs */}
        {likedSongs.map((song, index) => {
          const isOffline = offlineSongIds.has(song.id);
          const isStoringThis = storingSongId === song.id;
          
          return (
          <Card 
            key={song.id} 
            className={`group hover:bg-muted/50 transition-colors cursor-pointer ${
              currentSong?.id === song.id && "bg-muted/50"
            }`}
            onClick={() => handlePlayPause(song, index)}
          >
            {/* Desktop Layout */}
            <div className="hidden md:grid grid-cols-10 gap-4 items-center p-4">
              <div    onClick={(e) => {
                    e.stopPropagation();
                    handlePlayPause(song, index);
                  }} className="col-span-1 text-sm text-muted-foreground group-hover:hidden">
                {index + 1}
              </div>
              <div className="col-span-1 hidden group-hover:block">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
               
                >
                  {currentSong?.id === song.id && isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
              </div>
              
              <div className="col-span-6 flex items-center gap-3">
                <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center">
                  <img
                    src={song.image?.[song.image.length - 1]?.url || '/placeholder-album.jpg'}
                    alt={song.name}
                    className="w-full h-full object-cover rounded-md"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{decodeHtmlEntities(song.name)}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {song.artists?.primary?.length > 0 
                      ? song.artists.primary.map(artist => decodeHtmlEntities(artist.name)).join(", ")
                      : "Unknown Artist"}
                  </p>
                </div>
              </div>
              
              <div className="col-span-2 text-sm text-muted-foreground truncate">
                {song.album?.name || "Unknown Album"}
              </div>
              
              <div className="col-span-1 flex items-center justify-center gap-2">
                {currentSong?.id === song?.id ? (
                  <AudioLines className="text-foreground" />
                ) : (
                  <span className="text-sm text-muted-foreground">{formatDuration(song.duration)}</span>
                )}
                
                {/* Offline indicators */}
                <div className="flex items-center gap-1">
                {isOffline && (
                    <CheckCircle className="w-4 h-4 text-primary" title="Available offline" />
                  )}
                  {isStoringThis && (
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  )}
                  {!isOffline && !isStoringThis && song.downloadUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStoreAudioOffline(song);
                      }}
                      className="text-primary hover:opacity-90 p-1 h-6 w-6"
                    >
                      <Download className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                
                <SongMenu
                  song={song}
                  isLiked={true}
                  onToggleLike={handleToggleLike}
                  onDownload={handleDownload}
                  onStoreOffline={handleStoreAudioOffline}
                  onRemoveOffline={handleRemoveAudioOffline}
                  isOffline={isOffline}
                  isStoring={isStoringThis}
                  showOfflineOptions={true}
                />
              </div>
            </div>

            {/* Mobile Layout */}
            <div className="md:hidden p-4">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 bg-muted rounded-md flex items-center justify-center group">
                  <img
                    src={song.image?.[song.image.length - 1]?.url || '/placeholder-album.jpg'}
                    alt={song.name}
                    className="w-full h-full object-cover rounded-md"
                  />
                  {/* Play/Pause button overlay */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute inset-0 w-full h-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-md"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayPause(song, index);
                    }}
                  >
                    {currentSong?.id === song.id && isPlaying ? (
                      <Pause className="w-4 h-4 text-white" />
                    ) : (
                      <Play className="w-4 h-4 text-white" />
                    )}
                  </Button>
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{decodeHtmlEntities(song.name)}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {song.artists?.primary?.length > 0 
                      ? song.artists.primary.map(artist => decodeHtmlEntities(artist.name)).join(", ")
                      : "Unknown Artist"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {decodeHtmlEntities(song.album?.name) || "Unknown Album"}
                  </p>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  <div className="text-sm text-muted-foreground">
                    {currentSong?.id === song?.id ? (
                      <AudioLines className="text-foreground" />
                    ) : (
                      formatDuration(song.duration)
                    )}
                  </div>
                  
                  {/* Offline indicators for mobile */}
                  <div className="flex items-center gap-1">
                    {isOffline && (
                      <CheckCircle className="w-4 h-4 text-primary" title="Available offline" />
                    )}
                    {isStoringThis && (
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    )}
                    {!isOffline && !isStoringThis && song.downloadUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStoreAudioOffline(song);
                        }}
                        className="text-primary hover:opacity-90 p-1 h-6 w-6"
                      >
                        <Download className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  
                  <SongMenu
                    song={song}
                    isLiked={true}
                    onToggleLike={handleToggleLike}
                    onDownload={handleDownload}
                    onStoreOffline={handleStoreAudioOffline}
                    onRemoveOffline={handleRemoveAudioOffline}
                    isOffline={isOffline}
                    isStoring={isStoringThis}
                    showOfflineOptions={true}
                    className="opacity-100"
                  />
                </div>
              </div>
            </div>
          </Card>
          );
        })}
      </div>

      {/* Empty State - only show when not loading and no songs from actual data source */}
      {!isLoadingSongs && (
        (shouldFetch ? (likedData?.items?.length === 0 || !likedData?.items) : likedSongs.length === 0)
      ) && (
        <div className="text-center py-12">
          <Heart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No liked songs yet</h3>
          <p className="text-muted-foreground">
            Songs you like will appear here
          </p>
        </div>
      )}
    </div>
  );
};

export default LikedSongs;
