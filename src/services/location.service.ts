import * as Location from 'expo-location';
import { LOCATION_CONFIG } from '@/config/constants';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

class LocationService {
  private static instance: LocationService;

  private constructor() {}

  public static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  /**
   * Request location permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  /**
   * Get current GPS location
   */
  async getCurrentLocation(): Promise<LocationCoordinates | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.warn('Location permission not granted');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  /**
   * Get location with retry logic
   */
  async getCurrentLocationWithRetry(maxRetries = 3): Promise<LocationCoordinates | null> {
    for (let i = 0; i < maxRetries; i++) {
      const location = await this.getCurrentLocation();
      if (location) {
        return location;
      }
      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    return null;
  }

  /**
   * Format coordinates for display
   */
  formatCoordinates(coords: LocationCoordinates): string {
    return `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
  }

  /**
   * Get Google Maps link for coordinates
   */
  getGoogleMapsLink(coords: LocationCoordinates): string {
    return `https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`;
  }
}

export default LocationService.getInstance();
