import React, { useState } from 'react';
import RealMapComponent from '@/components/RealMapComponent';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Menu, MapPin, Compass, History, Bookmark } from 'lucide-react';
import RouteForm from '@/components/RouteForm';
import { Location } from '@/types/location';

const Index = () => {
  const [showRouteForm, setShowRouteForm] = useState(false);
  const [selectedLocations, setSelectedLocations] = useState<{ from: Location | null; to: Location | null }>({
    from: null,
    to: null
  });
  const [showRoute, setShowRoute] = useState(false);

  const handleLocationSelect = (from: Location | null, to: Location | null) => {
    setSelectedLocations({ from, to });
  };

  const handlePlanRoute = (from: Location, to: Location) => {
    setSelectedLocations({ from, to });
    setShowRoute(true);
    setShowRouteForm(false);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background map - full screen */}
      <RealMapComponent route={showRoute && selectedLocations.from && selectedLocations.to ? {
        from: selectedLocations.from,
        to: selectedLocations.to
      } : undefined} />
      
      {/* Top navigation bar */}
      <div className="fixed top-0 left-0 right-0 p-3 z-10 flex gap-3 items-center">
        <Button size="icon" variant="ghost" className="bg-white/5 backdrop-blur-md rounded-full h-10 w-10 flex-shrink-0 border border-white/10">
          <Menu size={20} className="text-white" />
        </Button>
        
        {/* Search bar */}
        <div className="relative flex-grow">
          <div 
            className="bg-white/5 backdrop-blur-md rounded-full border border-white/10 transition-all duration-200 shadow-lg cursor-pointer"
            onClick={() => setShowRouteForm(true)}
          >
            <div className="flex items-center px-4 py-2">
              <Search size={20} className="text-gray-400 mr-2" />
              <Input 
                placeholder="Plan Your Future Flight with Sarla Aviation" 
                className="bg-transparent border-none h-8 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-gray-400 pointer-events-none text-white"
                readOnly
              />
              <img 
                src="/jn-logo.png" 
                alt="JN Logo" 
                className="w-5 h-5 ml-2 object-contain filter brightness-0 invert"
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Route Form Dialog */}
      {showRouteForm && (
        <div className="fixed inset-0 bg-black/50 z-20 flex items-center justify-center p-4">
          <div className="bg-white/5 backdrop-blur-md rounded-xl w-full max-w-md p-4 border border-white/10">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-white">Take Flight with Sarla</h2>
              <Button size="icon" variant="ghost" onClick={() => setShowRouteForm(false)} className="text-white hover:bg-white/10">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                </svg>
              </Button>
            </div>
            <RouteForm onLocationSelect={handleLocationSelect} onPlanRoute={handlePlanRoute} />
          </div>
        </div>
      )}
      
      {/* Bottom nav buttons */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-10 bg-white/5 backdrop-blur-md rounded-lg gap-3 shadow-lg p-1 flex items-center border border-white/10">
        <Button variant="ghost" size="icon" className="rounded-lg w-12 h-12 flex flex-col gap-1 items-center justify-center text-white hover:bg-white/10">
          <Bookmark size={18} />
          <span className="text-[10px]">Saved</span>
        </Button>
        <Button variant="ghost" size="icon" className="rounded-lg w-12 h-12 flex flex-col gap-1 items-center justify-center text-white hover:bg-white/10">
          <History size={18} />
          <span className="text-[10px]">Recents</span>
        </Button>
        <Button variant="ghost" size="icon" className="rounded-lg w-12 h-12 flex flex-col gap-1 items-center justify-center text-white hover:bg-white/10">
          <Compass size={18} />
          <span className="text-[10px]">Explore</span>
        </Button>
      </div>
    </div>
  );
};

export default Index;



