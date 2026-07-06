"use client";

import dynamic from "next/dynamic";
import type { MapPoint } from "@/components/LocationMap";

const LocationMap = dynamic(() => import("@/components/LocationMap"), {
  ssr: false,
  loading: () => (
    <div className="location-map" style={{ display: "grid", placeItems: "center", color: "var(--muted)" }}>
      Loading map…
    </div>
  ),
});

export default LocationMap;
export type { MapPoint };
