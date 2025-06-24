#!/usr/bin/env python3
"""
Advanced Barangay Extractor for Davao City using Python
This script provides accurate barangay detection from coordinates.
"""

import json
import requests
import os
import sys
from datetime import datetime
import math
from typing import Dict, List, Optional, Tuple

class AdvancedBarangayExtractor:
    def __init__(self, data_dir: str = "geo-data"):
        self.data_dir = data_dir
        self.barangays_data = None
        self.is_initialized = False
        
        # Enhanced barangay data with better spatial coverage
        self.enhanced_barangays = [
            {"name": "Poblacion", "lat": 7.073, "lng": 125.612, "radius": 0.008},
            {"name": "Agdao Proper", "lat": 7.083, "lng": 125.623, "radius": 0.006},
            {"name": "Buhangin Proper", "lat": 7.087, "lng": 125.613, "radius": 0.007},
            {"name": "Talomo Proper", "lat": 7.048, "lng": 125.583, "radius": 0.010},
            {"name": "Matina Aplaya", "lat": 7.052, "lng": 125.608, "radius": 0.008},
            {"name": "Matina Crossing", "lat": 7.055, "lng": 125.615, "radius": 0.006},
            {"name": "Matina Pangi", "lat": 7.058, "lng": 125.620, "radius": 0.005},
            {"name": "Bankerohan", "lat": 7.068, "lng": 125.608, "radius": 0.005},
            {"name": "Sasa", "lat": 7.083, "lng": 125.623, "radius": 0.006},
            {"name": "Pampanga", "lat": 7.078, "lng": 125.618, "radius": 0.005},
            {"name": "Tigatto", "lat": 7.128, "lng": 125.558, "radius": 0.008},
            {"name": "Tugbok", "lat": 7.128, "lng": 125.558, "radius": 0.010},
            {"name": "Catalunan Grande", "lat": 7.040, "lng": 125.575, "radius": 0.009},
            {"name": "Catalunan Pequeño", "lat": 7.045, "lng": 125.585, "radius": 0.007},
            {"name": "Maa", "lat": 7.035, "lng": 125.595, "radius": 0.008},
            {"name": "Bucana", "lat": 7.038, "lng": 125.590, "radius": 0.007},
            {"name": "Bago Aplaya", "lat": 7.042, "lng": 125.598, "radius": 0.006},
            {"name": "Langub", "lat": 7.040, "lng": 125.588, "radius": 0.005},
            {"name": "Dumoy", "lat": 7.035, "lng": 125.580, "radius": 0.006},
            {"name": "Toril Proper", "lat": 6.992, "lng": 125.507, "radius": 0.008},
            {"name": "Calinan Proper", "lat": 7.178, "lng": 125.458, "radius": 0.012},
            {"name": "Baguio Proper", "lat": 7.238, "lng": 125.427, "radius": 0.015},
            {"name": "Paquibato Proper", "lat": 7.200, "lng": 125.400, "radius": 0.020},
            {"name": "Marilog Proper", "lat": 7.300, "lng": 125.350, "radius": 0.025},
            {"name": "Bunawan Proper", "lat": 7.150, "lng": 125.650, "radius": 0.015},
            {"name": "Cabantian", "lat": 7.095, "lng": 125.620, "radius": 0.008},
            {"name": "Indangan", "lat": 7.090, "lng": 125.625, "radius": 0.007},
            {"name": "Mandug", "lat": 7.088, "lng": 125.630, "radius": 0.006}
        ]
    
    def initialize(self):
        """Initialize the extractor"""
        if self.is_initialized:
            return True
        
        print("🚀 Initializing Advanced Barangay Extractor...")
        self.barangays_data = self.enhanced_barangays
        self.is_initialized = True
        
        print(f"✅ Initialization complete: {len(self.barangays_data)} barangays loaded")
        return True
    
    def calculate_distance(self, lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """Calculate distance between two coordinates using Haversine formula"""
        R = 6371  # Earth's radius in km
        
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lng = math.radians(lng2 - lng1)
        
        a = (math.sin(delta_lat / 2) * math.sin(delta_lat / 2) +
             math.cos(lat1_rad) * math.cos(lat2_rad) *
             math.sin(delta_lng / 2) * math.sin(delta_lng / 2))
        
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        return R * c
    
    def point_in_circle(self, lat: float, lng: float, center_lat: float, center_lng: float, radius: float) -> bool:
        """Check if point is within circular boundary"""
        distance = self.calculate_distance(lat, lng, center_lat, center_lng)
        radius_km = radius * 111  # Convert degrees to km (approximate)
        return distance <= radius_km
    
    def find_barangay(self, lat: float, lng: float) -> Optional[Dict]:
        """Find barangay for given coordinates"""
        if not self.is_initialized:
            self.initialize()
        
        print(f"🔍 Searching for barangay at coordinates: {lat}, {lng}")
        
        # Strategy 1: Circular boundary intersection
        for barangay in self.barangays_data:
            if self.point_in_circle(lat, lng, barangay['lat'], barangay['lng'], barangay['radius']):
                result = {
                    'barangay': barangay['name'],
                    'city': 'Davao City',
                    'province': 'Davao del Sur',
                    'region': 'Region XI (Davao Region)',
                    'method': 'circular_boundary',
                    'confidence': 'high',
                    'coordinates': {'lat': lat, 'lng': lng}
                }
                print(f"✅ Found by circular boundary: {barangay['name']}")
                return result
        
        # Strategy 2: Nearest neighbor
        distances = []
        for barangay in self.barangays_data:
            distance = self.calculate_distance(lat, lng, barangay['lat'], barangay['lng'])
            distances.append((barangay, distance))
        
        # Sort by distance
        distances.sort(key=lambda x: x[1])
        nearest = distances[0]
        
        # Only return if within reasonable distance (10km)
        if nearest[1] <= 10:
            result = {
                'barangay': nearest[0]['name'],
                'city': 'Davao City',
                'province': 'Davao del Sur',
                'region': 'Region XI (Davao Region)',
                'method': 'nearest_neighbor',
                'confidence': 'medium',
                'coordinates': {'lat': lat, 'lng': lng},
                'distance_km': round(nearest[1], 2)
            }
            print(f"✅ Found by nearest neighbor: {nearest[0]['name']} ({nearest[1]:.2f}km)")
            return result
        
        # Strategy 3: Administrative bounds fallback
        davao_bounds = {
            'min_lat': 6.8, 'max_lat': 7.4,
            'min_lng': 125.2, 'max_lng': 125.8
        }
        
        if (davao_bounds['min_lat'] <= lat <= davao_bounds['max_lat'] and
            davao_bounds['min_lng'] <= lng <= davao_bounds['max_lng']):
            
            result = {
                'barangay': 'Poblacion',  # Default to central barangay
                'city': 'Davao City',
                'province': 'Davao del Sur',
                'region': 'Region XI (Davao Region)',
                'method': 'administrative_bounds',
                'confidence': 'low',
                'coordinates': {'lat': lat, 'lng': lng},
                'note': 'Fallback to central barangay'
            }
            print(f"✅ Found by administrative bounds: Poblacion (fallback)")
            return result
        
        print("❌ No barangay found for coordinates")
        return None

def main():
    """Main CLI interface"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Advanced Barangay Extractor for Davao City')
    parser.add_argument('--lat', type=float, required=True, help='Latitude')
    parser.add_argument('--lng', type=float, required=True, help='Longitude')
    
    args = parser.parse_args()
    
    extractor = AdvancedBarangayExtractor()
    result = extractor.find_barangay(args.lat, args.lng)
    
    if result:
        print(json.dumps(result, indent=2))
    else:
        sys.exit(1)

if __name__ == "__main__":
    main() 