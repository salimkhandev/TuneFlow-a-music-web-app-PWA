"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  addToSearchHistory,
  clearSearchHistory,
  fetchAlbums,
  fetchArtists,
  fetchSongs,
  getSearchHistory,
  removeFromSearchHistory,
} from "@/lib/utils";
import { debounce } from "lodash";
import { Clock, Info, LogOut, Music, Search, User, WifiOff, X } from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import AlbumsList from "../albums-list/AlbumsList";
import { ArtistCard } from "../artist-card/ArtistCard";
import CustomThemeSwitcher from "../CustomThemeSwitcher";
import Loader from "../loader/Loader";
import { ModeToggle } from "../playlist-crousel/mode-toggler/ModeToggler";
import { SongList } from "../song-list/SongList";

const Header = () => {
  const { data: session } = useSession();
  // Search-related states
  const [query, setQuery] = useState("");
  const [isOpenSearchDialog, setIsOpenSearchDialog] = useState(false);
  const [limit] = useState(10);
  const [imageError, setImageError] = useState(false);
  
  // Search history states
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Loading states
  const [isLoadingSongs, setIsLoadingSongs] = useState(false);
  const [isLoadingArtists, setIsLoadingArtists] = useState(false);
  const [isLoadingAlbums, setIsLoadingAlbums] = useState(false);

  // Results states
  const [songs, setSongs] = useState([]);
  const [artists, setArtists] = useState([]);
  const [albums, setAlbums] = useState([]);

  // Get network status from Redux store
  const isOnline = useSelector((state) => state.network.netAvail);

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load search history when component mounts
  useEffect(() => {
    if (!isClient) return;
    const history = getSearchHistory();
    setSearchSuggestions(history);
  }, [isClient]);

  // Fetch songs
  const handleFetchSongs = useCallback(
    async (searchQuery) => {
      setIsLoadingSongs(true);
      try {
        const songsResponse = await fetchSongs({ query: searchQuery, limit });
        
        setSongs(songsResponse?.data?.results || []);
      } catch (error) {
        console.error("Error fetching songs:", error);
        setSongs([]);
      } finally {
        setIsLoadingSongs(false);
      }
    },
    [limit]
  );

  // Fetch artists
  const handleFetchArtists = useCallback(
    async (searchQuery) => {
      setIsLoadingArtists(true);
      try {
        const artistsResponse = await fetchArtists({
          query: searchQuery,
          limit,
        });
        const allArtists = artistsResponse?.data?.results || [];
        // Filter out artists without a usable profile image (avoid placeholders)
        const filteredArtists = allArtists.filter((a) => {
          const images = a?.image;
          const url = Array.isArray(images) && images.length > 0 ? images[images.length - 1]?.url : undefined;
          if (!url || typeof url !== "string") return false;
          const lowered = url.toLowerCase();
          return !lowered.includes("placeholder") && !lowered.includes("default");
        });
        setArtists(filteredArtists);
      } catch (error) {
        console.error("Error fetching artists:", error);
        setArtists([]);
      } finally {
        setIsLoadingArtists(false);
      }
    },
    [limit]
  );

  // Fetch albums
  const handleFetchAlbums = useCallback(
    async (searchQuery) => {
      setIsLoadingAlbums(true);
      try {
        const albumsResponse = await fetchAlbums({ query: searchQuery, limit });
        setAlbums(albumsResponse?.data?.results || []);
      } catch (error) {
        console.error("Error fetching albums:", error);
        setAlbums([]);
      } finally {
        setIsLoadingAlbums(false);
      }
    },
    [limit]
  );

  // Debounced search across all categories
  const debouncedSearch = useCallback(
    debounce((searchQuery) => {
      if (searchQuery.trim()) {
        // Add to search history
        addToSearchHistory(searchQuery);
        
        handleFetchSongs(searchQuery);
        handleFetchArtists(searchQuery);
        handleFetchAlbums(searchQuery);
      } else {
        // Reset all results if query is empty
        setSongs([]);
        setArtists([]);
        setAlbums([]);
      }
    }, 300),
    [
      handleFetchSongs,
      handleFetchArtists,
      handleFetchAlbums,
    ]
  );

  // Handle search input change with suggestions
  const handleSearchChange = (value) => {
    setQuery(value);
    
    if (value.trim()) {
      // Filter suggestions based on current input
      const history = getSearchHistory();
      const filtered = history.filter(item => 
        item.toLowerCase().includes(value.toLowerCase())
      );
      setSearchSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
    
    debouncedSearch(value);
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    debouncedSearch(suggestion);
  };

  // Handle suggestion remove
  const handleRemoveSuggestion = (suggestion, e) => {
    e.stopPropagation();
    removeFromSearchHistory(suggestion);
    const updatedHistory = getSearchHistory();
    setSearchSuggestions(updatedHistory);
  };

  return (
    <header className="flex items-center p-3 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Left Side: Logo */}
      <div className="hidden md:flex items-center gap-2">
        <Music className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-bold">Tune Flow</h1>
      </div>

      {/* Middle: Search Bar (Hidden on Small Screens) */}
      {isOnline && (
        <div className="hidden sm:flex items-center gap-4 flex-1 max-w-md mx-4">
          <Button
            variant="secondary"
            className="relative w-full flex justify-start items-center"
            onClick={() => setIsOpenSearchDialog(true)}
          >
            <Search className="text-muted-foreground" />
            <p className="text-muted-foreground font-normal">
              Search songs, artists, or albums...
            </p>
          </Button>
        </div>
      )}

      {/* Right Side: Mode Toggle & Mobile Search Button */}
          {/* Mobile Search Icon */}
          {isOnline && (
            <Button
              size="icon"
              variant="outline"
              className="sm:hidden"
              onClick={() => setIsOpenSearchDialog(true)}
            >
              <Search className="h-5 w-5 text-muted-foreground" />
            </Button>
          )}
      <div className="flex items-center gap-3 ml-auto">

          {/* Mode Toggle - Hidden on Mobile, Visible on Desktop */}
          <div className="hidden sm:block">
            <ModeToggle />
          </div>

          {/* Custom Theme Switcher - Hidden on Mobile, Visible on Desktop */}
          <div className="hidden sm:block">
            <CustomThemeSwitcher />
          </div>

          {session?.user ? (
          <DropdownMenu >
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8  rounded-full p-0 overflow-hidden">
                  {session.user.image && !imageError ? (
                <img
                  src={session.user.image}
                  alt="avatar"
                      className="w-full h-full rounded-full object-cover"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                      onError={() => setImageError(true)}
                      onLoad={() => setImageError(false)}
                    />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{session.user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {session.user.email}
                    </p>
            </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5 sm:hidden">
                  <ModeToggle />
                </div>
                <div className="px-2 py-1.5 sm:hidden">
                  <CustomThemeSwitcher />
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/about" className="flex items-center w-full">
                    <Info className="mr-2 h-4 w-4" />
                    <span>About Dev & App</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => signOut({ callbackUrl: "/" })}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            isOnline ? (
              <Button size="sm" onClick={() => signIn("google", { callbackUrl: "/" })}>Sign in</Button>
            ) : (
              <Button size="sm" variant="outline" disabled>
                <WifiOff className="h-4 w-4 mr-2" />
                Offline
              </Button>
            )
          )}
        </div>

      <Dialog
        open={isOpenSearchDialog}
        onOpenChange={(open) => {
          if (!open) {
            setIsOpenSearchDialog(false);
            setQuery("");
            setShowSuggestions(false);
            setSongs([]);
            setArtists([]);
            setAlbums([]);
          }
        }}
      >
        <DialogContent className="w-[95vw] max-w-full sm:max-w-2xl md:max-w-3xl p-4 sm:p-6 rounded-2xl sm:rounded-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Search</DialogTitle>
            <DialogDescription>
              Search songs, artists, or albums...
            </DialogDescription>
          </DialogHeader>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
            <Input
              autoFocus
              placeholder="What do you want to listen to?"
              value={query}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 pr-10 py-6 text-base sm:text-lg rounded-xl bg-muted/50 border-border/50 focus-visible:ring-1 focus-visible:ring-primary/50 transition-all"
            />
            {query && (
              <button 
                onClick={() => {
                  setQuery("");
                  setShowSuggestions(false);
                  setSongs([]);
                  setArtists([]);
                  setAlbums([]);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}
            
            {/* Search Suggestions Dropdown */}
            {showSuggestions && searchSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-popover text-popover-foreground border border-border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto mt-1">
                <div className="p-2 text-xs text-muted-foreground border-b">
                  Recent Searches
                </div>
                {searchSuggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between px-3 py-2 hover:bg-muted cursor-pointer"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {suggestion}
                    </span>
                    <button
                      onClick={(e) => handleRemoveSuggestion(suggestion, e)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <div className="p-2 border-t">
                  <button
                    onClick={() => {
                      clearSearchHistory();
                      setSearchSuggestions([]);
                    }}
                    className="text-xs text-destructive hover:opacity-90"
                  >
                    Clear History
                  </button>
                </div>
              </div>
            )}
          </div>
          {/* Scrollable results — native div so mobile touch scroll works */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 sm:pr-3 mt-2 sm:mt-4 pb-2">
            
            {!query.trim() && searchSuggestions.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center py-16 opacity-60">
                <Search className="w-12 h-12 mb-4 text-muted-foreground" />
                <h2 className="text-xl font-semibold">Ready to listen?</h2>
                <p className="text-sm mt-2">Search for your favorite songs, artists, or albums.</p>
              </div>
            )}
            
            {query.trim() && !isLoadingSongs && !isLoadingArtists && !isLoadingAlbums && songs?.length === 0 && artists?.length === 0 && albums?.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center py-16 opacity-60">
                <Music className="w-12 h-12 mb-4 text-muted-foreground" />
                <h2 className="text-xl font-semibold">No results found for "{query}"</h2>
                <p className="text-sm mt-2">Please make sure your words are spelled correctly or use fewer or different keywords.</p>
              </div>
            )}

            {(isLoadingSongs || songs?.length > 0) && (
              <div className="flex flex-col gap-3 mb-8">
                <h1 className="font-semibold text-lg border-b pb-2">Songs</h1>
                {isLoadingSongs ? <Loader /> : <SongList songs={songs} grid={true} onItemClick={() => setIsOpenSearchDialog(false)} />}
              </div>
            )}

            {(isLoadingArtists || artists?.length > 0) && (
              <div className="flex flex-col gap-3 mb-8">
                <h1 className="font-semibold text-lg border-b pb-2">Artists</h1>
                {isLoadingArtists ? (
                  <Loader />
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {artists?.map((artist, i) => (
                      <ArtistCard key={i} artist={artist} onItemClick={() => setIsOpenSearchDialog(false)} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {(isLoadingAlbums || albums?.length > 0) && (
              <div className="flex flex-col gap-3 mb-8">
                <h1 className="font-semibold text-lg border-b pb-2">Albums</h1>
                {isLoadingAlbums ? <Loader /> : <AlbumsList albums={albums} onItemClick={() => setIsOpenSearchDialog(false)} />}
              </div>
            )}
          </div>

          {/* Always-visible close button at the bottom for mobile */}
          <div className="pt-2 border-t mt-1">
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => setIsOpenSearchDialog(false)}
            >
              <X className="h-4 w-4 mr-2" /> Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
};

export default Header;
