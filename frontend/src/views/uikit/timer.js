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
  if (suiviId) state.suiviId = suiviId;
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
};

const restoreTimerState = async (verifyActiveFn) => {
  const activeEntry = await verifyActiveFn?.();
  if (activeEntry) {
    if (activeEntry.isPaused) {
      timer.value = activeEntry.exactPauseValue || 0;
      isPaused.value = true;
      isRunning.value = true;
      // Do NOT start interval
    } else {
      const now = new Date();
      const start = new Date(activeEntry.heureDebutSuivi);
      const pausedSeconds = activeEntry.pausedDuration || 0;
      timer.value = Math.max(0, Math.floor((now - start) / 1000) - pausedSeconds);
      isPaused.value = false;
      isRunning.value = true;
      startTimer(activeEntry.idsuivi);
    }
  } else {
    stopTimer();
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