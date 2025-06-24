const fs = require('fs');
const path = require('path');
const https = require('https');

// Davao City barangay boundaries from Philippine Statistical Authority (PSA)
// This is a curated GeoJSON file containing accurate barangay boundaries
const DAVAO_BARANGAYS_GEOJSON_URL = 'https://raw.githubusercontent.com/faeldon/philippines-json-maps/master/geojson/regions/11/provinces/23/cities/073.json';

// Alternative sources (backup)
const ALTERNATIVE_SOURCES = [
  'https://raw.githubusercontent.com/altcoder/philippines-json-maps/master/geojson/provinces/davao-del-sur/cities/davao-city.json',
  'https://raw.githubusercontent.com/ciatph/philippines-json-maps/master/src/data/provinces/23/cities/073.json'
];

async function downloadBarangayData() {
  console.log('📍 Downloading Davao City barangay boundaries...');
  
  const outputDir = path.join(__dirname, '..', 'lib', 'geo-data');
  const outputFile = path.join(outputDir, 'davao-barangays.geojson');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    const data = await downloadFromUrl(DAVAO_BARANGAYS_GEOJSON_URL);
    
    // Validate and process the GeoJSON
    const geojson = JSON.parse(data);
    const processedData = processBarangayData(geojson);
    
    // Save to file
    fs.writeFileSync(outputFile, JSON.stringify(processedData, null, 2));
    console.log(`✅ Barangay data saved to: ${outputFile}`);
    console.log(`📊 Total barangays: ${processedData.features.length}`);
    
    return processedData;
  } catch (error) {
    console.error('❌ Error downloading primary source:', error.message);
    console.log('🔄 Trying alternative sources...');
    
    for (const altUrl of ALTERNATIVE_SOURCES) {
      try {
        const data = await downloadFromUrl(altUrl);
        const geojson = JSON.parse(data);
        const processedData = processBarangayData(geojson);
        
        fs.writeFileSync(outputFile, JSON.stringify(processedData, null, 2));
        console.log(`✅ Barangay data saved from alternative source: ${outputFile}`);
        return processedData;
      } catch (altError) {
        console.log(`⚠️ Alternative source failed: ${altUrl}`);
      }
    }
    
    throw new Error('All data sources failed. Creating fallback data...');
  }
}

function downloadFromUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }
      
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function processBarangayData(geojson) {
  // Ensure it's a valid FeatureCollection
  if (geojson.type !== 'FeatureCollection') {
    throw new Error('Invalid GeoJSON: Expected FeatureCollection');
  }

  // Process and clean the features
  const processedFeatures = geojson.features.map(feature => {
    const props = feature.properties || {};
    
    // Standardize property names (different sources use different field names)
    const barangayName = props.NAME || props.name || props.BARANGAY || props.barangay || 'Unknown';
    
    return {
      type: 'Feature',
      properties: {
        name: barangayName,
        city: 'Davao City',
        province: 'Davao del Sur',
        region: 'Region XI (Davao Region)',
        // Keep original properties for reference
        original: props
      },
      geometry: feature.geometry
    };
  });

  return {
    type: 'FeatureCollection',
    metadata: {
      source: 'Philippine Statistical Authority',
      city: 'Davao City',
      province: 'Davao del Sur',
      totalBarangays: processedFeatures.length,
      lastUpdated: new Date().toISOString()
    },
    features: processedFeatures
  };
}

// Fallback: Create basic barangay data if download fails
function createFallbackData() {
  console.log('🆘 Creating fallback barangay data...');
  
  // This is a simplified dataset with approximate center points for major barangays
  const fallbackBarangays = [
    { name: 'Talomo', lat: 7.048, lng: 125.583 },
    { name: 'Buhangin', lat: 7.087, lng: 125.613 },
    { name: 'Poblacion', lat: 7.073, lng: 125.612 },
    { name: 'Agdao', lat: 7.083, lng: 125.623 },
    { name: 'Bankerohan', lat: 7.068, lng: 125.608 },
    { name: 'Matina', lat: 7.052, lng: 125.608 },
    { name: 'Tugbok', lat: 7.128, lng: 125.558 },
    { name: 'Toril', lat: 6.992, lng: 125.507 },
    { name: 'Calinan', lat: 7.178, lng: 125.458 },
    { name: 'Baguio', lat: 7.238, lng: 125.427 }
  ];

  const features = fallbackBarangays.map(brgy => ({
    type: 'Feature',
    properties: {
      name: brgy.name,
      city: 'Davao City',
      province: 'Davao del Sur',
      region: 'Region XI (Davao Region)',
      fallback: true
    },
    geometry: {
      type: 'Point',
      coordinates: [brgy.lng, brgy.lat]
    }
  }));

  return {
    type: 'FeatureCollection',
    metadata: {
      source: 'Fallback Data',
      city: 'Davao City',
      province: 'Davao del Sur',
      totalBarangays: features.length,
      lastUpdated: new Date().toISOString(),
      note: 'This is fallback data with approximate coordinates. Download proper boundary data for production use.'
    },
    features
  };
}

// Run the script
if (require.main === module) {
  downloadBarangayData()
    .catch(error => {
      console.error('❌ Setup failed:', error.message);
      
      // Create fallback data
      const fallbackData = createFallbackData();
      const outputDir = path.join(__dirname, '..', 'lib', 'geo-data');
      const outputFile = path.join(outputDir, 'davao-barangays.geojson');
      
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      fs.writeFileSync(outputFile, JSON.stringify(fallbackData, null, 2));
      console.log(`🆘 Fallback data created: ${outputFile}`);
    });
}

module.exports = { downloadBarangayData, createFallbackData }; 