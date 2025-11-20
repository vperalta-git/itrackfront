import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

const UniformLoading = ({ 
  message = 'Loading...', 
  size = 'large', 
  showMessage = true,
  backgroundColor = 'rgba(0,0,0,0.5)',
  style = {} 
}) => {
  return (
    <View style={[styles.loadingContainer, { backgroundColor }, style]}>
      <View style={styles.loadingContent}>
        <Image
          source={require('../assets/loading.gif')}
          style={[
            styles.loadingGif,
            size === 'small' ? styles.smallGif : 
            size === 'medium' ? styles.mediumGif : 
            styles.largeGif
          ]}
          resizeMode="contain"
        />
        {showMessage && (
          <Text style={[
            styles.loadingText,
            size === 'small' ? styles.smallText : 
            size === 'medium' ? styles.mediumText : 
            styles.largeText
          ]}>
            {message}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingGif: {
    marginBottom: 16,
  },
  smallGif: {
    width: 40,
    height: 40,
  },
  mediumGif: {
    width: 60,
    height: 60,
  },
  largeGif: {
    width: 80,
    height: 80,
  },
  loadingText: {
    color: '#e50914',
    fontWeight: '600',
    textAlign: 'center',
  },
  smallText: {
    fontSize: 12,
  },
  mediumText: {
    fontSize: 14,
  },
  largeText: {
    fontSize: 16,
  },
});

export default UniformLoading;
