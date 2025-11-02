import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Light theme colors
const lightTheme = {
  // Background colors
  background: '#FFFFFF',
  surface: '#F9FAFB',
  card: '#FFFFFF',
  
  // Text colors
  text: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  
  // Border colors
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  
  // Status colors
  primary: '#ff1e1e',
  secondary: '#007AFF',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#ff1e1e',
  
  // Interactive colors
  buttonBackground: '#ff1e1e',
  buttonText: '#FFFFFF',
  buttonSecondary: '#F3F4F6',
  buttonSecondaryText: '#6B7280',
  
  // Shadow
  shadow: 'rgba(0, 0, 0, 0.1)',
  
  // Specific component colors
  headerBackground: '#FFFFFF',
  tabBarBackground: '#FFFFFF',
  inputBackground: '#FFFFFF',
  modalOverlay: 'rgba(0, 0, 0, 0.5)',
};

// Dark theme colors
const darkTheme = {
  // Background colors
  background: '#111827',
  surface: '#1F2937',
  card: '#374151',
  
  // Text colors
  text: '#F9FAFB',
  textSecondary: '#D1D5DB',
  textTertiary: '#9CA3AF',
  
  // Border colors
  border: '#4B5563',
  borderLight: '#374151',
  
  // Status colors
  primary: '#ff1e1e',
  secondary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#ff1e1e',
  
  // Interactive colors
  buttonBackground: '#ff1e1e',
  buttonText: '#FFFFFF',
  buttonSecondary: '#374151',
  buttonSecondaryText: '#D1D5DB',
  
  // Shadow
  shadow: 'rgba(0, 0, 0, 0.3)',
  
  // Specific component colors
  headerBackground: '#1F2937',
  tabBarBackground: '#1F2937',
  inputBackground: '#374151',
  modalOverlay: 'rgba(0, 0, 0, 0.7)',
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load theme preference on app start
  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('isDarkMode');
      if (savedTheme !== null) {
        setIsDarkMode(JSON.parse(savedTheme));
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = async () => {
    try {
      const newTheme = !isDarkMode;
      setIsDarkMode(newTheme);
      await AsyncStorage.setItem('isDarkMode', JSON.stringify(newTheme));
      return newTheme;
    } catch (error) {
      console.error('Error saving theme preference:', error);
      throw error;
    }
  };

  const theme = isDarkMode ? darkTheme : lightTheme;

  const value = {
    isDarkMode,
    theme,
    toggleTheme,
    isLoading,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
