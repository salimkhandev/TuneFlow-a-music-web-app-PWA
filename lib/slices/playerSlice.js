import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  currentSong: null,
  queue: [], // Array to hold the song queue
  originalQueue: [], // Unshuffled queue
  queueIndex: -1, // Current position in the queue
  isPlaying: false,
  volume: 50,
  progress: 0,
  progress: 0,
  isBottomPlayerVisible: false,
  repeatMode: 0, // 0: no repeat, 1: repeat all, 2: repeat one
  isShuffle: false,
  isMuted: false
};

const playerSlice = createSlice({
  name: "player",
  initialState,
  reducers: {
    playSong: (state, action) => {
      // If we have a payload with queue information
      if (action.payload.queue && action.payload.index !== undefined) {
        state.originalQueue = [...action.payload.queue];
        if (state.isShuffle) {
          const current = action.payload.queue[action.payload.index];
          const others = [...action.payload.queue];
          others.splice(action.payload.index, 1);
          for (let i = others.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [others[i], others[j]] = [others[j], others[i]];
          }
          state.queue = [current, ...others];
          state.queueIndex = 0;
        } else {
          state.queue = action.payload.queue;
          state.queueIndex = action.payload.index;
        }
        state.currentSong = state.queue[state.queueIndex];
      } else {
        // Legacy support for direct song playing
        state.currentSong = action.payload;
        // Clear queue when playing a single song directly
        state.queue = [action.payload];
        state.originalQueue = [action.payload];
        state.queueIndex = 0;
      }
      // Reset progress to start from beginning for new song
      state.progress = 0;
      // Autoplay on selection (usually triggered by a user click)
      state.isPlaying = true;
      state.isBottomPlayerVisible = true;
   
    },
    togglePlayPause: (state) => {
      state.isPlaying = !state.isPlaying;
      // state.isBottomPlayerVisible=true;
    },
    setVolume: (state, action) => {
      state.volume = action.payload;
    },
    setProgress: (state, action) => {
      state.progress = action.payload;
      // state.isBottomPlayerVisible=true;
    },
    nextSong: (state) => {
      // Only proceed if we have songs in the queue
      if (state.queue.length > 0) {
        // Increment index, or loop back to beginning
        state.queueIndex = (state.queueIndex + 1) % state.queue.length;
        state.currentSong = state.queue[state.queueIndex];
        state.progress = 0; // Reset progress for new song
        // state.isBottomPlayerVisible=true;
      }
    },
    previousSong: (state) => {
      // Only proceed if we have songs in the queue
      if (state.queue.length > 0) {
        // Decrement index, or loop to end
        state.queueIndex =
          state.queueIndex <= 0 ? state.queue.length - 1 : state.queueIndex - 1;
        state.currentSong = state.queue[state.queueIndex];
        state.progress = 0; // Reset progress for new song
        // state.isBottomPlayerVisible=true;
      }
    },
    addToQueue: (state, action) => {
      // Add a song to the end of the queue
      state.queue.push(action.payload);
      if (state.originalQueue) {
        state.originalQueue.push(action.payload);
      }
    },
    clearQueue: (state) => {
      state.queue = state.currentSong ? [state.currentSong] : [];
      state.originalQueue = state.currentSong ? [state.currentSong] : [];
      state.queueIndex = state.currentSong ? 0 : -1;
    },
    showBottomPlayer:(state)=>{
      state.isBottomPlayerVisible=true;
    },
    hideBottomPlayer:(state)=>{
      state.isBottomPlayerVisible=false;
    },
    toggleRepeatMode: (state) => {
      // Simple toggle: 0 = off, 1 = loop current song
      state.repeatMode = state.repeatMode === 0 ? 1 : 0;
    },
    toggleShuffle: (state) => {
      state.isShuffle = !state.isShuffle;
      if (state.isShuffle) {
        // We need to shuffle the queue, but keep currentSong at index 0
        if (!state.originalQueue || state.originalQueue.length === 0) {
          state.originalQueue = [...state.queue];
        }
        if (state.queue.length > 1) {
          const current = state.queue[state.queueIndex];
          const others = [...state.queue];
          others.splice(state.queueIndex, 1);
          // shuffle others
          for (let i = others.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [others[i], others[j]] = [others[j], others[i]];
          }
          state.queue = [current, ...others];
          state.queueIndex = 0;
        }
      } else {
        // Restore original queue
        if (state.originalQueue && state.originalQueue.length > 0) {
          state.queue = [...state.originalQueue];
          const index = state.queue.findIndex(s => s.id === state.currentSong?.id);
          state.queueIndex = index !== -1 ? index : 0;
        }
      }
    },
    toggleMute: (state) => {
      state.isMuted = !state.isMuted;
    }
  },
});

export const {
  playSong,
  togglePlayPause,
  setVolume,
  setProgress,
  nextSong,
  previousSong,
  addToQueue,
  clearQueue,
  showBottomPlayer,
  hideBottomPlayer,
  toggleRepeatMode,
  toggleShuffle,
  toggleMute
} = playerSlice.actions;

export default playerSlice.reducer;
