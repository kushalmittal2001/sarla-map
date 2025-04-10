import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

interface MapProps {
  fromLocation: { lat: number; lng: number };
  toLocation: { lat: number; lng: number };
}

const Map = ({ fromLocation, toLocation }: MapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const animation = useRef<number | null>(null);
  const markers = useRef<{ from: mapboxgl.Marker; to: mapboxgl.Marker; evtol: mapboxgl.Marker } | null>(null);

  // Function to animate eVTOL along the curved path
  const animateEvtol = (start: [number, number], end: [number, number], duration: number) => {
    const startTime = performance.now();
    const path = createCurvedPath(start, end);

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      if (progress < 1) {
        const point = path[Math.floor(progress * (path.length - 1))];
        const nextPoint = path[Math.min(Math.floor(progress * (path.length - 1)) + 1, path.length - 1)];
        
        if (markers.current?.evtol) {
          markers.current.evtol.setLngLat(point);
          const bearing = getBearing(point, nextPoint);
          markers.current.evtol.setRotation(bearing);
        }
        
        animation.current = requestAnimationFrame(animate);
      }
    };

    animation.current = requestAnimationFrame(animate);
  };

  // Function to calculate bearing between two points
  const getBearing = (start: [number, number], end: [number, number]) => {
    const startLat = start[1] * Math.PI / 180;
    const startLng = start[0] * Math.PI / 180;
    const endLat = end[1] * Math.PI / 180;
    const endLng = end[0] * Math.PI / 180;

    const y = Math.sin(endLng - startLng) * Math.cos(endLat);
    const x = Math.cos(startLat) * Math.sin(endLat) -
              Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLng - startLng);
    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360;
  };

  // Function to create a curved path between two points
  const createCurvedPath = (start: [number, number], end: [number, number]): [number, number][] => {
    const points: [number, number][] = [];
    const steps = 100;
    const height = 0.1; // Height of the curve

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const lat = start[1] + (end[1] - start[1]) * t;
      const lng = start[0] + (end[0] - start[0]) * t;
      const alt = Math.sin(t * Math.PI) * height;
      points.push([lng, lat + alt]);
    }

    return points;
  };

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [fromLocation.lng, fromLocation.lat],
      zoom: 12
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl());

    // Create markers
    const fromMarker = new mapboxgl.Marker({ color: '#3FB1CE' })
      .setLngLat([fromLocation.lng, fromLocation.lat])
      .addTo(map.current);

    const toMarker = new mapboxgl.Marker({ color: '#FF6B6B' })
      .setLngLat([toLocation.lng, toLocation.lat])
      .addTo(map.current);

    // Create eVTOL marker with custom icon
    const evtolMarker = new mapboxgl.Marker({
      element: createEvtolIcon(),
      anchor: 'center',
      rotationAlignment: 'map'
    })
      .setLngLat([fromLocation.lng, fromLocation.lat])
      .addTo(map.current);

    markers.current = { from: fromMarker, to: toMarker, evtol: evtolMarker };

    // Create flight path
    const flightPath = createCurvedPath(
      [fromLocation.lng, fromLocation.lat],
      [toLocation.lng, toLocation.lat]
    );

    // Add flight path to map
    map.current.on('load', () => {
      if (!map.current) return;

      map.current.addSource('flight-path', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: flightPath
          }
        }
      });

      map.current.addLayer({
        id: 'flight-path',
        type: 'line',
        source: 'flight-path',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#3FB1CE',
          'line-width': 3,
          'line-dasharray': [2, 1]
        }
      });

      // Start animation
      animateEvtol(
        [fromLocation.lng, fromLocation.lat],
        [toLocation.lng, toLocation.lat],
        10000 // 10 seconds duration
      );
    });

    // Cleanup
    return () => {
      if (animation.current) {
        cancelAnimationFrame(animation.current);
      }
      if (map.current) {
        map.current.remove();
      }
    };
  }, [fromLocation, toLocation]);

  // Function to create eVTOL icon
  const createEvtolIcon = () => {
    const el = document.createElement('div');
    el.className = 'evtol-marker';
    el.style.width = '30px';
    el.style.height = '30px';
    el.style.backgroundImage = 'url(/evtol-icon.png)';
    el.style.backgroundSize = 'contain';
    el.style.backgroundRepeat = 'no-repeat';
    return el;
  };

  return (
    <div className="map-container">
      <div ref={mapContainer} className="map" style={{ width: '100%', height: '100vh' }} />
    </div>
  );
};

export default Map; 