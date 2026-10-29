"use client";

import * as React from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import Link from "next/link";
import { Price } from "@/components/shared/price";
import type { PropertyWithRelations } from "@/lib/supabase/property-service";
import { formatNgn } from "@/lib/utils/format";

// Fix Leaflet default marker icons (they break in bundlers)
// Using a custom div icon instead of image files
const customIcon = L.divIcon({
  html: `<div style="background:#107a57;color:#fff;border-radius:50% 50% 50% 0;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,0.3);">🏠</div>`,
  className: "netlodge-marker",
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

interface PropertyMapProps {
  properties: PropertyWithRelations[];
  /** Center point — typically the selected university's coordinates */
  center?: [number, number];
  zoom?: number;
}

export function PropertyMap({ properties, center = [6.5157, 3.3898], zoom = 13 }: PropertyMapProps) {
  // Filter properties that have coordinates
  const geoProperties = properties.filter(
    (p) => p.latitude != null && p.longitude != null,
  );

  if (geoProperties.length === 0) {
    return (
      <div className="flex h-[400px] items-center justify-center rounded-xl border border-border bg-muted/30 text-sm text-muted-foreground">
        No properties with location data yet. Landlords can add coordinates when creating a property.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={false}
        style={{ height: "400px", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {geoProperties.map((p) => (
          <Marker
            key={p.id}
            position={[p.latitude!, p.longitude!]}
            icon={customIcon}
          >
            <Popup>
              <div style={{ minWidth: "180px" }}>
                <Link
                  href={`/properties/${p.slug}`}
                  style={{ fontWeight: 600, color: "#107a57", textDecoration: "none" }}
                >
                  {p.name}
                </Link>
                <div style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>
                  {p.public_address_line}, {p.city}
                </div>
                {p.available_units > 0 && (
                  <div style={{ fontSize: "12px", color: "#107a57", marginTop: "4px" }}>
                    {p.available_units} units available
                  </div>
                )}
                <div style={{ fontSize: "14px", fontWeight: 700, marginTop: "4px" }}>
                  {formatNgn(p.price_from_kobo)}/yr
                </div>
                <Link
                  href={`/properties/${p.slug}`}
                  style={{
                    display: "inline-block",
                    marginTop: "6px",
                    padding: "4px 12px",
                    background: "#107a57",
                    color: "#fff",
                    borderRadius: "4px",
                    textDecoration: "none",
                    fontSize: "12px",
                  }}
                >
                  View property
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

/** Component to recenter the map when the center prop changes */
function Recenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  React.useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  return null;
}
