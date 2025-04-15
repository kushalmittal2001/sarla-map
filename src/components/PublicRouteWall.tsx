import React, { useEffect, useState, useRef } from 'react';
import { Plane, Clock, MapPin, X, ArrowRight, Timer } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface PublicRoute {
  id: string;
  from: {
    lat: number;
    lng: number;
    name: string;
  };
  to: {
    lat: number;
    lng: number;
    name: string;
  };
  created_at: string;
  duration: number;
  time_saved: number;
  popularity: number;
}

interface PublicRouteWallProps {
  isOpen: boolean;
  onClose: () => void;
  onRouteSelect: (route: PublicRoute) => void;
}

const PublicRouteWall: React.FC<PublicRouteWallProps> = ({ isOpen, onClose, onRouteSelect }) => {
  const [routes, setRoutes] = useState<PublicRoute[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: publicRoutes, isLoading, error, refetch } = useQuery({
    queryKey: ['publicRoutes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(4);

      if (error) throw error;

      // Calculate time saved for each route
      const routesWithTimeSaved = data.map((route) => {
        // Calculate flying time (already stored in duration)
        const flyingTime = route.duration;

        // Calculate driving time based on distance
        const R = 6371; // Earth's radius in km
        const lat1 = (route.from.lat * Math.PI) / 180;
        const lat2 = (route.to.lat * Math.PI) / 180;
        const deltaLat = ((route.to.lat - route.from.lat) * Math.PI) / 180;
        const deltaLng = ((route.to.lng - route.from.lng) * Math.PI) / 180;

        const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
                  Math.cos(lat1) * Math.cos(lat2) *
                  Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = Math.round(R * c); // Distance in km

        // Calculate driving time using average speed of 60 km/h
        const drivingTime = Math.round((distance / 60) * 60); // Convert to minutes
        const timeSaved = Math.max(0, drivingTime - flyingTime); // Ensure time saved is not negative

        return {
          ...route,
          time_saved: timeSaved
        };
      });

      return routesWithTimeSaved;
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  useEffect(() => {
    if (publicRoutes) {
      setRoutes(publicRoutes);
      // Scroll to top when new routes are added
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
    }
  }, [publicRoutes]);

  const handleRouteSelect = async (route: PublicRoute) => {
    try {
      // Increment popularity
      const { error: updateError } = await supabase
        .from('routes')
        .update({ popularity: (route.popularity || 0) + 1 })
        .eq('id', route.id);

      if (updateError) {
        console.error('Error updating route popularity:', updateError);
        toast.error('Failed to update route popularity');
        return;
      }

      // Call the parent's onRouteSelect and close
      onRouteSelect(route);
      onClose();

      // Refetch routes to update the UI
      refetch();
    } catch (error) {
      console.error('Error in handleRouteSelect:', error);
      toast.error('Failed to update route');
    }
  };

  if (error) {
    console.error('Error fetching public routes:', error);
    return null;
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Popup */}
      <div className="relative w-full max-w-md bg-white/5 backdrop-blur-md rounded-lg shadow-lg border border-white/10 animate-in fade-in-50 slide-in-from-bottom-10 duration-300">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white">Recent Routes</h3>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div 
          ref={containerRef}
          className="p-4 space-y-3 max-h-[60vh] overflow-y-auto scroll-smooth"
        >
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-16 bg-white/10 rounded-lg"></div>
              <div className="h-16 bg-white/10 rounded-lg"></div>
              <div className="h-16 bg-white/10 rounded-lg"></div>
            </div>
          ) : routes.length === 0 ? (
            <div className="text-white/60 text-center py-4">No recent routes found</div>
          ) : (
            routes.map((route) => (
              <div 
                key={route.id} 
                className="bg-white/5 rounded-lg p-3 border border-white/10 animate-in fade-in-50 slide-in-from-bottom-10 cursor-pointer hover:bg-white/10 transition-colors"
                onClick={() => handleRouteSelect(route)}
              >
                <div className="flex items-center gap-2 text-sm text-white/80">
                  <MapPin className="w-4 h-4 text-blue-400" />
                  <span className="truncate max-w-[150px]">{route.from.name.split(',')[0]}</span>
                  <ArrowRight className="w-4 h-4 text-white/40" />
                  <MapPin className="w-4 h-4 text-red-400" />
                  <span className="truncate max-w-[150px]">{route.to.name.split(',')[0]}</span>
                </div>
                <div className="flex items-center gap-3 mt-2 text-sm text-white/60">
                  <div className="flex items-center gap-1">
                    <Plane size={14} />
                    <span>{route.duration} min</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Timer size={14} className="text-white/60" />
                    <span>Save {route.time_saved} min</span>
                  </div>
                  <div className="flex items-center gap-1 ml-auto">
                    <Clock size={14} />
                    <span>{formatDistanceToNow(new Date(route.created_at))} ago</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicRouteWall; 