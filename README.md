# Live Logistics Map

A simple Leaflet-based map that allows drawing routes and tagging them. The page also shows logistics, supply chain, and port news headlines from up to fifteen reliable RSS sources, refreshing every six hours.

## Usage

Open `index.html` in a web browser. Use the polyline tool to draw routes. When a route is created, you'll be prompted to enter tags. Tags are stored with the line and shown in a popup.



Hover over the animated logo in the top-left corner to play its breaking-news animation.

## Building a Windows executable

An Electron wrapper lets the map run as a Windows `.exe` that can fetch online tiles and RSS feeds.

1. Install dependencies (requires internet access):

   ```bash
   npm install
   ```

2. Create the installer:



   The generated files appear in the `dist/` folder. Use `npm start` for development.

### Alternative packaging with Nativefier

If installing Electron dependencies is not possible, you can wrap the web app into a Windows executable using [Nativefier](https://github.com/nativefier/nativefier).

1. Install Nativefier:

   ```bash
   npm install -g nativefier
   ```

2. Generate the `.exe` directly from `index.html`:

   ```bash
   nativefier --name "Live Logistics Map" --platform windows index.html
   ```

   The resulting folder will contain a portable executable that opens the map with full internet access.

## Credits

