# Sarla Aviation Route Planner

An interactive eVTOL route planning application for Sarla Aviation that visualizes and compares air taxi routes with traditional road transportation.

## Features

- Interactive 3D map visualization
- eVTOL route planning with animated flight paths
- Comparison with traditional road routes
- Real-time time savings calculation
- Address autocomplete for Indian locations
- Responsive design for all devices

## Setup

1. Clone the repository:
```bash
git clone https://github.com/kushalmittal2001/sarla-map.git
cd sarla-map
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory and add your API keys:
```bash
cp .env.example .env
```
Then edit `.env` and add your actual API keys.

4. Start the development server:
```bash
npm run dev
```

## Environment Variables

The following environment variables are required:

- `VITE_MAPBOX_TOKEN`: Your Mapbox access token
- `VITE_GOOGLE_MAPS_API_KEY`: Your Google Maps API key

## Deployment

### Deploy to Vercel (Recommended)

1. Fork this repository
2. Go to [Vercel](https://vercel.com)
3. Create a new project and import your forked repository
4. Add your environment variables in the Vercel project settings
5. Deploy!

### Manual Deployment

1. Build the project:
```bash
npm run build
```

2. The built files will be in the `dist` directory, which you can deploy to any static hosting service.

## Technologies Used

- React + TypeScript
- Vite
- Mapbox GL JS
- Google Maps API
- Tailwind CSS
- Shadcn UI

## License

Copyright © 2024 Sarla Aviation. All rights reserved.
