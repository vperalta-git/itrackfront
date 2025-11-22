import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import 'leaflet/dist/leaflet.css';
import L from "leaflet";
import "../css/ServiceRequest.css";

import truckIconImg from "../icons/truck1.png"; // adjust path

// Custom truck icon
const truckIcon = new L.Icon({
  iconUrl: truckIconImg,
  iconSize: [50, 50],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

// Fix for default Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

const containerStyle = {
  width: "100px",
  height: "300px",
  borderRadius: "10px",
};

const defaultCenter = {
  lat: 15.5995, // Manila
  lng: 120.9842,
};

const isValidLatLng = (lat, lng) =>
  typeof lat === "number" &&
  typeof lng === "number" &&
  !isNaN(lat) &&
  !isNaN(lng);

const RecenterMap = ({ center }) => {
  const map = useMap();

  useEffect(() => {
    if (center && isValidLatLng(center[0], center[1])) {
      map.setView(center);
    }
  }, [center, map]);

  return null;
};

const ViewShipment = ({ isOpen, onClose, data }) => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !data?._id) return;

    const fetchCurrentLocation = async () => {
      try {
        const res = await axios.get(
          `https://itrack-web-backend.onrender.com/api/getAllocation/${data._id}`,
          { withCredentials: true }
        );

        const loc = res.data?.location; 
        if (loc?.latitude && loc?.longitude) {
          setCurrentLocation([loc.latitude, loc.longitude]);
        }
      } catch (err) {
        console.error("Error fetching live location:", err);
      }
    };

    fetchCurrentLocation();
    const interval = setInterval(fetchCurrentLocation, 5000);

    return () => clearInterval(interval);
  }, [isOpen, data?._id]);

  const mapCenter =
    currentLocation && isValidLatLng(currentLocation[0], currentLocation[1])
      ? currentLocation
      : data?.location && isValidLatLng(data.location.latitude, data.location.longitude)
      ? [data.location.latitude, data.location.longitude]
      : [defaultCenter.lat, defaultCenter.lng];

  useEffect(() => {
    if (isOpen && markerRef.current) {
      markerRef.current.openPopup();
    }
  }, [isOpen, mapCenter]);

  // ✅ Add this new useEffect here
useEffect(() => {
  if (isOpen) {
    setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 300);
  }
}, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        
        {/* Top Bar with Title + X Button */}
        {/* Top Bar with Title + X Button */}
<div className="viewshipment-header">
  <p className="modaltitle">View Shipment</p>
  <button className="viewshipment-close-btn" onClick={onClose}>×</button>
</div>


        <div className="modalline"></div>

        <div className="modal-content viewshipment-flex">
  {data ? (
    <>
      {/* Left side: shipment details */}
      <div className="viewshipment-info">
        <p>
          <strong>Date: </strong>{" "}
          {new Date(data.date).toLocaleDateString("en-CA")}
        </p>
        <p>
          <strong>Unit Name: </strong> {data.unitName}
        </p>
        <p>
          <strong>Driver: </strong> {data.assignedDriver}
        </p>
        <p>
          <strong>Status: </strong> {data.status}
        </p>
      </div>

      {/* Right side: map */}
      <div className="viewshipment-map">
        <MapContainer
          center={mapCenter}
          zoom={14}
          style={{
            height: "450px",
            width: "900px",
            borderRadius: "10px",
            boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)",
          }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {isValidLatLng(mapCenter[0], mapCenter[1]) && (
            <Marker position={mapCenter} icon={truckIcon} ref={markerRef}>
              <Popup>
                {data.unitName} <br /> {data.status}
                <br />
                {currentLocation
                  ? `Live @ ${currentLocation[0]}, ${currentLocation[1]}`
                  : data?.location
                  ? `Initial @ ${data.location.latitude}, ${data.location.longitude}`
                  : "Waiting for location..."}
              </Popup>
            </Marker>
          )}
          <RecenterMap center={mapCenter} />
        </MapContainer>
      </div>
    </>
  ) : (
    <p>No data available.</p>
  )}
</div>

      </div>
    </div>
  );
};

export default ViewShipment;
