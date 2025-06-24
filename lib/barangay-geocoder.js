const fs = require('fs');
const path = require('path');

/**
 * Barangay Geocoder for Davao City
 * Uses local GeoJSON data to perform accurate barangay identification from coordinates
 */
class BarangayGeocoder {
  constructor() {
    this.barangayData = null;
    this.spatialIndex = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the geocoder with barangay boundary data
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      const dataPath = path.join(__dirname, 'geo-data', 'davao-barangays.geojson');
      
      if (!fs.existsSync(dataPath)) {
        throw new Error(`Barangay data not found at: ${dataPath}. Run 'node scripts/setup-barangay-boundaries.js' first.`);
      }

      const rawData = fs.readFileSync(dataPath, 'utf8');
      this.barangayData = JSON.parse(rawData);
      
      // Build spatial index for faster lookups
      this.buildSpatialIndex();
      
      this.isInitialized = true;
      console.log(`✅ Barangay geocoder initialized with ${this.barangayData.features.length} barangays`);
    } catch (error) {
      console.error('❌ Failed to initialize barangay geocoder:', error.message);
      throw error;
    }
  }

  /**
   * Build a simple spatial index using bounding boxes for faster initial filtering
   */
  buildSpatialIndex() {
    this.spatialIndex = this.barangayData.features.map((feature, index) => {
      const bbox = this.calculateBoundingBox(feature.geometry);
      return {
        index,
        bbox,
        feature
      };
    });
  }

  /**
   * Calculate bounding box for a geometry
   */
  calculateBoundingBox(geometry) {
    let minLng = Infinity, minLat = Infinity;
    let maxLng = -Infinity, maxLat = -Infinity;

    const processCoordinates = (coords) => {
      if (typeof coords[0] === 'number') {
        // Single coordinate pair
        const [lng, lat] = coords;
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
      } else {
        // Array of coordinates
        coords.forEach(processCoordinates);
      }
    };

    if (geometry.type === 'Point') {
      processCoordinates(geometry.coordinates);
    } else if (geometry.type === 'Polygon') {
      geometry.coordinates.forEach(processCoordinates);
    } else if (geometry.type === 'MultiPolygon') {
      geometry.coordinates.forEach(polygon => {
        polygon.forEach(processCoordinates);
      });
    }

    return { minLng, minLat, maxLng, maxLat };
  }

  /**
   * Find barangay containing the given coordinates
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {Object|null} Barangay information or null if not found
   */
  async findBarangay(lat, lng) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Input validation
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      throw new Error('Latitude and longitude must be numbers');
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new Error('Invalid coordinates: latitude must be between -90 and 90, longitude between -180 and 180');
    }

    // Check if coordinates are roughly within Davao City bounds
    if (lat < 6.8 || lat > 7.4 || lng < 125.2 || lng > 125.8) {
      console.warn(`⚠️ Coordinates (${lat}, ${lng}) appear to be outside Davao City bounds`);
    }

    console.log(`🔍 Finding barangay for coordinates: ${lat}, ${lng}`);

    // Step 1: Use spatial index to filter candidates
    const candidates = this.spatialIndex.filter(item => {
      const { bbox } = item;
      return lng >= bbox.minLng && lng <= bbox.maxLng && 
             lat >= bbox.minLat && lat <= bbox.maxLat;
    });

    console.log(`📍 Found ${candidates.length} candidate barangays within bounding box`);

    // Step 2: Perform precise point-in-polygon tests
    for (const candidate of candidates) {
      if (this.pointInPolygon(lat, lng, candidate.feature.geometry)) {
        const result = {
          barangay: candidate.feature.properties.name,
          city: candidate.feature.properties.city,
          province: candidate.feature.properties.province,
          region: candidate.feature.properties.region,
          confidence: 'high',
          method: 'polygon_intersection',
          coordinates: { lat, lng }
        };
        
        console.log(`✅ Found exact match: ${result.barangay}`);
        return result;
      }
    }

    console.log(`⚠️ No exact polygon match found, trying nearest neighbor...`);

    // Step 3: Fallback to nearest neighbor
    return this.findNearestBarangay(lat, lng);
  }

  /**
   * Point-in-polygon test using ray casting algorithm
   */
  pointInPolygon(lat, lng, geometry) {
    if (geometry.type === 'Point') {
      // For point geometries, use distance threshold
      const [pointLng, pointLat] = geometry.coordinates;
      const distance = this.calculateDistance(lat, lng, pointLat, pointLng);
      return distance < 0.01; // ~1km threshold
    }

    if (geometry.type === 'Polygon') {
      return this.pointInPolygonRings(lat, lng, geometry.coordinates);
    }

    if (geometry.type === 'MultiPolygon') {
      return geometry.coordinates.some(polygon => 
        this.pointInPolygonRings(lat, lng, polygon)
      );
    }

    return false;
  }

  /**
   * Test if point is inside polygon rings (exterior and holes)
   */
  pointInPolygonRings(lat, lng, rings) {
    // Test exterior ring
    if (!this.raycast(lat, lng, rings[0])) {
      return false;
    }

    // Test holes (if point is in a hole, it's not in the polygon)
    for (let i = 1; i < rings.length; i++) {
      if (this.raycast(lat, lng, rings[i])) {
        return false;
      }
    }

    return true;
  }

  /**
   * Ray casting algorithm for point-in-polygon test
   */
  raycast(lat, lng, ring) {
    let inside = false;
    
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      
      if (((yi > lat) !== (yj > lat)) && 
          (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    
    return inside;
  }

  /**
   * Find nearest barangay using distance calculation
   */
  findNearestBarangay(lat, lng) {
    let nearestDistance = Infinity;
    let nearestBarangay = null;

    for (const feature of this.barangayData.features) {
      const centroid = this.calculateCentroid(feature.geometry);
      const distance = this.calculateDistance(lat, lng, centroid.lat, centroid.lng);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestBarangay = {
          barangay: feature.properties.name,
          city: feature.properties.city,
          province: feature.properties.province,
          region: feature.properties.region,
          confidence: distance < 0.005 ? 'medium' : 'low', // <500m = medium confidence
          method: 'nearest_neighbor',
          distance: `${(distance * 111).toFixed(2)}km`, // Convert to approximate km
          coordinates: { lat, lng }
        };
      }
    }

    if (nearestBarangay) {
      console.log(`📍 Nearest barangay: ${nearestBarangay.barangay} (${nearestBarangay.distance} away)`);
    }

    return nearestBarangay;
  }

  /**
   * Calculate centroid of a geometry
   */
  calculateCentroid(geometry) {
    if (geometry.type === 'Point') {
      const [lng, lat] = geometry.coordinates;
      return { lat, lng };
    }

    let totalLat = 0, totalLng = 0, pointCount = 0;

    const processCoordinates = (coords) => {
      if (typeof coords[0] === 'number') {
        const [lng, lat] = coords;
        totalLng += lng;
        totalLat += lat;
        pointCount++;
      } else {
        coords.forEach(processCoordinates);
      }
    };

    if (geometry.type === 'Polygon') {
      // Use only exterior ring for centroid calculation
      processCoordinates(geometry.coordinates[0]);
    } else if (geometry.type === 'MultiPolygon') {
      geometry.coordinates.forEach(polygon => {
        processCoordinates(polygon[0]); // Only exterior rings
      });
    }

    return {
      lat: totalLat / pointCount,
      lng: totalLng / pointCount
    };
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c / 111; // Convert to approximate degrees
  }

  /**
   * Convert degrees to radians
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get all available barangays
   */
  getAllBarangays() {
    if (!this.isInitialized) {
      throw new Error('Geocoder not initialized. Call initialize() first.');
    }

    return this.barangayData.features.map(feature => feature.properties.name).sort();
  }

  /**
   * Get metadata about the loaded data
   */
  getMetadata() {
    if (!this.isInitialized) {
      throw new Error('Geocoder not initialized. Call initialize() first.');
    }

    return this.barangayData.metadata;
  }
}

// Export singleton instance
const geocoder = new BarangayGeocoder();

module.exports = {
  BarangayGeocoder,
  geocoder,
  
  // Convenience function for direct use
  findBarangay: async (lat, lng) => {
    return await geocoder.findBarangay(lat, lng);
  },
  
  // Initialize the default geocoder
  initialize: async () => {
    return await geocoder.initialize();
  }
}; 