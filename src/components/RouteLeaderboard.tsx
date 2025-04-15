import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Trophy, MapPin, ArrowRight, Clock, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface Route {
  id: string;
  from: {
    name: string;
    lat: number;
    lng: number;
  };
  to: {
    name: string;
    lat: number;
    lng: number;
  };
  popularity: number;
  created_at: string;
}

interface RouteLeaderboardProps {
  onRouteSelect?: (route: Route) => void;
  onClose?: () => void;
}

export default function RouteLeaderboard({ onRouteSelect, onClose }: RouteLeaderboardProps) {
  const { data: routes, isLoading, error } = useQuery({
    queryKey: ['popularRoutes'],
    queryFn: async () => {
      // First try to get popular routes (popularity > 0)
      let { data: popularRoutes, error: popularError } = await supabase
        .from('routes')
        .select('*')
        .gt('popularity', 0)
        .order('popularity', { ascending: false })
        .limit(3);

      if (popularError) throw popularError;

      // If no popular routes, get recent routes instead
      if (!popularRoutes?.length) {
        const { data: recentRoutes, error: recentError } = await supabase
          .from('routes')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(3);

        if (recentError) throw recentError;
        return recentRoutes || [];
      }
      return popularRoutes;
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  if (error) {
    console.error('Error fetching routes:', error);
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="animate-pulse space-y-4">
          <div className="h-16 bg-white/10 rounded-lg"></div>
          <div className="h-16 bg-white/10 rounded-lg"></div>
          <div className="h-16 bg-white/10 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {routes?.map((route, index) => (
        <div 
          key={route.id}
          className="bg-white/5 rounded-lg p-3 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer animate-in fade-in-50 slide-in-from-bottom-10"
          onClick={() => {
            onRouteSelect?.(route);
            onClose?.();
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 flex items-center justify-center bg-white/10 rounded-full">
                <span className="text-sm font-medium">{index + 1}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-white/80">
                <MapPin className="w-4 h-4 text-blue-400" />
                <span className="truncate max-w-[150px]">{route.from.name.split(',')[0]}</span>
                <ArrowRight className="w-4 h-4 text-white/40" />
                <MapPin className="w-4 h-4 text-red-400" />
                <span className="truncate max-w-[150px]">{route.to.name.split(',')[0]}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {route.popularity > 0 ? (
                <div className="flex items-center gap-1 group relative">
                  <Search className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium">{route.popularity}</span>
                  <div className="absolute -top-8 left-0 bg-white/10 text-white/80 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    Popularity
                  </div>
                </div>
              ) : (
                <Clock className="w-4 h-4 text-gray-400" />
              )}
            </div>
          </div>
        </div>
      ))}
      
      {routes?.length === 0 && (
        <div className="text-center text-gray-400 py-4">
          No routes available
        </div>
      )}
    </div>
  );
} 