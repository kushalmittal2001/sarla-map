import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { toast } from "sonner";
import { Search, Menu, Layers, Plane, Car, Clock } from 'lucide-react';
import { Location } from '@/types/location';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import PublicRouteWall from './PublicRouteWall';

const MapControls = ({
  showFlyingRoute,
  setShowFlyingRoute,
  showDrivingRoute,
  setShowDrivingRoute
}: {
  showFlyingRoute: boolean;
  setShowFlyingRoute: (show: boolean) => void;
  showDrivingRoute: boolean;
  setShowDrivingRoute: (show: boolean) => void;
}) => {
  return (
    <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-10 bg-white/5 backdrop-blur-md rounded-lg shadow-lg p-2.5 flex items-center gap-5 border border-white/10">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowFlyingRoute(!showFlyingRoute)}
        className={`flex items-center gap-2 text-sm ${showFlyingRoute ? 'text-purple-500' : 'text-gray-400'}`}
      >
        <Plane size={14} />
        <span>Flying Route</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowDrivingRoute(!showDrivingRoute)}
        className={`flex items-center gap-2 text-sm ${showDrivingRoute ? 'text-blue-500' : 'text-gray-400'}`}
      >
        <Car size={14} />
        <span>Driving Route</span>
      </Button>
    </div>
  );
};

const TimeInfo = ({ route }: { route?: { from: Location; to: Location } }) => {
  const [times, setTimes] = useState<{ evtolTime: number; carTime: number; timeSaved: number } | null>(null);

  useEffect(() => {
    if (!route) {
      setTimes(null);
      return;
    }

    // Calculate flying time using the same method as RouteForm.tsx
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

    const flyingSpeed = 250; // km/h for eVTOL
    const timeInHours = distance / flyingSpeed;
    const flyingTime = Math.round(timeInHours * 60); // Convert to minutes

    // Calculate driving time using Google Maps API
    const calculateDrivingTime = async () => {
      if (!window.google) {
        console.error('Google Maps API not loaded');
        return;
      }

      const service = new window.google.maps.DistanceMatrixService();
      const origin = new window.google.maps.LatLng(route.from.lat, route.from.lng);
      const destination = new window.google.maps.LatLng(route.to.lat, route.to.lng);

      try {
        const response = await service.getDistanceMatrix({
          origins: [origin],
          destinations: [destination],
          travelMode: window.google.maps.TravelMode.DRIVING,
          unitSystem: window.google.maps.UnitSystem.METRIC,
        });

        if (response.rows[0].elements[0].status === 'OK') {
          const drivingTime = Math.round(response.rows[0].elements[0].duration.value / 60); // Convert seconds to minutes
          setTimes({
            evtolTime: flyingTime,
            carTime: drivingTime,
            timeSaved: drivingTime - flyingTime
          });
        }
      } catch (error) {
        console.error('Error calculating driving time:', error);
        // Fallback to a simple estimation if API fails
        const drivingSpeed = 60; // km/h for car
        const drivingTimeInHours = distance / drivingSpeed;
        const drivingTime = Math.round(drivingTimeInHours * 60);
        
        setTimes({
          evtolTime: flyingTime,
          carTime: drivingTime,
          timeSaved: drivingTime - flyingTime
        });
      }
    };

    calculateDrivingTime();
  }, [route?.from.lat, route?.from.lng, route?.to.lat, route?.to.lng]);

  if (!times || !route) return null;

  return (
    <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-10 bg-white/5 backdrop-blur-md rounded-lg shadow-lg p-3 flex items-center gap-6 border border-white/10 text-sm whitespace-nowrap">
      <div className="flex items-center gap-2 text-purple-400">
        <Plane size={14} />
        <span>{times.evtolTime}min</span>
      </div>
      <div className="flex items-center gap-2 text-red-400">
        <Car size={14} />
        <span>{times.carTime}min</span>
      </div>
      <div className="flex items-center gap-2 text-green-400">
        <Clock size={14} />
        <span>Save {times.timeSaved}min</span>
      </div>
    </div>
  );
};

interface RealMapComponentProps {
  route?: {
    from: Location;
    to: Location;
  };
}

const RealMapComponent: React.FC<RealMapComponentProps> = ({ route }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const evtolMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const start = useRef<number>(0);
  const evtolProgress = useRef<number>(0);
  const publicRoutesRef = useRef<string[]>([]);

  // Add this new function to fetch and display public routes
  const fetchAndDisplayPublicRoutes = async () => {
    if (!map.current) return;

    try {
      const { data: routes, error } = await supabase
        .from('routes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Remove existing public routes
      publicRoutesRef.current.forEach(layerId => {
        if (map.current?.getLayer(layerId)) {
          map.current.removeLayer(layerId);
        }
      });
      publicRoutesRef.current = [];

      // Filter out routes that match the current search
      const filteredRoutes = routes.filter(publicRoute => {
        if (!route) return true; // If no current route, show all public routes
        
        // Round coordinates to 6 decimal places for more precise comparison
        const roundCoord = (coord: number) => Math.round(coord * 1000000) / 1000000;
        
        const publicFromLat = roundCoord(publicRoute.from.lat);
        const publicFromLng = roundCoord(publicRoute.from.lng);
        const publicToLat = roundCoord(publicRoute.to.lat);
        const publicToLng = roundCoord(publicRoute.to.lng);
        
        const currentFromLat = roundCoord(route.from.lat);
        const currentFromLng = roundCoord(route.from.lng);
        const currentToLat = roundCoord(route.to.lat);
        const currentToLng = roundCoord(route.to.lng);

        // Check if routes are the same (in either direction)
        const isSameRoute = 
          (Math.abs(publicFromLat - currentFromLat) < 0.000001 && 
           Math.abs(publicFromLng - currentFromLng) < 0.000001 && 
           Math.abs(publicToLat - currentToLat) < 0.000001 && 
           Math.abs(publicToLng - currentToLng) < 0.000001) ||
          (Math.abs(publicFromLat - currentToLat) < 0.000001 && 
           Math.abs(publicFromLng - currentToLng) < 0.000001 && 
           Math.abs(publicToLat - currentFromLat) < 0.000001 && 
           Math.abs(publicToLng - currentFromLng) < 0.000001);

        // Return false to filter out matching routes
        return !isSameRoute;
      });

      // Add new public routes
      filteredRoutes.forEach((publicRoute, index) => {
        const layerId = `public-route-${index}`;
        const sourceId = `public-route-source-${index}`;
        const markersSourceId = `public-route-markers-${index}`;

        if (map.current?.getSource(sourceId)) {
          map.current.removeSource(sourceId);
        }
        if (map.current?.getSource(markersSourceId)) {
          map.current.removeSource(markersSourceId);
        }

        // Create curved coordinates for the public route
        const midPoint = [
          (publicRoute.from.lng + publicRoute.to.lng) / 2,
          (publicRoute.from.lat + publicRoute.to.lat) / 2
        ];
        
        const distance = Math.sqrt(
          Math.pow(publicRoute.to.lng - publicRoute.from.lng, 2) +
          Math.pow(publicRoute.to.lat - publicRoute.from.lat, 2)
        );
        const curveHeight = distance * 0.15;

        const flyingCoordinates = [];
        // Start with exact source point
        flyingCoordinates.push([publicRoute.from.lng, publicRoute.from.lat]);
        
        // Generate more points near the start and end for smoother connection
        for (let t = 0; t <= 1; t += 0.01) {
          // Use cubic interpolation for smoother curve and better endpoint precision
          const tt = t * t;
          const ttt = tt * t;
          const u = 1 - t;
          const uu = u * u;
          const uuu = uu * u;

          const lng = uuu * publicRoute.from.lng +
                     3 * uu * t * midPoint[0] +
                     3 * u * tt * midPoint[0] +
                     ttt * publicRoute.to.lng;
          const lat = uuu * publicRoute.from.lat +
                     3 * uu * t * (midPoint[1] + curveHeight) +
                     3 * u * tt * (midPoint[1] + curveHeight) +
                     ttt * publicRoute.to.lat;

          flyingCoordinates.push([lng, lat]);

          // Add extra points near the endpoints for better precision
          if (t < 0.1 || t > 0.9) {
            flyingCoordinates.push([lng, lat]);
          }
        }
        
        // Add multiple points at exact destination for better connection
        for (let i = 0; i < 3; i++) {
          flyingCoordinates.push([publicRoute.to.lng, publicRoute.to.lat]);
        }

        // Add route source
        map.current?.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: flyingCoordinates
            }
          }
        });

        // Add markers source
        map.current?.addSource(markersSourceId, {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [publicRoute.from.lng, publicRoute.from.lat]
                },
                properties: { point: 'start' }
              },
              {
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [publicRoute.to.lng, publicRoute.to.lat]
                },
                properties: { point: 'end' }
              }
            ]
          }
        });

        // Add markers
        map.current?.addLayer({
          id: `${layerId}-markers`,
          type: 'circle',
          source: markersSourceId,
          paint: {
            'circle-radius': 2.5,
            'circle-color': '#6366f1',
            'circle-opacity': 0.5,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#6366f1',
            'circle-stroke-opacity': 0.2
          }
        });

        // Add main line
        map.current?.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
            'visibility': 'visible'
          },
          paint: {
            'line-color': '#6366f1',
            'line-width': 2,
            'line-opacity': 0.3
          }
        });

        // Add background track
        map.current?.addLayer({
          id: `${layerId}-bg`,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
            'visibility': 'visible'
          },
          paint: {
            'line-color': '#6366f1',
            'line-width': 2,
            'line-opacity': 0.1
          }
        });

        // Store layer IDs in correct order
        publicRoutesRef.current.push(`${layerId}-markers`);
        publicRoutesRef.current.push(layerId);
        publicRoutesRef.current.push(`${layerId}-bg`);
      });
    } catch (error) {
      console.error('Error fetching public routes:', error);
    }
  };

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    try {
      const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
      
      if (!mapboxToken) {
        toast.error("Mapbox token not found in environment variables");
        return;
      }

      if (!mapboxToken.startsWith('pk.')) {
        toast.error("Invalid Mapbox token. Public token required.");
        return;
      }
      
      mapboxgl.accessToken = mapboxToken;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [78.9629, 20.5937], // Center of India
        zoom: 1, // Start fully zoomed out
        pitch: 0,
        bearing: 0,
        attributionControl: false // Disable default attribution control
      });

      // Add custom styles for attribution
      const style = document.createElement('style');
      style.textContent = `
        .mapboxgl-ctrl-bottom-left .mapboxgl-ctrl-attrib {
          background: rgba(255, 255, 255, 0.05) !important;
          backdrop-filter: blur(8px);
          border-radius: 8px;
          margin: 8px;
          padding: 4px 8px;
        }
        .mapboxgl-ctrl-attrib a {
          color: rgba(255, 255, 255, 0.5) !important;
          transition: color 0.2s;
        }
        .mapboxgl-ctrl-attrib a:hover {
          color: rgba(255, 255, 255, 0.8) !important;
        }
        .mapboxgl-ctrl-attrib-inner {
          font-size: 11px;
        }
      `;
      document.head.appendChild(style);

      map.current.addControl(new mapboxgl.NavigationControl({
        visualizePitch: true,
        showCompass: false
      }), 'bottom-right');

      // Add minimal attribution in custom position if needed
      map.current.addControl(new mapboxgl.AttributionControl({
        compact: true,
        customAttribution: null
      }), 'bottom-left');

      // Only do initial zoom animation when map first loads
      map.current.on('load', () => {
        if (map.current && !route) { // Only do initial zoom if there's no route
          // Initial subtle zoom animation
          map.current.easeTo({
            zoom: 2.5,
            duration: 12000, // 12 seconds for very slow animation
            easing: (t) => {
              // Custom easing function for smoother start and end
              return t * (2 - t);
            }
          });

          // Set fog for better globe visualization
          map.current.setFog({
            'color': 'rgba(12, 25, 50, 0.9)',
            'high-color': 'rgba(36, 92, 223, 0.4)',
            'horizon-blend': 0.1,
            'space-color': '#121212',
            'star-intensity': 0.6
          });

          // Remove labels and adjust layer styles
          const style = map.current.getStyle();
          if (style && style.layers) {
            style.layers.forEach(layer => {
              if (
                layer.type === 'symbol' ||
                layer.id.includes('label') ||
                layer.id.includes('place') ||
                layer.id.includes('poi')
              ) {
                map.current?.removeLayer(layer.id);
              }
              
              if (layer.id.includes('road')) {
                map.current?.setPaintProperty(layer.id, 'line-color', '#ffffff');
                map.current?.setPaintProperty(layer.id, 'line-opacity', 0.1);
              }

              if (layer.id.includes('building')) {
                map.current?.setPaintProperty(layer.id, 'fill-color', '#ffffff');
                map.current?.setPaintProperty(layer.id, 'fill-opacity', 0.05);
              }
            });
          }
        }

        // Initial fetch of public routes
        fetchAndDisplayPublicRoutes();

        // Set up interval to refresh public routes
        const intervalId = setInterval(() => {
          fetchAndDisplayPublicRoutes();  // Always refresh, the filter logic is inside fetchAndDisplayPublicRoutes
        }, 10000); // Refresh every 10 seconds

        return () => {
          clearInterval(intervalId);
        };
      });

      // Add zoom event listener for responsive sizing
      map.current.on('zoom', () => {
        if (!map.current || !route) return;
        
        const currentZoom = map.current.getZoom();
        const zoomFactor = Math.max(0.5, Math.min(1, currentZoom / 8)); // Limit the maximum scaling
        
        // Update route widths with smaller base width
        if (map.current.getLayer('flying-route')) {
          map.current.setPaintProperty('flying-route', 'line-width', 1.5 * zoomFactor);
          map.current.setPaintProperty('flying-route-bg', 'line-width', 1.5 * zoomFactor);
        }
        
        if (map.current.getLayer('driving-route')) {
          map.current.setPaintProperty('driving-route', 'line-width', 1.5 * zoomFactor);
        }
        
        // Update point markers with smaller base size
        if (map.current.getLayer('point-markers')) {
          map.current.setPaintProperty('point-markers', 'circle-radius', 3 * zoomFactor);
        }
        
        // Update eVTOL marker size
        if (evtolMarkerRef.current) {
          const evtolElement = evtolMarkerRef.current.getElement();
          if (evtolElement) {
            const size = Math.min(50, 50 * zoomFactor);
            evtolElement.style.width = `${size}px`;
            evtolElement.style.height = `${size}px`;
          }
        }
      });
    } catch (error) {
      console.error('Error initializing map:', error);
      toast.error("Error initializing map. Please check your token and try again.");
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);  // Keep this as empty dependency array

  const animateEvtol = (timestamp: number) => {
    if (!map.current || !route) return;
    
    if (!start.current) start.current = timestamp;
    const progress = (timestamp - start.current) / 10000; // 10 seconds duration
    evtolProgress.current = progress % 1;

    // Get the current point along the curved path
    const t = evtolProgress.current;
    const midPoint = [
      (route.from.lng + route.to.lng) / 2,
      (route.from.lat + route.to.lat) / 2
    ];
    
    const distance = Math.sqrt(
      Math.pow(route.to.lng - route.from.lng, 2) +
      Math.pow(route.to.lat - route.from.lat, 2)
    );
    const curveHeight = distance * 0.15;

    // Calculate current position
    const currentLng = (1 - t) * (1 - t) * route.from.lng +
                      2 * (1 - t) * t * midPoint[0] +
                      t * t * route.to.lng;
    const currentLat = (1 - t) * (1 - t) * route.from.lat +
                      2 * (1 - t) * t * (midPoint[1] + curveHeight) +
                      t * t * route.to.lat;

    // Calculate bearing for rotation
    const nextT = Math.min(1, t + 0.01);
    const nextLng = (1 - nextT) * (1 - nextT) * route.from.lng +
                   2 * (1 - nextT) * nextT * midPoint[0] +
                   nextT * nextT * route.to.lng;
    const nextLat = (1 - nextT) * (1 - nextT) * route.from.lat +
                   2 * (1 - nextT) * nextT * (midPoint[1] + curveHeight) +
                   nextT * nextT * route.to.lat;

    const bearing = getBearing(
      [currentLng, currentLat],
      [nextLng, nextLat]
    );

    evtolMarkerRef.current?.setLngLat([currentLng, currentLat])
      .setRotation(bearing);

    requestAnimationFrame(animateEvtol);
  };

  const getBearing = (start: [number, number], end: [number, number]) => {
    const startLat = start[1] * Math.PI / 180;
    const startLng = start[0] * Math.PI / 180;
    const endLat = end[1] * Math.PI / 180;
    const endLng = end[0] * Math.PI / 180;

    const y = Math.sin(endLng - startLng) * Math.cos(endLat);
    const x = Math.cos(startLat) * Math.sin(endLat) -
              Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLng - startLng);
    const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    return bearing;
  };

  const cleanupRoutes = () => {
    if (!map.current) return;

    // Cancel any ongoing animations first
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Remove layers in correct order
    ['flying-route', 'flying-route-bg', 'driving-route', 'point-markers'].forEach(layerId => {
      if (map.current?.getLayer(layerId)) {
        map.current.removeLayer(layerId);
      }
    });

    // Remove sources in correct order
    ['flying-route', 'driving-route', 'point-markers'].forEach(sourceId => {
      if (map.current?.getSource(sourceId)) {
        map.current.removeSource(sourceId);
      }
    });

    // Remove marker
    if (evtolMarkerRef.current) {
      evtolMarkerRef.current.remove();
      evtolMarkerRef.current = null;
    }

    // Reset animation references
    start.current = 0;
    evtolProgress.current = 0;
  };

  // Cleanup and add new routes when route prop changes
  useEffect(() => {
    // Clean up existing routes first
    cleanupRoutes();

    // If no map or route, just return after cleanup
    if (!map.current || !route) return;

    // Fetch and display public routes first to ensure they're filtered
    fetchAndDisplayPublicRoutes();

    const addRoute = async () => {
      try {
        // Wait for map to be fully loaded
        if (!map.current?.isStyleLoaded()) {
          await new Promise(resolve => {
            const checkStyle = () => {
              if (map.current?.isStyleLoaded()) {
                resolve(true);
              } else {
                setTimeout(checkStyle, 100);
              }
            };
            checkStyle();
          });
        }

        // Create flight path
        const midPoint = [
          (route.from.lng + route.to.lng) / 2,
          (route.from.lat + route.to.lat) / 2
        ];
        
        const distance = Math.sqrt(
          Math.pow(route.to.lng - route.from.lng, 2) +
          Math.pow(route.to.lat - route.from.lat, 2)
        );
        const curveHeight = distance * 0.15;

        const flyingCoordinates = [];
        for (let t = 0; t <= 1; t += 0.01) {
          const lng = (1 - t) * (1 - t) * route.from.lng +
                    2 * (1 - t) * t * midPoint[0] +
                    t * t * route.to.lng;
          const lat = (1 - t) * (1 - t) * route.from.lat +
                    2 * (1 - t) * t * (midPoint[1] + curveHeight) +
                    t * t * route.to.lat;
          flyingCoordinates.push([lng, lat]);
        }

        // Add sources first
        map.current.addSource('flying-route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: flyingCoordinates
            }
          },
          lineMetrics: true
        });

        // Add background track
        map.current.addLayer({
          id: 'flying-route-bg',
          type: 'line',
          source: 'flying-route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#a855f7',
            'line-width': 1.5,
            'line-opacity': 0.2
          }
        });

        // Add animated line with gradient
        map.current.addLayer({
          id: 'flying-route',
          type: 'line',
          source: 'flying-route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-width': 1.5,
            'line-gradient': [
              'interpolate',
              ['linear'],
              ['line-progress'],
              0, '#a855f7',
              0.01, '#a855f7',
              0.02, 'rgba(168, 85, 247, 0)'
            ],
            'line-opacity': 1
          }
        });

        // Create and add eVTOL marker
        const evtolElement = document.createElement('div');
        evtolElement.className = 'evtol-marker';
        evtolElement.style.width = '50px';
        evtolElement.style.height = '50px';
        evtolElement.style.backgroundImage = 'url(/evtol.png)';
        evtolElement.style.backgroundSize = 'contain';
        evtolElement.style.backgroundRepeat = 'no-repeat';
        evtolElement.style.backgroundPosition = 'center';
        evtolElement.style.filter = 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.5))';

        evtolMarkerRef.current = new mapboxgl.Marker({
          element: evtolElement,
          rotationAlignment: 'map',
          pitchAlignment: 'map'
        })
          .setLngLat([route.from.lng, route.from.lat])
          .addTo(map.current);

        // Add point markers
        map.current.addSource('point-markers', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [route.from.lng, route.from.lat]
                },
                properties: { point: 'start' }
              },
              {
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [route.to.lng, route.to.lat]
                },
                properties: { point: 'end' }
              }
            ]
          }
        });

        map.current.addLayer({
          id: 'point-markers',
          type: 'circle',
          source: 'point-markers',
          paint: {
            'circle-radius': 4,
            'circle-color': '#a855f7',
            'circle-opacity': 0.8
          }
        });

        // Add driving route
        try {
          const response = await fetch(
            `https://api.mapbox.com/directions/v5/mapbox/driving/${route.from.lng},${route.from.lat};${route.to.lng},${route.to.lat}?geometries=geojson&access_token=${import.meta.env.VITE_MAPBOX_TOKEN}`
          );
          const data = await response.json();
          
          if (data.routes && data.routes[0]) {
            const drivingCoordinates = data.routes[0].geometry.coordinates;

            map.current.addSource('driving-route', {
              type: 'geojson',
              data: {
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: drivingCoordinates
                }
              }
            });

            map.current.addLayer({
              id: 'driving-route',
              type: 'line',
              source: 'driving-route',
              layout: {
                'line-join': 'round',
                'line-cap': 'round'
              },
              paint: {
                'line-color': '#ef4444',
                'line-width': 1.5,
                'line-opacity': 0.75
              }
            });
          }
        } catch (error) {
          console.error('Error fetching driving route:', error);
          // Don't fail the whole route addition if driving route fails
        }

        // Fit bounds to include both routes
        const bounds = new mapboxgl.LngLatBounds();
        bounds.extend([route.from.lng, route.from.lat]);
        bounds.extend([route.to.lng, route.to.lat]);

        // Ensure we're still mounted and have the map
        if (map.current) {
          map.current.fitBounds(bounds, {
            padding: 100,
            duration: 2000,
            essential: true
          });
        }

        // Start animation
        start.current = 0;
        const animate = (timestamp: number) => {
          if (!map.current || !route) return;
          
          if (!start.current) start.current = timestamp;
          const progress = (timestamp - start.current) / 10000; // 10 seconds duration
          evtolProgress.current = progress % 1;

          // Get the current point along the curved path
          const t = evtolProgress.current;
          
          // Calculate current position
          const currentLng = (1 - t) * (1 - t) * route.from.lng +
                          2 * (1 - t) * t * midPoint[0] +
                          t * t * route.to.lng;
          const currentLat = (1 - t) * (1 - t) * route.from.lat +
                          2 * (1 - t) * t * (midPoint[1] + curveHeight) +
                          t * t * route.to.lat;

          // Calculate bearing for rotation
          const nextT = Math.min(1, t + 0.01);
          const nextLng = (1 - nextT) * (1 - nextT) * route.from.lng +
                       2 * (1 - nextT) * nextT * midPoint[0] +
                       nextT * nextT * route.to.lng;
          const nextLat = (1 - nextT) * (1 - nextT) * route.from.lat +
                       2 * (1 - nextT) * nextT * (midPoint[1] + curveHeight) +
                       nextT * nextT * route.to.lat;

          const bearing = getBearing(
            [currentLng, currentLat],
            [nextLng, nextLat]
          );

          // Update eVTOL position and rotation
          if (evtolMarkerRef.current) {
            evtolMarkerRef.current.setLngLat([currentLng, currentLat])
              .setRotation(bearing);
          }

          // Update line gradient to show only the traveled path
          if (map.current.getLayer('flying-route')) {
            map.current.setPaintProperty('flying-route', 'line-gradient', [
              'interpolate',
              ['linear'],
              ['line-progress'],
              0, '#a855f7', // Start of line is always visible
              Math.max(0, t - 0.01), '#a855f7', // Current position is visible
              Math.min(1, t), 'rgba(168, 85, 247, 0)' // Everything after current position is invisible
            ]);
          }

          animationFrameRef.current = requestAnimationFrame(animate);
        };

        animationFrameRef.current = requestAnimationFrame(animate);

      } catch (error) {
        console.error('Error adding route:', error);
        cleanupRoutes();
        toast.error("Error displaying route. Please try again.");
      }
    };

    addRoute();

    // Cleanup function
    return () => {
      cleanupRoutes();
    };
  }, [route]);

  return (
    <div className="fixed inset-0 z-0">
      <div ref={mapContainer} className="w-full h-full" />
      {route && (
        <TimeInfo 
          key={`${route.from.lat},${route.from.lng}-${route.to.lat},${route.to.lng}`}
          route={route}
        />
      )}
      <PublicRouteWall />
    </div>
  );
};

export default RealMapComponent;
