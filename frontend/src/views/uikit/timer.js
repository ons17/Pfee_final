import { ref, watchEffect } from 'vue';

const LOCAL_STORAGE_KEY = 'activeTimeTracking';
const timer = ref(0);
const isRunning = ref(false);
const isPaused = ref(false);
let interval = null;

const startTimer = (suiviId) => {
  if (!isRunning.value && !interval) {
    interval = setInterval(() => {
      if (!isPaused.value) {
        timer.value++;
      }
      saveTimerState(suiviId);
    }, 1000);
    isRunning.value = true;
    isPaused.value = false;
  }
};

const stopTimer = () => {
  if (interval) {
    clearInterval(interval);
    interval = null;
    isRunning.value = false;
    isPaused.value = false;
    timer.value = 0;
    clearTimerState();
  }
};

const pauseTimer = () => {
  if (isRunning.value && !isPaused.value) {
    isPaused.value = true;
    // Don't clear the interval, just stop incrementing
    saveTimerState();
    return true;
  }
  return false;
};

const resumeTimer = () => {
  if (isRunning.value && isPaused.value) {
    isPaused.value = false;
    saveTimerState();
    return true;
  }
  return false;
};

const saveTimerState = (suiviId) => {
  const state = {
    timer: timer.value,
    isRunning: isRunning.value,
    isPaused: isPaused.value,
    lastUpdated: new Date().toISOString()
  };
  
  if (suiviId) {
    state.suiviId = suiviId;
  }
  
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
};

const restoreTimerState = async (verifyActiveFn) => {
  const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (savedState) {
    const state = JSON.parse(savedState);
    
    // Only restore if the saved state is less than 8 hours old
    const lastUpdated = new Date(state.lastUpdated);
    const now = new Date();
    const hoursDiff = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
    
    if (hoursDiff < 8) {
      timer.value = state.timer || 0;
      isRunning.value = state.isRunning;
      isPaused.value = state.isPaused;

      if (state.isRunning && state.suiviId) {
        const activeEntry = await verifyActiveFn();
        if (activeEntry) {
          // Don't start a new interval if paused
          if (!state.isPaused) {
            startTimer(activeEntry.idsuivi);
          }
        } else {
          clearTimerState();
        }
      }
    } else {
      clearTimerState();
    }
  }
};

const clearTimerState = () => {
  localStorage.removeItem(LOCAL_STORAGE_KEY);
};

const formatTime = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

// Enhanced tab title with pause state
watchEffect(() => {
  if (isRunning.value) {
    document.title = isPaused.value 
      ? `⏸ ${formatTime(timer.value)} - ImbusFlow`
      : `▶ ${formatTime(timer.value)} - ImbusFlow`;
  } else {
    document.title = 'ImbusFlow';
  }
});

export const useTimer = () => {
  return {
    timer,
    isRunning,
    isPaused,
    startTimer,
    stopTimer,
    pauseTimer,
    resumeTimer,
    formatTime,
    restoreTimerState
  };
};