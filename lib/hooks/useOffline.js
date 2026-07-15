import { useDispatch, useSelector } from 'react-redux';
import { createSelector } from '@reduxjs/toolkit';
import {
    addOfflineAudio,
    clearOfflineData,
    removeOfflineAudio,
    setIsStoring,
    setOfflineAudio,
    setOfflineCount,
    setOfflineStorageSize,
    setShowOfflineInfo,
    setStoringSongId,
    updateOfflineData
} from '../slices/offlineSlice';

// Hook to get offline state
export const useOfflineState = () => {
  return useSelector((state) => state.offline);
};

// Hook to get specific offline properties
export const useOfflineAudio = () => {
  return useSelector((state) => state.offline.offlineAudio);
};

export const useOfflineStorageSize = () => {
  return useSelector((state) => state.offline.offlineStorageSize);
};

export const useOfflineCount = () => {
  return useSelector((state) => state.offline.offlineCount);
};

export const useIsStoring = () => {
  return useSelector((state) => state.offline.isStoring);
};

export const useStoringSongId = () => {
  return useSelector((state) => state.offline.storingSongId);
};

export const useShowOfflineInfo = () => {
  return useSelector((state) => state.offline.showOfflineInfo);
};

// Hook to get offline actions
export const useOfflineActions = () => {
  const dispatch = useDispatch();
  
  return {
    setOfflineAudio: (audio) => dispatch(setOfflineAudio(audio)),
    setOfflineStorageSize: (size) => dispatch(setOfflineStorageSize(size)),
    setOfflineCount: (count) => dispatch(setOfflineCount(count)),
    setIsStoring: (isStoring) => dispatch(setIsStoring(isStoring)),
    setStoringSongId: (songId) => dispatch(setStoringSongId(songId)),
    setShowOfflineInfo: (show) => dispatch(setShowOfflineInfo(show)),
    updateOfflineData: (data) => dispatch(updateOfflineData(data)),
    clearOfflineData: () => dispatch(clearOfflineData()),
    addOfflineAudio: (audio) => dispatch(addOfflineAudio(audio)),
    removeOfflineAudio: (songId) => dispatch(removeOfflineAudio(songId)),
  };
};

// Combined hook for both state and actions
export const useOffline = () => {
  const state = useOfflineState();
  const actions = useOfflineActions();
  
  return {
    ...state,
    ...actions,
  };
};

// Hook to get offline song IDs as a Set for performance
const selectOfflineAudio = state => state.offline.offlineAudio;
const selectOfflineSongIds = createSelector(
  [selectOfflineAudio],
  (offlineAudio) => new Set(offlineAudio.map(audio => audio.songId))
);

export const useOfflineSongIds = () => {
  return useSelector(selectOfflineSongIds);
};

// Hook to check if a specific song is offline
export const useIsSongOffline = (songId) => {
  return useSelector((state) => 
    state.offline.offlineAudio.some(audio => audio.songId === songId)
  );
};
