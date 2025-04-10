import React, { useState, useRef, useEffect } from 'react';
import { Location } from '@/types/location';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MapPin, X, Clock, Car, Plane } from 'lucide-react';

// @ts-ignore
declare global {
  interface Window {
    google: any;
  }
}

interface RouteFormProps {
  onLocationSelect: (from: Location | null, to: Location | null) => void;
  onPlanRoute: (from: Location, to: Location) => void;
}

interface TimeComparison {
  flyingMinutes: number;
  cabMinutes: number;
  timeSaved: number;
}

const RouteForm: React.FC<RouteFormProps> = ({ onLocationSelect, onPlanRoute }) => {
  const [fromLocation, setFromLocation] = useState<Location | null>(null);
  const [toLocation, setToLocation] = useState<Location | null>(null);
  const [timeComparison, setTimeComparison] = useState<TimeComparison | null>(null);
  const [showTimeComparison, setShowTimeComparison] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const fromInputRef = useRef<HTMLInputElement>(null);
  const toInputRef = useRef<HTMLInputElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Calculate flying time (eVTOL speed of 250 km/h)
  const calculateFlyingTime = (from: Location, to: Location): { distance: number; flyingTime: number } => {
    const R = 6371; // Earth's radius in km
    const lat1 = (from.lat * Math.PI) / 180;
    const lat2 = (to.lat * Math.PI) / 180;
    const deltaLat = ((to.lat - from.lat) * Math.PI) / 180;
    const deltaLng = ((to.lng - from.lng) * Math.PI) / 180;

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = Math.round(R * c); // Distance in km

    const flyingSpeed = 250; // km/h for eVTOL
    const timeInHours = distance / flyingSpeed;
    return {
      distance,
      flyingTime: Math.round(timeInHours * 60) // Convert to minutes
    };
  };

  // Calculate cab time using Google Maps Distance Matrix Service
  const calculateCabTime = async (from: Location, to: Location): Promise<number | null> => {
    if (!window.google) return null;

    const service = new window.google.maps.DistanceMatrixService();
    const origin = new window.google.maps.LatLng(from.lat, from.lng);
    const destination = new window.google.maps.LatLng(to.lat, to.lng);

    try {
      const response = await service.getDistanceMatrix({
        origins: [origin],
        destinations: [destination],
        travelMode: window.google.maps.TravelMode.DRIVING,
        unitSystem: window.google.maps.UnitSystem.METRIC,
      });

      if (response.rows[0].elements[0].status === 'OK') {
        const duration = response.rows[0].elements[0].duration;
        return Math.round(duration.value / 60); // Convert seconds to minutes
      }
    } catch (error) {
      console.error('Error calculating cab time:', error);
    }
    return null;
  };

  const updateTimeComparison = async (from: Location, to: Location) => {
    try {
      setIsCalculating(true);
      const { distance: calculatedDistance, flyingTime: calculatedFlyingTime } = calculateFlyingTime(from, to);
      const cabMinutes = await calculateCabTime(from, to);
      
      if (cabMinutes !== null) {
        const newTimeComparison = {
          flyingMinutes: calculatedFlyingTime,
          cabMinutes,
          timeSaved: cabMinutes - calculatedFlyingTime
        };
        setTimeComparison(newTimeComparison);
        setShowTimeComparison(true);
      } else {
        console.error('Failed to calculate driving time');
        setShowTimeComparison(false);
      }
    } catch (error) {
      console.error('Error updating time comparison:', error);
      setShowTimeComparison(false);
    } finally {
      setIsCalculating(false);
    }
  };

  useEffect(() => {
    // Load Google Maps Places script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (!scriptLoaded || !fromInputRef.current || !toInputRef.current) return;

    let fromAutocomplete: google.maps.places.Autocomplete;
    let toAutocomplete: google.maps.places.Autocomplete;

    try {
      fromAutocomplete = new window.google.maps.places.Autocomplete(fromInputRef.current, {
        types: ['geocode', 'establishment'],
        componentRestrictions: { country: 'in' },
        fields: ['formatted_address', 'geometry', 'name']
      });

      toAutocomplete = new window.google.maps.places.Autocomplete(toInputRef.current, {
        types: ['geocode', 'establishment'],
        componentRestrictions: { country: 'in' },
        fields: ['formatted_address', 'geometry', 'name']
      });

      const handleFromPlaceSelect = () => {
        const place = fromAutocomplete.getPlace();
        if (place && place.geometry && place.geometry.location) {
          const location = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            name: place.name || place.formatted_address || 'Selected Location'
          };
          setFromLocation(location);
          if (toLocation) {
            updateTimeComparison(location, toLocation);
          }
          onLocationSelect(location, toLocation);
        }
      };

      const handleToPlaceSelect = () => {
        const place = toAutocomplete.getPlace();
        if (place && place.geometry && place.geometry.location) {
          const location = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            name: place.name || place.formatted_address || 'Selected Location'
          };
          setToLocation(location);
          if (fromLocation) {
            updateTimeComparison(fromLocation, location);
          }
          onLocationSelect(fromLocation, location);
        }
      };

      // Add event listeners with touch support
      fromAutocomplete.addListener('place_changed', handleFromPlaceSelect);
      toAutocomplete.addListener('place_changed', handleToPlaceSelect);

      // Add touch event listeners for better mobile support
      fromInputRef.current.addEventListener('touchend', handleFromPlaceSelect);
      toInputRef.current.addEventListener('touchend', handleToPlaceSelect);

      // Clear comparison when component mounts
      setTimeComparison(null);
      setShowTimeComparison(false);

      return () => {
        if (window.google?.maps?.event) {
          window.google.maps.event.clearInstanceListeners(fromAutocomplete);
          window.google.maps.event.clearInstanceListeners(toAutocomplete);
        }
        // Clean up touch event listeners
        fromInputRef.current?.removeEventListener('touchend', handleFromPlaceSelect);
        toInputRef.current?.removeEventListener('touchend', handleToPlaceSelect);
      };
    } catch (error) {
      console.error('Error initializing autocomplete:', error);
    }
  }, [scriptLoaded, fromLocation, toLocation, onLocationSelect]);

  const handlePlanRoute = () => {
    if (fromLocation && toLocation) {
      onPlanRoute(fromLocation, toLocation);
    }
  };

  return (
    <form className="space-y-4" onKeyDown={(e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
      }
    }}>
      <div className="space-y-2">
        <label className="text-sm font-medium text-white">From</label>
        <input
          ref={fromInputRef}
          type="text"
          placeholder="Enter starting location"
          className="w-full p-2 rounded bg-white/5 border border-white/10 text-white placeholder:text-white/50 text-base"
          style={{ fontSize: '16px' }}
          inputMode="text"
          autoComplete="off"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-white">To</label>
        <input
          ref={toInputRef}
          type="text"
          placeholder="Enter destination"
          className="w-full p-2 rounded bg-white/5 border border-white/10 text-white placeholder:text-white/50 text-base"
          style={{ fontSize: '16px' }}
          inputMode="text"
          autoComplete="off"
        />
      </div>

      {isCalculating && (
        <div className="text-white text-center py-2">
          Calculating time comparison...
        </div>
      )}

      {showTimeComparison && timeComparison && !isCalculating && (
        <div className="relative">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative bg-black/30 backdrop-blur-sm rounded-lg p-4 space-y-3 border border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plane className="text-white" size={20} />
                <span className="text-white">Flying Time</span>
              </div>
              <span className="text-white font-medium">{timeComparison.flyingMinutes} minutes</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Car className="text-white" size={20} />
                <span className="text-white">Driving Time</span>
              </div>
              <span className="text-white font-medium">{timeComparison.cabMinutes} minutes</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <div className="flex items-center gap-2">
                <Clock className="text-white" size={20} />
                <span className="text-white">Time Saved</span>
              </div>
              <span className="text-green-400 font-medium">{timeComparison.timeSaved} minutes</span>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handlePlanRoute}
        disabled={!fromLocation || !toLocation}
        className={`w-full py-2 px-4 rounded-lg font-medium transition-all duration-200 ${
          !fromLocation || !toLocation
            ? 'bg-white/10 text-white/50 cursor-not-allowed'
            : 'bg-white text-black hover:bg-white/90'
        }`}
      >
        Let's Take Off!
      </button>
    </form>
  );
};

export default RouteForm;
