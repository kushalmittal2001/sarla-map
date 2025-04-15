import React, { useState } from 'react';
import RealMapComponent from '@/components/RealMapComponent';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Menu, MapPin, Compass, History, Bookmark, Clock, X, Trophy, Plane } from 'lucide-react';
import RouteForm from '@/components/RouteForm';
import { Location } from '@/types/location';
import PublicRouteWall from '@/components/PublicRouteWall';
import RouteLeaderboard from '@/components/RouteLeaderboard';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const [showRouteForm, setShowRouteForm] = useState(false);
  const [selectedLocations, setSelectedLocations] = useState<{ from: Location | null; to: Location | null }>({
    from: null,
    to: null
  });
  const [showRoute, setShowRoute] = useState(false);
  const [isPublicRouteWallOpen, setIsPublicRouteWallOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLocationSelect = (from: Location | null, to: Location | null) => {
    setSelectedLocations({ from, to });
  };

  const handlePlanRoute = (from: Location, to: Location) => {
    setSelectedLocations({ from, to });
    setShowRoute(true);
    setShowRouteForm(false);
  };

  const handleRouteSelect = (route: any) => {
    if (route.from && route.to) {
      setSelectedLocations({
        from: route.from,
        to: route.to
      });
      setShowRoute(true);
    }
  };

  const handleSearchClick = () => {
    setIsLoading(true);
    setShowRouteForm(true);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-sky-900 to-sky-950 text-white">
      {/* Background map - full screen */}
      <RealMapComponent route={showRoute && selectedLocations.from && selectedLocations.to ? {
        from: selectedLocations.from,
        to: selectedLocations.to
      } : undefined} />
      
      {/* Top navigation bar */}
      <div className="fixed top-0 left-0 right-0 p-3 z-10 flex gap-3 items-center">
        {/* Search bar */}
        <div className="relative w-full">
          <div 
            className="bg-white/5 backdrop-blur-md rounded-full border border-white/10 transition-all duration-200 shadow-lg cursor-pointer hover:bg-white/10"
            onClick={handleSearchClick}
          >
            <div className="flex items-center px-3 sm:px-4 py-1.5 sm:py-2">
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin mr-2 sm:mr-3" />
              ) : (
                <Search size={16} className="text-gray-400 mr-2 sm:mr-3 flex-shrink-0" />
              )}
              <Input
                placeholder={isLoading ? "Loading..." : "Plan Your Future Flight with Sarla Aviation"} 
                className="bg-transparent border-none h-7 sm:h-8 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-gray-400 pointer-events-none text-white text-sm sm:text-base truncate"
                readOnly
              />
              <img 
                src="/jn-logo.png" 
                alt="JN Logo" 
                className="w-5 h-5 sm:w-6 sm:h-6 ml-2 sm:ml-3 object-contain filter brightness-0 invert flex-shrink-0"
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Route Form Dialog */}
      {showRouteForm && (
        <div className="fixed inset-0 bg-black/50 z-20 flex items-center justify-center p-4">
          <div className="bg-white/5 backdrop-blur-md rounded-xl w-full max-w-md p-4 border border-white/10 animate-in slide-in-from-bottom-10 duration-300">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-white">Take Flight with Sarla</h2>
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={() => {
                  setShowRouteForm(false);
                  setIsLoading(false);
                }} 
                className="text-white hover:bg-white/10"
              >
                <X size={20} />
              </Button>
            </div>
            <RouteForm 
              onLocationSelect={handleLocationSelect} 
              onPlanRoute={(from, to) => {
                handlePlanRoute(from, to);
                setIsLoading(false);
              }} 
            />
          </div>
        </div>
      )}
      
      {/* Bottom nav buttons */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-10 bg-white/5 backdrop-blur-md rounded-full shadow-lg p-1.5 flex items-center gap-1 border border-white/10">
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full w-14 h-14 flex flex-col gap-1 items-center justify-center text-white hover:bg-white/10 transition-all duration-200"
          onClick={() => setIsPublicRouteWallOpen(true)}
        >
          <Clock size={20} />
          <span className="text-[10px] font-medium">Recent</span>
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full w-14 h-14 flex flex-col gap-1 items-center justify-center text-white hover:bg-white/10 transition-all duration-200"
          onClick={() => setIsLeaderboardOpen(true)}
        >
          <Trophy size={20} />
          <span className="text-[10px] font-medium">Popular</span>
        </Button>
      </div>

      {/* Public Route Wall Popup */}
      <PublicRouteWall 
        isOpen={isPublicRouteWallOpen}
        onClose={() => setIsPublicRouteWallOpen(false)}
        onRouteSelect={handleRouteSelect}
      />

      {/* Leaderboard Popup */}
      <LeaderboardPopup 
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        onRouteSelect={handleRouteSelect}
      />
    </div>
  );
};

// Separate LeaderboardPopup component for better organization
const LeaderboardPopup = ({ 
  isOpen, 
  onClose, 
  onRouteSelect 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onRouteSelect: (route: any) => void;
}) => {
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
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <h3 className="text-lg font-semibold text-white">Popular Routes</h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4">
          <RouteLeaderboard 
            onRouteSelect={onRouteSelect}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;



