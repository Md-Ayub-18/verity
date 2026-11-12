import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

const FocusModeContext = createContext(null);

export function FocusModeProvider({ children }) {
  const { user } = useAuth();
  const [focusModes, setFocusModes] = useState([]);
  const [activeMode, setActiveMode] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchFocusModes = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const modes = await api.getFocusModes();
      setFocusModes(modes);
      const currentActive = modes.find((m) => m.is_active) || null;
      setActiveMode(currentActive);
    } catch (err) {
      console.error('Failed to load focus modes', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchFocusModes();
    } else {
      setFocusModes([]);
      setActiveMode(null);
    }
  }, [user]);

  const toggleMode = async (modeId) => {
    try {
      const updatedModes = await api.toggleFocusMode(modeId);
      setFocusModes(updatedModes);
      const newActive = updatedModes.find((m) => m.is_active) || null;
      setActiveMode(newActive);
      return newActive;
    } catch (err) {
      alert(err.message || 'Failed to toggle focus mode');
      throw err;
    }
  };

  const createMode = async (modeData) => {
    try {
      const created = await api.createFocusMode(modeData);
      await fetchFocusModes();
      return created;
    } catch (err) {
      alert(err.message || 'Failed to create focus mode');
      throw err;
    }
  };

  const deleteMode = async (modeId) => {
    try {
      await api.deleteFocusMode(modeId);
      await fetchFocusModes();
    } catch (err) {
      alert(err.message || 'Failed to delete focus mode');
      throw err;
    }
  };

  return (
    <FocusModeContext.Provider
      value={{
        focusModes,
        activeMode,
        isFocusModeOn: Boolean(activeMode),
        loading,
        toggleMode,
        createMode,
        deleteMode,
        refreshModes: fetchFocusModes,
      }}
    >
      {children}
    </FocusModeContext.Provider>
  );
}

export function useFocusMode() {
  const context = useContext(FocusModeContext);
  if (!context) throw new Error('useFocusMode must be used within FocusModeProvider');
  return context;
}
