import { ref, watchEffect } from 'vue';
import { useMutation } from '@vue/apollo-composable';
import { PAUSE_SUIVI, RESUME_SUIVI } from '@/graphql';

const LOCAL_STORAGE_KEY = 'activeTimeTracking';
const timer = ref(0); // Time in seconds
const isRunning = ref(false);
const isPaused = ref(false);
let interval = null;

// GraphQL mutations
const { mutate: pauseSuivi } = useMutation(PAUSE_SUIVI);
const { mutate: resumeSuivi } = useMutation(RESUME_SUIVI);

const startTimer = (suiviId) => {
  if (!isRunning.value && !interval) {
    interval = setInterval(() => {
      timer.value++;
      saveTimerState(suiviId);
    }, 1000);
    isRunning.value = true;
    isPaused.value = false;
  }
};

const stopTimer = (suiviId) => {
  if (interval) {
    clearInterval(interval);
    interval = null;
    isRunning.value = false;
    isPaused.value = false;
    timer.value = 0;
    clearTimerState();
  }
};

const pauseTimer = async (suiviId) => {
  if (isRunning.value && interval) {
    clearInterval(interval); // Stop the timer
    interval = null;
    isRunning.value = false;
    isPaused.value = true;

    try {
      // Call the backend to pause the timer
      const { data } = await pauseSuivi({ id: suiviId });
      if (data?.pauseSuivi?.success) {
        // Update the timer state with the paused duration from the backend
        timer.value = data.pauseSuivi.suivi.pausedDuration || timer.value;
        saveTimerState(suiviId); // Save the updated state to localStorage
      } else {
        throw new Error('Failed to pause the timer');
      }
    } catch (error) {
      console.error('Failed to pause time entry:', error);
      showError('Failed to pause the timer. Please try again.');
    }
  }
};

const resumeTimer = async (suiviId) => {
  if (!isRunning.value && isPaused.value && !interval) {
    try {
      // Call the backend to resume the timer
      const { data } = await resumeSuivi({ id: suiviId });
      if (data?.resumeSuivi?.success) {
        // Start the timer from the current paused duration
        timer.value = data.resumeSuivi.suivi.pausedDuration || timer.value; // Restore the correct timer value
        interval = setInterval(() => {
          timer.value++;
          saveTimerState(suiviId);
        }, 1000);
        isRunning.value = true;
        isPaused.value = false;
      } else {
        throw new Error('Failed to resume the timer');
      }
    } catch (error) {
      console.error('Failed to resume time entry:', error);
      showError('Failed to resume the timer. Please try again.');
    }
  }
};

export const saveTimerState = (suiviId) => {
  localStorage.setItem(
    LOCAL_STORAGE_KEY,
    JSON.stringify({
      timer: timer.value,
      isRunning: isRunning.value,
      isPaused: isPaused.value,
      suiviId: suiviId,
      lastUpdated: new Date().toISOString()
    })
  );
};

const restoreTimerState = async () => {
  const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (savedState) {
    const { 
      timer: savedTimer, 
      isRunning: savedIsRunning,
      isPaused: savedIsPaused,
      suiviId
    } = JSON.parse(savedState);
    
    timer.value = savedTimer || 0;

    if (savedIsPaused) {
      isPaused.value = true;
    } else if (savedIsRunning && suiviId) {
      try {
        // Verify with the backend if the suivi is still active
        const activeTracking = await verifyActiveTracking();
        if (activeTracking) {
          activeEntry.value = activeTracking;
          startTimer(activeTracking.idsuivi);
        } else {
          clearTimerState();
        }
      } catch (error) {
        console.error('Failed to restore timer:', error);
        clearTimerState();
      }
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
    document.title = `▶ ${formatTime(timer.value)} - ImbusFlow`;
  } else if (isPaused.value) {
    document.title = `⏸ ${formatTime(timer.value)} - ImbusFlow`;
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
    restoreTimerState,
    formatTime,
  };
};