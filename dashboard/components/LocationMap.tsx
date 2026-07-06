"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface MapPoint {
  lat: number;
  lng: number;
}

interface LocationMapProps {
  home: MapPoint | null;
  work: MapPoint | null;
  onHomeChange: (p: MapPoint) => void;
  onWorkChange: (p: MapPoint) => void;
  onSave: () => void;
  saving?: boolean;
}

type PlaceMode = "home" | "work" | null;

const DEFAULT_CENTER: [number, number] = [51.5074, -0.1278];
const DEFAULT_ZOOM = 12;

function makeMarker(
  map: L.Map,
  point: MapPoint,
  color: string,
  label: string,
  onDrag: (p: MapPoint) => void
) {
  const icon = L.divIcon({
    className: "",
    html: `<div style="width:26px;height:26px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.35)"></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });

  const marker = L.marker([point.lat, point.lng], { icon, draggable: true })
    .bindTooltip(label, { permanent: true, direction: "top", offset: [0, -14] })
    .addTo(map);

  marker.on("dragend", () => {
    const { lat, lng } = marker.getLatLng();
    onDrag({ lat, lng });
  });

  return marker;
}

export default function LocationMap({
  home,
  work,
  onHomeChange,
  onWorkChange,
  onSave,
  saving,
}: LocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const homeMarkerRef = useRef<L.Marker | null>(null);
  const workMarkerRef = useRef<L.Marker | null>(null);
  const modeRef = useRef<PlaceMode>(null);

  const [mode, setMode] = useState<PlaceMode>(null);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const syncMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    if (homeMarkerRef.current) {
      homeMarkerRef.current.remove();
      homeMarkerRef.current = null;
    }
    if (workMarkerRef.current) {
      workMarkerRef.current.remove();
      workMarkerRef.current = null;
    }

    if (home) {
      homeMarkerRef.current = makeMarker(map, home, "#22c55e", "Home", onHomeChange);
    }
    if (work) {
      workMarkerRef.current = makeMarker(map, work, "#3b82f6", "Work", onWorkChange);
    }

    const points: [number, number][] = [];
    if (home) points.push([home.lat, home.lng]);
    if (work) points.push([work.lat, work.lng]);
    if (points.length === 2) {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 15 });
    } else if (points.length === 1) {
      map.setView(points[0], 15);
    }
  }, [home, work, onHomeChange, onWorkChange]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    map.on("click", (e: L.LeafletMouseEvent) => {
      const current = modeRef.current;
      if (current === "home") {
        onHomeChange({ lat: e.latlng.lat, lng: e.latlng.lng });
      } else if (current === "work") {
        onWorkChange({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    });

    mapRef.current = map;
    // Leaflet needs a size recalc after layout
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [onHomeChange, onWorkChange]);

  useEffect(() => {
    syncMarkers();
  }, [syncMarkers]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!search.trim()) return;
    setSearching(true);
    setSearchError("");
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(search.trim())}&limit=1`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = (await res.json()) as { lat: string; lon: string }[];
      if (!data.length) {
        setSearchError("Address not found — try a different search");
        return;
      }
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      mapRef.current?.setView([lat, lng], 16);
      if (mode === "home") onHomeChange({ lat, lng });
      else if (mode === "work") onWorkChange({ lat, lng });
    } catch {
      setSearchError("Search failed — check your connection");
    } finally {
      setSearching(false);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      mapRef.current?.setView([p.lat, p.lng], 16);
      if (mode === "home") onHomeChange(p);
      else if (mode === "work") onWorkChange(p);
      else if (!home) {
        onHomeChange(p);
        setMode("work");
      } else if (!work) onWorkChange(p);
    });
  }

  return (
    <div className="location-map-wrap">
      <form className="map-search" onSubmit={handleSearch}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search address (e.g. 10 Downing Street, London)"
        />
        <button type="submit" className="btn btn-secondary map-search-btn" disabled={searching}>
          {searching ? "…" : "Go"}
        </button>
      </form>
      {searchError && <p className="map-error">{searchError}</p>}

      <div className="map-mode-row">
        <button
          type="button"
          className={`map-mode-btn ${mode === "home" ? "active home" : ""}`}
          onClick={() => setMode(mode === "home" ? null : "home")}
        >
          {home ? "✓ " : ""}Place Home
        </button>
        <button
          type="button"
          className={`map-mode-btn ${mode === "work" ? "active work" : ""}`}
          onClick={() => setMode(mode === "work" ? null : "work")}
        >
          {work ? "✓ " : ""}Place Work
        </button>
        <button type="button" className="map-mode-btn subtle" onClick={useMyLocation}>
          My location
        </button>
      </div>

      {mode && (
        <p className="map-hint">
          Tap the map to place <strong>{mode === "home" ? "Home" : "Work"}</strong>, or search an address above.
          Drag pins to adjust.
        </p>
      )}

      <div ref={containerRef} className="location-map" />

      <div className="map-legend">
        <span><i className="dot home" /> Home {home ? `(${home.lat.toFixed(4)}, ${home.lng.toFixed(4)})` : "— not set"}</span>
        <span><i className="dot work" /> Work {work ? `(${work.lat.toFixed(4)}, ${work.lng.toFixed(4)})` : "— not set"}</span>
      </div>

      <button
        type="button"
        className="btn"
        style={{ marginTop: "0.75rem" }}
        onClick={onSave}
        disabled={saving || !home || !work}
      >
        {saving ? "Saving…" : "Save locations"}
      </button>
    </div>
  );
}
