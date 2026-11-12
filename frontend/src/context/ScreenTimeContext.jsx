import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

const ScreenTimeContext = createContext(null);

export function ScreenTimeProvider({ children }) {
  const { user } = useAuth();
  const [status, setStatus] = useState({
    screen_time_used_today: 0,
    daily_screen_time_limit: 60,
    remaining_minutes: 60,
    is_limit_reached: false,
    grace_period_active: false,
    grace_period_remaining_seconds: 0,
    account_type: 'adult',
    should_lock_screen: false,
    reminder_message: null,
  });

  const [activeAlert, setActiveAlert] = useState(null);
  const timerRef = useRef(null);

  const syncHeartbeat = async (activeSeconds = 60, fastForwardMinutes = 0) => {
    if (!user) return;
    try {
      const res = await api.sendHeartbeat(activeSeconds, fastForwardMinutes);
      setStatus(res);
      if (res.reminder_message) {
        setActiveAlert(res.reminder_message);
      }
    } catch (err) {
      console.error('Heartbeat sync failed', err);
    }
  };

  useEffect(() => {
    if (!user) return;

    const refreshFromServer = () => {
      api.getScreenTimeStatus()
        .then((res) => setStatus(res))
        .catch((err) => console.error(err));
    };

    // Initial check & window focus sync so multiple tabs stay identical
    refreshFromServer();
    window.addEventListener('focus', refreshFromServer);

    // Send active heartbeat every 60 seconds (only when this tab is active/visible to avoid double-counting)
    timerRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') {
        syncHeartbeat(60, 0);
      } else {
        refreshFromServer();
      }
    }, 60000);

    return () => {
      window.removeEventListener('focus', refreshFromServer);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [user]);

  const fastForward = async (minutes) => {
    await syncHeartbeat(0, minutes);
  };

  const resetTime = async () => {
    await api.resetScreenTime();
    const res = await api.getScreenTimeStatus();
    setStatus(res);
    setActiveAlert(null);
  };

  const dismissAlert = () => {
    setActiveAlert(null);
  };

  return (
    <ScreenTimeContext.Provider
      value={{
        status,
        activeAlert,
        dismissAlert,
        fastForward,
        resetTime,
        refreshStatus: () => syncHeartbeat(0, 0),
      }}
    >
      {children}
    </ScreenTimeContext.Provider>
  );
}

export function useScreenTime() {
  const context = useContext(ScreenTimeContext);
  if (!context) throw new Error('useScreenTime must be used within ScreenTimeProvider');
  return context;
}
