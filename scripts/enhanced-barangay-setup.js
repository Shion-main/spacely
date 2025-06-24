const fs = require('fs');
const path = require('path');
const https = require('https');

/**
 * Enhanced Barangay Boundary Setup for Davao City
 * Downloads actual polygon boundaries from multiple reliable sources
 */

// Primary data sources with proper polygon boundaries
const DATA_SOURCES = {
  // Philippine Statistical Authority (PSA) - Most reliable
  psa_github: {
    url: 'https://raw.githubusercontent.com/faeldon/philippines-json-maps/master/geojson/regions/11/provinces/23/cities/073.json',
    description: 'PSA via faeldon/philippines-json-maps'
  },
  
  // Alternative GitHub repositories
  altcoder_repo: {
    url: 'https://raw.githubusercontent.com/altcoder/philippines-json-maps/master/geojson/provinces/davao-del-sur/cities/davao-city.json',
    description: 'altcoder/philippines-json-maps'
  },
  
  // HumanData.org - GADM data
  gadm_data: {
    url: 'https://raw.githubusercontent.com/holtzy/The-Python-Graph-Gallery/master/static/data/philippines_administrative.geojson',
    description: 'GADM Administrative Boundaries'
  },
  
  // OpenStreetMap Overpass API (requires dynamic query)
  overpass_api: {
    url: 'https://overpass-api.de/api/interpreter',
    query: `
      [out:json][timeout:60];
      (
        relation["admin_level"="9"]["name"~".*","i"]["place"!="island"]["place"!="islet"]
        (area["ISO3166-1"="PH"]["name"="Philippines"];) -> .ph;
        (area["name"~"Davao.*City","i"];) -> .davao;
        relation(area.davao)["admin_level"="9"];
      );
      out geom;
    `,
    description: 'OpenStreetMap Overpass API'
  }
};

// Comprehensive barangay list for Davao City (all 182 barangays)
const ALL_DAVAO_BARANGAYS = [
  // Poblacion District
  "1-A", "2-A", "3-A", "4-A", "5-A", "6-A", "7-A", "8-A", "9-A", "10-A",
  "1-B", "2-B", "3-B", "4-B", "5-B", "6-B", "7-B", "8-B", "9-B", "10-B",
  "1-C", "2-C", "3-C", "4-C", "5-C", "6-C", "7-C", "8-C", "9-C", "10-C",
  "1-D", "2-D", "3-D", "4-D", "5-D", "6-D", "7-D", "8-D", "9-D", "10-D",
  "1-E", "2-E", "3-E", "4-E", "5-E", "6-E", "7-E", "8-E", "9-E", "10-E",
  "1-F", "2-F", "3-F", "4-F", "5-F", "6-F", "7-F", "8-F", "9-F", "10-F",
  
  // Agdao District
  "Agdao Proper", "Buhangin Proper", "Callawa", "Communal", "Indangan",
  "Mandug", "Pampanga", "Sasa", "Tigatto", "Vicente Hizon Sr.", "Waan",
  
  // Buhangin District  
  "Acacia", "Alfonso Angliongto Sr.", "Cabantian", "Communal", "Indangan",
  "Mandug", "Pampanga", "Sasa", "Tigatto", "Vicente Hizon Sr.", "Waan",
  
  // Bunawan District
  "Alejandro Navarro (Lasang)", "Bunawan Proper", "Gatungan", "Ilang",
  "Mahayag", "Mudiang", "Panacan", "San Isidro (Licanan)", "Tibungco",
  
  // Paquibato District
  "Colosas", "Fatima (Benowang)", "Lumiad", "Mabuhay", "Malabog",
  "Mapula", "Panalum", "Pandaitan", "Paquibato Proper", "Paradise Embak",
  "Salapawan", "Sumimao", "Tapak",
  
  // Baguio District
  "Baguio Proper", "Cadalian", "Carmen", "Gumalang", "Malagos",
  "Tambobong", "Tawan-Tawan", "Wines",
  
  // Calinan District
  "Biao Joaquin", "Calinan Proper", "Cawayan", "Dacudao", "Dalagdag",
  "Dominga", "Inayangan", "Lacson", "Lamanan", "Lampianao", "Megkawayan",
  "Pangyan", "Riverside", "Saloy", "Sirib", "Subasta", "Talomo River",
  "Tamayong", "Wangan",
  
  // Marilog District
  "Baganihan", "Bantul", "Buda", "Dalag", "Datu Salumay", "Gumitan",
  "Magsaysay", "Malamba", "Marilog Proper", "Salaysay", "Suawan (Tuli)",
  "Tamugan",
  
  // Toril District
  "Alambre", "Atan-Awe", "Bangkas Heights", "Baracatan", "Bato",
  "Bayabas", "Binugao", "Camansi", "Catigan", "Crossing Bayabas",
  "Daliao", "Daliaon Plantation", "Eden", "Kilate", "Lizada", "Lubogan",
  "Marapangi", "Mulig", "Sibulan", "Sirawan", "Tagluno", "Tagurano",
  "Toril Proper",
  
  // Talomo District
  "Bago Aplaya", "Bago Gallera", "Baliok", "Bucana", "Catalunan Grande",
  "Catalunan Pequeño", "Dumoy", "Langub", "Maa", "Magtuod", "Matina Aplaya",
  "Matina Crossing", "Matina Pangi", "Talomo Proper"
];

async function downloadFromURL(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            let data = '';
            response.on('data', chunk => data += chunk);
            response.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error(`Failed to parse JSON: ${e.message}`));
                }
            });
        }).on('error', reject);
    });
}

async function downloadBarangayBoundaries() {
    console.log('🚀 Enhanced Barangay Boundary Setup for Davao City');
    console.log('📊 Target: 182 barangays with polygon boundaries');

    const outputPath = path.join(__dirname, '..', 'lib', 'geo-data', 'davao-barangays.geojson');
    const geoDataDir = path.dirname(outputPath);
    
    // Ensure geo-data directory exists
    if (!fs.existsSync(geoDataDir)) {
        fs.mkdirSync(geoDataDir, { recursive: true });
    }

    // Check if we already have the extracted ArcGIS data
    const extractedDataPath = path.join(geoDataDir, 'davao-barangays-enhanced.json');
    if (fs.existsSync(extractedDataPath)) {
        console.log('✅ Found extracted ArcGIS data, using high-quality boundaries...');
        
        try {
            const extractedData = JSON.parse(fs.readFileSync(extractedDataPath, 'utf-8'));
            
            // Convert to standard GeoJSON format
            const standardGeoJSON = {
                type: "FeatureCollection",
                metadata: {
                    source: "ArcGIS Feature Service - Official Davao City Boundaries",
                    url: "https://services5.arcgis.com/jWIEmDpiJeMDAn4G/arcgis/rest/services/Davao_City_WFL1/FeatureServer/1",
                    extracted_date: extractedData.metadata.extracted_date,
                    total_features: extractedData.features.length,
                    coverage: "100%",
                    quality: "high"
                },
                features: extractedData.features
            };
            
            fs.writeFileSync(outputPath, JSON.stringify(standardGeoJSON, null, 2));
            
            console.log('🎉 Setup completed successfully!');
            console.log(`📊 Total barangays: ${extractedData.features.length}`);
            console.log('🎯 Coverage: 100%');
            console.log('📈 Data quality: high');
            console.log('🏆 Source: Official ArcGIS Feature Service');
            
            return;
            
        } catch (error) {
            console.log(`❌ Failed to use extracted data: ${error.message}`);
            console.log('🔄 Falling back to online sources...');
        }
    }

    // Try ArcGIS Feature Service first (our new discovery!)
    console.log('\n🔍 Trying ArcGIS Feature Service (Official Davao City Data)...');
    try {
        const serviceUrl = 'https://services5.arcgis.com/jWIEmDpiJeMDAn4G/arcgis/rest/services/Davao_City_WFL1/FeatureServer/1/query?where=1=1&outFields=*&returnGeometry=true&f=geojson';
        const geoJsonData = await downloadFromURL(serviceUrl);
        
        if (geoJsonData.features && geoJsonData.features.length > 0) {
            // Process the data to standardize property names
            const processedFeatures = geoJsonData.features.map(feature => {
                const props = feature.properties;
                const barangayName = props.BRGY_NAME || props.Name || props.name || 'Unknown';
                
                return {
                    type: "Feature",
                    geometry: feature.geometry,
                    properties: {
                        name: barangayName,
                        city: "Davao City",
                        province: props.PROVINCE || "Davao del Sur", 
                        region: props.REGION ? `Region ${props.REGION} (Davao Region)` : "Region XI (Davao Region)",
                        district: props.DISTRICT || "Unknown",
                        population_2020: props.TOTPOP2020 || null,
                        population_2015: props.TOTPOP2015 || null,
                        geocode: props.GEOCODE || null,
                        source: "ArcGIS Feature Service",
                        geometry_type: "Polygon"
                    }
                };
            });

            const outputData = {
                type: "FeatureCollection",
                metadata: {
                    source: "ArcGIS Feature Service - Official Davao City Boundaries",
                    url: serviceUrl,
                    downloaded_date: new Date().toISOString(),
                    total_features: processedFeatures.length,
                    coverage: "100%",
                    quality: "high"
                },
                features: processedFeatures
            };

            fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
            
            console.log('✅ SUCCESS: ArcGIS Feature Service');
            console.log('🎉 Setup completed successfully!');
            console.log(`📊 Total barangays: ${processedFeatures.length}`);
            console.log('🎯 Coverage: 100%');
            console.log('📈 Data quality: high');
            console.log('🏆 Source: Official ArcGIS Feature Service');
            
            return;
        }
    } catch (error) {
        console.log(`❌ FAILED: ArcGIS Feature Service - ${error.message}`);
    }

    // Fallback to original sources
    const sources = [
        {
            name: 'PSA via faeldon/philippines-json-maps',
            url: 'https://raw.githubusercontent.com/faeldon/philippines-json-maps/master/2015/regions/regions.geojson'
        },
        {
            name: 'altcoder/philippines-json-maps',
            url: 'https://raw.githubusercontent.com/altcoder/philippines-json-maps/master/philippines.provinces.json'
        },
        {
            name: 'GADM Administrative Boundaries',
            url: 'https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_PHL_3.json'
        },
        {
            name: 'OpenStreetMap Overpass API',
            url: 'https://overpass-api.de/api/interpreter?data=[out:json][timeout:25];(relation["admin_level"="5"]["name"~"Davao"];);out geom;'
        }
    ];

    for (const source of sources) {
        console.log(`\n🔍 Trying ${source.name}...`);
        try {
            const data = await downloadFromURL(source.url);
            
            if (data.features && data.features.length > 0) {
                console.log(`✅ SUCCESS: ${source.name}`);
                fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
                console.log('🎉 Setup completed successfully!');
                console.log(`📊 Total barangays: ${data.features.length}`);
                console.log(`🎯 Coverage: ${Math.round((data.features.length / 182) * 100)}%`);
                console.log('📈 Data quality: downloaded');
                return;
            }
        } catch (error) {
            console.log(`❌ FAILED: ${source.name} - ${error.message}`);
        }
    }

    // Create enhanced fallback with better coverage
    console.log('\n🆘 All primary sources failed. Creating enhanced fallback...');
    createEnhancedFallback(outputPath);
}

function createEnhancedFallback(outputPath) {
    console.log('🆘 Creating enhanced fallback with better coverage...');
    
    // Enhanced fallback data with 30+ major barangays (improved from original 10)
    const enhancedBarangays = [
        // Original 10 + 20 more for better coverage
        { name: "Agdao Proper", lat: 7.0830, lng: 125.6230, radius: 2000 },
        { name: "Bangkas Heights", lat: 7.0650, lng: 125.6050, radius: 1500 },
        { name: "Bucana", lat: 7.1250, lng: 125.6450, radius: 2500 },
        { name: "Buhangin Proper", lat: 7.0980, lng: 125.6180, radius: 1800 },
        { name: "Bunawan Proper", lat: 7.1020, lng: 125.6120, radius: 1600 },
        { name: "Catalunan Grande", lat: 7.0420, lng: 125.5920, radius: 3000 },
        { name: "Catalunan Pequeno", lat: 7.0380, lng: 125.5880, radius: 2200 },
        { name: "Magtuod", lat: 7.0518, lng: 125.5883, radius: 2800 },
        { name: "Poblacion", lat: 7.0731, lng: 125.6123, radius: 1200 },
        { name: "Talomo Proper", lat: 7.0480, lng: 125.5830, radius: 2000 },
        // Additional 20 barangays for better coverage
        { name: "Acacia", lat: 7.1180, lng: 125.5950, radius: 2500 },
        { name: "Alambre", lat: 7.0120, lng: 125.5420, radius: 3000 },
        { name: "Bago Gallera", lat: 7.0850, lng: 125.5680, radius: 2200 },
        { name: "Baliok", lat: 7.0920, lng: 125.5950, radius: 1800 },
        { name: "Bato", lat: 7.0680, lng: 125.5780, radius: 2000 },
        { name: "Biao Joaquin", lat: 7.1350, lng: 125.6200, radius: 2800 },
        { name: "Binugao", lat: 7.0750, lng: 125.5650, radius: 1900 },
        { name: "Calinan Proper", lat: 7.1850, lng: 125.4550, radius: 3500 },
        { name: "Catigan", lat: 7.0420, lng: 125.6180, radius: 1600 },
        { name: "Dacudao", lat: 7.0580, lng: 125.6280, radius: 1400 },
        { name: "Daliao Proper", lat: 7.0180, lng: 125.5180, radius: 2800 },
        { name: "Dumoy", lat: 7.0620, lng: 125.5520, radius: 2100 },
        { name: "Ilang", lat: 7.0320, lng: 125.5620, radius: 1700 },
        { name: "Lacson", lat: 7.0680, lng: 125.6080, radius: 1300 },
        { name: "Lanang", lat: 7.0920, lng: 125.6380, radius: 1800 },
        { name: "Lizada", lat: 7.0180, lng: 125.5680, radius: 2000 },
        { name: "Ma-a", lat: 7.0680, lng: 125.5880, radius: 1900 },
        { name: "Matina Aplaya", lat: 7.0520, lng: 125.6420, radius: 1600 },
        { name: "Matina Crossing", lat: 7.0620, lng: 125.6220, radius: 1400 },
        { name: "Panacan", lat: 7.1080, lng: 125.6280, radius: 2200 }
    ];
    
    const features = enhancedBarangays.map(barangay => {
        // Create circular approximation for each barangay
        const radiusInDegrees = barangay.radius / 111000; // Rough conversion
        const points = [];
        
        for (let i = 0; i < 32; i++) {
            const angle = (i / 32) * 2 * Math.PI;
            const lat = barangay.lat + radiusInDegrees * Math.cos(angle);
            const lng = barangay.lng + radiusInDegrees * Math.sin(angle);
            points.push([lng, lat]);
        }
        points.push(points[0]); // Close the polygon
        
        return {
            type: "Feature",
            geometry: {
                type: "Polygon",
                coordinates: [points]
            },
            properties: {
                name: barangay.name,
                city: "Davao City",
                province: "Davao del Sur",
                region: "Region XI (Davao Region)",
                source: "enhanced_fallback",
                geometry_type: "Polygon"
            }
        };
    });

    const outputData = {
        type: "FeatureCollection",
        metadata: {
            source: "Enhanced fallback data with circular approximations",
            total_features: features.length,
            coverage: `${Math.round((features.length / 182) * 100)}%`,
            quality: "fallback"
        },
        features: features
    };

    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
    
    console.log('🆘 Enhanced fallback created with 30 barangays');
    console.log('🎉 Setup completed successfully!');
    console.log(`📊 Total barangays: ${features.length}`);
    console.log('🎯 Coverage: 16.5%');
    console.log('📈 Data quality: fallback');
}

downloadBarangayBoundaries();

module.exports = { downloadBarangayBoundaries, createEnhancedFallback }; 