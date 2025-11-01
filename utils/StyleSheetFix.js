/**
 * Global StyleSheet Fix for React Native JSC Compatibility
 * 
 * This file should be imported BEFORE any React Native components
 * to ensure StyleSheet compatibility across the entire app
 */

// Import the original React Native StyleSheet
let OriginalStyleSheet;
try {
  OriginalStyleSheet = require('react-native').StyleSheet;
} catch (error) {
  console.warn('Could not import original StyleSheet:', error);
}

// Enhanced StyleSheet polyfill with full React Native compatibility
const StyleSheetPolyfill = {
  // Main create method with enhanced error handling
  create(styles) {
    if (!styles || typeof styles !== 'object') {
      console.warn('StyleSheet.create: styles must be an object');
      return {};
    }

    try {
      // If original StyleSheet is available and working, use it
      if (OriginalStyleSheet && OriginalStyleSheet.create) {
        try {
          return OriginalStyleSheet.create(styles);
        } catch (originalError) {
          console.warn('Original StyleSheet failed, using polyfill:', originalError.message);
          // Fall through to polyfill
        }
      }

      // Polyfill implementation
      const processedStyles = {};
      Object.keys(styles).forEach(key => {
        const styleObject = styles[key];
        if (styleObject && typeof styleObject === 'object') {
          processedStyles[key] = this._processStyle(styleObject);
        } else {
          processedStyles[key] = styleObject;
        }
      });

      return processedStyles;
    } catch (error) {
      console.error('StyleSheet.create failed:', error);
      // Return original styles as fallback
      return styles;
    }
  },

  // Process individual style objects
  _processStyle(style) {
    if (!style || typeof style !== 'object') {
      return style;
    }

    const processed = {};
    Object.keys(style).forEach(property => {
      const value = style[property];
      processed[property] = this._normalizeValue(property, value);
    });

    return processed;
  },

  // Normalize style values for compatibility
  _normalizeValue(property, value) {
    // Handle transform arrays
    if (property === 'transform' && Array.isArray(value)) {
      return value.map(transform => {
        if (transform && typeof transform === 'object') {
          return transform;
        }
        return transform;
      });
    }

    // Handle shadow offset objects
    if ((property === 'shadowOffset' || property === 'textShadowOffset') && 
        value && typeof value === 'object' && 
        typeof value.width === 'number' && typeof value.height === 'number') {
      return { width: value.width, height: value.height };
    }

    return value;
  },

  // Flatten style arrays - compatible with React Native
  flatten(style) {
    if (!style) {
      return {};
    }

    if (Array.isArray(style)) {
      const result = {};
      style.forEach(s => {
        if (s && typeof s === 'object') {
          Object.assign(result, this.flatten(s));
        }
      });
      return result;
    }

    if (typeof style === 'object') {
      return style;
    }

    return {};
  },

  // Compose styles - compatible with React Native
  compose(style1, style2) {
    if (!style1 && !style2) return null;
    if (!style1) return style2;
    if (!style2) return style1;
    return [style1, style2];
  },

  // Static properties for React Native compatibility
  get absoluteFillObject() {
    return {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    };
  },

  get absoluteFill() {
    return this.absoluteFillObject;
  },

  get hairlineWidth() {
    return 0.5;
  },

  // Compatibility methods
  setStyleAttributePreprocessor(property, processor) {
    console.warn('StyleSheet.setStyleAttributePreprocessor is deprecated');
  }
};

// Replace global StyleSheet if needed
if (typeof global !== 'undefined') {
  // Override React Native's StyleSheet in the global scope
  const originalReactNative = global.__react_native__;
  if (originalReactNative && originalReactNative.StyleSheet) {
    console.log('Overriding global StyleSheet for compatibility');
    originalReactNative.StyleSheet = StyleSheetPolyfill;
  }
}

// Override require cache for react-native StyleSheet
if (typeof require !== 'undefined' && require.cache) {
  Object.keys(require.cache).forEach(key => {
    if (key.includes('react-native') && require.cache[key].exports && require.cache[key].exports.StyleSheet) {
      console.log('Overriding cached StyleSheet:', key);
      require.cache[key].exports.StyleSheet = StyleSheetPolyfill;
    }
  });
}

export default StyleSheetPolyfill;
export { StyleSheetPolyfill as StyleSheet };