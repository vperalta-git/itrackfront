import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🚨 App Error Caught:', error);
    console.error('🚨 Error Info:', errorInfo);
    
    this.setState({
      hasError: true,
      errorInfo: {
        error: error.toString(),
        stack: error.stack,
        componentStack: errorInfo.componentStack
      }
    });

    // Log to crash analytics if available
    // You could send this to Firebase Crashlytics or similar service
  }

  handleRestart = () => {
    this.setState({ hasError: false, errorInfo: null });
  };

  handleShowDetails = () => {
    const { errorInfo } = this.state;
    if (errorInfo) {
      Alert.alert(
        'Error Details',
        `Error: ${errorInfo.error}\n\nThis information can help developers fix the issue.`,
        [{ text: 'OK' }]
      );
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.errorCard}>
            <Text style={styles.title}>Oops! Something went wrong</Text>
            <Text style={styles.message}>
              The app encountered an unexpected error. This usually happens due to:
              {'\n'}• Network connection issues
              {'\n'}• Outdated app version
              {'\n'}• Temporary server problems
            </Text>
            
            <TouchableOpacity style={styles.button} onPress={this.handleRestart}>
              <Text style={styles.buttonText}>🔄 Try Again</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.secondaryButton]} 
              onPress={this.handleShowDetails}
            >
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                📋 Show Details
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorCard: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#CB1E2A',
    marginBottom: 15,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 25,
  },
  button: {
    backgroundColor: '#CB1E2A',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 10,
    width: '100%',
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#CB1E2A',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#CB1E2A',
  },
});

export default ErrorBoundary;