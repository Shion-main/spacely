const fs = require('fs');
const path = require('path');

/**
 * Enhanced Barangay Geocoder for Davao City
 * Features:
 * - Optimized spatial indexing using R-tree-like structure
 * - Multiple fallback strategies
 * - Better point-in-polygon algorithms
 * - Confidence scoring
 * - Performance monitoring
 */
class EnhancedBarangayGeocoder {
  constructor() {
    this.barangayData = null;
    this.spatialIndex = null;
    this.quadTree = null;
    this.isInitialized = false;
    this.performanceStats = {
      totalQueries: 0,
      averageQueryTime: 0,
      cacheHits: 0,
      methodStats: {}
    };
    this.cache = new Map();
    this.maxCacheSize = 1000;
  }

  /**
   * Initialize the geocoder with enhanced spatial indexing
   */
  async initialize() {
    if (this.isInitialized) return;

    const startTime = Date.now();
    console.log('🚀 Initializing Enhanced Barangay Geocoder...');

    try {
      await this.loadBarangayData();
      this.buildEnhancedSpatialIndex();
      this.buildQuadTree();
      this.isInitialized = true;
      
      const initTime = Date.now() - startTime;
      console.log(`✅ Enhanced geocoder initialized in ${initTime}ms`);
      console.log(`📊 Loaded ${this.barangayData.features.length} barangays`);
      console.log(`🎯 Data quality: ${this.barangayData.metadata.dataQuality}`);
      
    } catch (error) {
      console.error('❌ Failed to initialize enhanced geocoder:', error.message);
      throw error;
    }
  }

  async loadBarangayData() {
    // Try multiple possible paths for the data file
    const possiblePaths = [
      path.join(__dirname, 'geo-data', 'davao-barangays.geojson'),
      path.join(__dirname, 'geo-data', 'davao-barangays-enhanced.json'),
      path.join(process.cwd(), 'lib', 'geo-data', 'davao-barangays.geojson'),
      path.join(process.cwd(), 'lib', 'geo-data', 'davao-barangays-enhanced.json'),
      path.join(process.cwd(), 'lib', 'geo-data', 'davao-barangays-arcgis.geojson')
    ];
    
    let dataPath = null;
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        dataPath = possiblePath;
        console.log(`📁 Found barangay data at: ${dataPath}`);
        break;
      }
    }
    
    if (!dataPath) {
      console.error('❌ Barangay data not found at any of these paths:');
      possiblePaths.forEach(p => console.error(`  - ${p}`));
      throw new Error(`Barangay data not found. Run 'node scripts/enhanced-barangay-setup.js' first.`);
    }

    const rawData = fs.readFileSync(dataPath, 'utf8');
    this.barangayData = JSON.parse(rawData);
    
    // Handle different data formats (enhanced JSON vs raw GeoJSON)
    if (this.barangayData.features) {
      // Already in the right format
      console.log(`✅ Loaded ${this.barangayData.features.length} barangay features`);
    } else if (this.barangayData.type === 'FeatureCollection') {
      // Standard GeoJSON format, keep as is
      console.log(`✅ Loaded ${this.barangayData.features?.length || 0} barangay features from GeoJSON`);
    } else {
      // Handle other formats
      console.warn('⚠️ Unexpected data format, attempting to use as-is');
    }
    
    // Validate data quality
    if (this.barangayData.features.length < 10) {
      console.warn('⚠️ Very limited barangay data detected. Consider running enhanced setup.');
    }
  }

  /**
   * Build enhanced spatial index with multiple acceleration structures
   */
  buildEnhancedSpatialIndex() {
    console.log('🔧 Building enhanced spatial index...');
    
    this.spatialIndex = this.barangayData.features.map((feature, index) => {
      const bbox = this.calculateBoundingBox(feature.geometry);
      const centroid = this.calculateCentroid(feature.geometry);
      
      return {
        index,
        bbox,
        centroid,
        feature,
        area: this.calculateArea(feature.geometry),
        perimeter: this.calculatePerimeter(feature.geometry)
      };
    });

    // Sort by area for better query performance (smaller areas first)
    this.spatialIndex.sort((a, b) => a.area - b.area);
    
    console.log(`📍 Spatial index built with ${this.spatialIndex.length} features`);
  }

  /**
   * Build QuadTree for efficient spatial queries
   */
  buildQuadTree() {
    const bounds = this.calculateOverallBounds();
    this.quadTree = new QuadTree(bounds, 10, 5); // max 10 objects, max 5 levels
    
    this.spatialIndex.forEach(item => {
      this.quadTree.insert(item);
    });
    
    console.log('🌳 QuadTree built for spatial acceleration');
  }

  calculateOverallBounds() {
    let minLng = Infinity, minLat = Infinity;
    let maxLng = -Infinity, maxLat = -Infinity;

    this.spatialIndex.forEach(item => {
      const { bbox } = item;
      minLng = Math.min(minLng, bbox.minLng);
      minLat = Math.min(minLat, bbox.minLat);
      maxLng = Math.max(maxLng, bbox.maxLng);
      maxLat = Math.max(maxLat, bbox.maxLat);
    });

    return { minLng, minLat, maxLng, maxLat };
  }

  /**
   * Enhanced barangay finding with multiple strategies
   */
  async findBarangay(lat, lng, options = {}) {
    const startTime = Date.now();
    
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Input validation
    this.validateCoordinates(lat, lng);
    
    // Check cache first
    const cacheKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    if (this.cache.has(cacheKey)) {
      this.performanceStats.cacheHits++;
      return this.cache.get(cacheKey);
    }

    console.log(`🔍 Enhanced search for coordinates: ${lat}, ${lng}`);

    // Strategy 1: Polygon intersection
    const candidates = this.spatialIndex.filter(item => {
      const { bbox } = item;
      return lng >= bbox.minLng && lng <= bbox.maxLng && 
             lat >= bbox.minLat && lat <= bbox.maxLat;
    });

    for (const candidate of candidates) {
      if (this.pointInPolygon(lat, lng, candidate.feature.geometry)) {
        const result = this.createResult(candidate.feature);
        result.method = 'polygon_intersection';
        result.confidence = 'high';
        return result;
      }
    }

    // Strategy 2: Nearest neighbor
    const distances = this.spatialIndex.map(item => ({
      ...item,
      distance: this.calculateDistance(lat, lng, item.centroid.lat, item.centroid.lng)
    })).sort((a, b) => a.distance - b.distance);

    const nearest = distances[0];
    const result = this.createResult(nearest.feature);
    result.method = 'nearest_neighbor';
    result.confidence = 'medium';
    result.distance_km = nearest.distance;

    // Add performance metrics
    const queryTime = Date.now() - startTime;
    this.updatePerformanceStats(queryTime, result?.method);

    if (result) {
      result.query_time_ms = queryTime;
      result.coordinates = { lat, lng };
      
      // Cache the result
      this.addToCache(cacheKey, result);
      
      console.log(`✅ Found: ${result.barangay} (${result.method}, ${result.confidence})`);
    } else {
      console.log('❌ No barangay found for coordinates');
    }

    return result;
  }

  pointInPolygon(lat, lng, geometry) {
    if (geometry.type === 'Point') {
      const [pointLng, pointLat] = geometry.coordinates;
      return this.calculateDistance(lat, lng, pointLat, pointLng) < 0.01;
    }
    
    if (geometry.type === 'Polygon') {
      return this.raycast(lat, lng, geometry.coordinates[0]);
    }
    
    return false;
  }

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

  calculateArea(geometry) {
    if (geometry.type === 'Point') return 0.000001; // Very small area
    if (geometry.type === 'Polygon') return this.polygonArea(geometry.coordinates[0]);
    if (geometry.type === 'MultiPolygon') {
      return geometry.coordinates.reduce((sum, polygon) => 
        sum + this.polygonArea(polygon[0]), 0
      );
    }
    return 0.001; // Default small area
  }

  polygonArea(ring) {
    let area = 0;
    for (let i = 0; i < ring.length - 1; i++) {
      const [x1, y1] = ring[i];
      const [x2, y2] = ring[i + 1];
      area += (x1 * y2 - x2 * y1);
    }
    return Math.abs(area) / 2;
  }

  calculatePerimeter(geometry) {
    if (geometry.type === 'Point') return 0;
    if (geometry.type === 'Polygon') return this.ringPerimeter(geometry.coordinates[0]);
    if (geometry.type === 'MultiPolygon') {
      return geometry.coordinates.reduce((sum, polygon) => 
        sum + this.ringPerimeter(polygon[0]), 0
      );
    }
    return 0;
  }

  ringPerimeter(ring) {
    let perimeter = 0;
    for (let i = 0; i < ring.length - 1; i++) {
      const [x1, y1] = ring[i];
      const [x2, y2] = ring[i + 1];
      perimeter += Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    }
    return perimeter;
  }

  calculateBoundingBox(geometry) {
    let minLng = Infinity, minLat = Infinity;
    let maxLng = -Infinity, maxLat = -Infinity;

    const processCoordinates = (coords) => {
      if (typeof coords[0] === 'number') {
        const [lng, lat] = coords;
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
      } else {
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

  calculateCentroid(geometry) {
    if (geometry.type === 'Point') {
      const [lng, lat] = geometry.coordinates;
      return { lng, lat };
    }

    let totalLng = 0, totalLat = 0, pointCount = 0;

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
      processCoordinates(geometry.coordinates[0]); // Only exterior ring
    } else if (geometry.type === 'MultiPolygon') {
      geometry.coordinates.forEach(polygon => {
        processCoordinates(polygon[0]); // Only exterior rings
      });
    }

    return {
      lng: totalLng / pointCount,
      lat: totalLat / pointCount
    };
  }

  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  validateCoordinates(lat, lng) {
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      throw new Error('Coordinates must be numbers');
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new Error('Invalid coordinate ranges');
    }

    // Warn if outside Davao City area
    if (lat < 6.8 || lat > 7.4 || lng < 125.2 || lng > 125.8) {
      console.warn(`⚠️ Coordinates may be outside Davao City: ${lat}, ${lng}`);
    }
  }

  createResult(feature) {
    return {
      barangay: feature.properties.name,
      city: feature.properties.city,
      province: feature.properties.province,
      region: feature.properties.region,
      source: feature.properties.source || 'unknown',
      geometry_type: feature.geometry.type
    };
  }

  addToCache(key, result) {
    if (this.cache.size >= this.maxCacheSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, result);
  }

  updatePerformanceStats(queryTime, method) {
    this.performanceStats.totalQueries++;
    this.performanceStats.averageQueryTime = 
      (this.performanceStats.averageQueryTime * (this.performanceStats.totalQueries - 1) + queryTime) / 
      this.performanceStats.totalQueries;
    
    if (method) {
      if (!this.performanceStats.methodStats[method]) {
        this.performanceStats.methodStats[method] = 0;
      }
      this.performanceStats.methodStats[method]++;
    }
  }

  getPerformanceStats() {
    return {
      ...this.performanceStats,
      cacheHitRate: this.performanceStats.cacheHits / this.performanceStats.totalQueries * 100,
      cacheSize: this.cache.size
    };
  }

  getAllBarangays() {
    if (!this.isInitialized) {
      throw new Error('Geocoder not initialized');
    }
    
    return this.barangayData.features.map(feature => ({
      name: feature.properties.name,
      city: feature.properties.city,
      province: feature.properties.province,
      region: feature.properties.region
    }));
  }

  getMetadata() {
    return this.barangayData?.metadata || {};
  }
}

/**
 * Simple QuadTree implementation for spatial indexing
 */
class QuadTree {
  constructor(bounds, maxObjects = 10, maxLevels = 5, level = 0) {
    this.bounds = bounds;
    this.maxObjects = maxObjects;
    this.maxLevels = maxLevels;
    this.level = level;
    this.objects = [];
    this.nodes = [];
  }

  clear() {
    this.objects = [];
    this.nodes = [];
  }

  split() {
    const midX = (this.bounds.minLng + this.bounds.maxLng) / 2;
    const midY = (this.bounds.minLat + this.bounds.maxLat) / 2;

    this.nodes[0] = new QuadTree({
      minLng: midX, minLat: midY,
      maxLng: this.bounds.maxLng, maxLat: this.bounds.maxLat
    }, this.maxObjects, this.maxLevels, this.level + 1);

    this.nodes[1] = new QuadTree({
      minLng: this.bounds.minLng, minLat: midY,
      maxLng: midX, maxLat: this.bounds.maxLat
    }, this.maxObjects, this.maxLevels, this.level + 1);

    this.nodes[2] = new QuadTree({
      minLng: this.bounds.minLng, minLat: this.bounds.minLat,
      maxLng: midX, maxLat: midY
    }, this.maxObjects, this.maxLevels, this.level + 1);

    this.nodes[3] = new QuadTree({
      minLng: midX, minLat: this.bounds.minLat,
      maxLng: this.bounds.maxLng, maxLat: midY
    }, this.maxObjects, this.maxLevels, this.level + 1);
  }

  getIndex(bbox) {
    const midX = (this.bounds.minLng + this.bounds.maxLng) / 2;
    const midY = (this.bounds.minLat + this.bounds.maxLat) / 2;

    const topQuadrant = (bbox.minLat > midY);
    const bottomQuadrant = (bbox.maxLat < midY);
    const leftQuadrant = (bbox.maxLng < midX);
    const rightQuadrant = (bbox.minLng > midX);

    if (topQuadrant) {
      if (rightQuadrant) return 0;
      if (leftQuadrant) return 1;
    } else if (bottomQuadrant) {
      if (leftQuadrant) return 2;
      if (rightQuadrant) return 3;
    }

    return -1;
  }

  insert(obj) {
    if (this.nodes.length > 0) {
      const index = this.getIndex(obj.bbox);
      if (index !== -1) {
        this.nodes[index].insert(obj);
        return;
      }
    }

    this.objects.push(obj);

    if (this.objects.length > this.maxObjects && this.level < this.maxLevels) {
      if (this.nodes.length === 0) {
        this.split();
      }

      let i = 0;
      while (i < this.objects.length) {
        const index = this.getIndex(this.objects[i].bbox);
        if (index !== -1) {
          this.nodes[index].insert(this.objects.splice(i, 1)[0]);
        } else {
          i++;
        }
      }
    }
  }

  query(bbox, found = []) {
    const index = this.getIndex(bbox);
    if (index !== -1 && this.nodes.length > 0) {
      this.nodes[index].query(bbox, found);
    }

    for (const obj of this.objects) {
      if (this.intersects(bbox, obj.bbox)) {
        found.push(obj);
      }
    }

    return found;
  }

  intersects(bbox1, bbox2) {
    return !(bbox1.maxLng < bbox2.minLng || 
             bbox1.minLng > bbox2.maxLng || 
             bbox1.maxLat < bbox2.minLat || 
             bbox1.minLat > bbox2.maxLat);
  }
}

// Create singleton instance
const geocoder = new EnhancedBarangayGeocoder();

// Export functions for backward compatibility
async function findBarangay(lat, lng, options = {}) {
  return await geocoder.findBarangay(lat, lng, options);
}

function getAllBarangays() {
  return geocoder.getAllBarangays();
}

function getMetadata() {
  return geocoder.getMetadata();
}

function getPerformanceStats() {
  return geocoder.getPerformanceStats();
}

module.exports = {
  findBarangay,
  getAllBarangays,
  getMetadata,
  getPerformanceStats,
  EnhancedBarangayGeocoder
}; 