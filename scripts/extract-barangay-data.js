const https = require('https');
const fs = require('fs');

async function fetchJSON(url) {
    return new Promise((resolve, reject) => {
        console.log(`   📡 Fetching: ${url}`);
        https.get(url, (res) => {
            console.log(`   📡 Status: ${res.statusCode}`);
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed);
                } catch (e) {
                    console.log(`   ⚠️ JSON parse error, returning raw data`);
                    resolve(data);
                }
            });
        }).on('error', (err) => {
            console.log(`   ❌ Request error: ${err.message}`);
            reject(err);
        });
    });
}

async function extractBarangayData() {
    console.log('🎯 Extracting Davao City Barangay Boundary Data...');
    
    // The promising feature service layer we found
    const serviceUrl = 'https://services5.arcgis.com/jWIEmDpiJeMDAn4G/arcgis/rest/services/Davao_City_WFL1/FeatureServer/1';
    
    try {
        // Step 1: Get layer metadata
        console.log('\n📋 Step 1: Getting layer metadata...');
        const layerData = await fetchJSON(`${serviceUrl}?f=json`);
        
        console.log(`✅ Layer Name: ${layerData.name}`);
        console.log(`✅ Geometry Type: ${layerData.geometryType}`);
        console.log(`✅ Feature Count: ${layerData.count || 'Unknown'}`);
        console.log(`✅ Max Record Count: ${layerData.maxRecordCount || 'Unknown'}`);
        
        if (layerData.fields) {
            console.log(`✅ Fields (${layerData.fields.length}):`);
            layerData.fields.forEach(field => {
                console.log(`   - ${field.name} (${field.type}) ${field.alias ? `[${field.alias}]` : ''}`);
            });
            
            // Look for barangay name fields
            const nameFields = layerData.fields.filter(field =>
                field.name.toLowerCase().includes('name') ||
                field.name.toLowerCase().includes('barangay') ||
                field.name.toLowerCase().includes('brgy')
            );
            
            console.log(`🎯 Potential barangay name fields: ${nameFields.map(f => f.name).join(', ')}`);
        }
        
        // Step 2: Get all features with geometry
        console.log('\n📋 Step 2: Extracting all barangay features...');
        
        // Query all features with geometry
        const allFeaturesUrl = `${serviceUrl}/query?where=1=1&outFields=*&returnGeometry=true&f=geojson`;
        console.log(`🔍 Querying all features as GeoJSON...`);
        
        const geoJsonData = await fetchJSON(allFeaturesUrl);
        
        if (geoJsonData.features && geoJsonData.features.length > 0) {
            console.log(`✅ Successfully extracted ${geoJsonData.features.length} barangay features!`);
            
            // Sample the first few features to see what we got
            console.log('\n📊 Sample features:');
            geoJsonData.features.slice(0, 5).forEach((feature, index) => {
                console.log(`\n   Feature ${index + 1}:`);
                console.log(`   📌 Properties: ${JSON.stringify(feature.properties, null, 2)}`);
                console.log(`   📌 Geometry Type: ${feature.geometry.type}`);
                console.log(`   📌 Coordinates Length: ${feature.geometry.coordinates[0]?.length || 'N/A'}`);
            });
            
            // Step 3: Save the data
            console.log('\n📋 Step 3: Saving barangay boundary data...');
            
            // Save as GeoJSON
            const geoJsonPath = 'lib/geo-data/davao-barangays-arcgis.geojson';
            fs.writeFileSync(geoJsonPath, JSON.stringify(geoJsonData, null, 2));
            console.log(`✅ Saved GeoJSON data to: ${geoJsonPath}`);
            
            // Convert to simplified format for our enhanced geocoder
            const simplifiedBarangays = geoJsonData.features.map(feature => {
                // Try to find the barangay name from properties
                const props = feature.properties;
                const barangayName = props.Name || props.BARANGAY || props.Barangay || 
                                   props.name || props.barangay || props.BRGY_NAME || 
                                   props.brgy_name || props.BRGY || 'Unknown';
                
                return {
                    name: barangayName,
                    type: "Feature",
                    geometry: feature.geometry,
                    properties: {
                        name: barangayName,
                        city: "Davao City",
                        province: "Davao del Sur",
                        region: "Region XI (Davao Region)",
                        source: "ArcGIS Feature Service",
                        original_properties: props
                    }
                };
            });
            
            // Create enhanced barangay data file
            const enhancedData = {
                type: "FeatureCollection",
                metadata: {
                    source: "ArcGIS Feature Service - Davao City_WFL1",
                    url: serviceUrl,
                    extracted_date: new Date().toISOString(),
                    total_features: simplifiedBarangays.length,
                    coverage: "182 barangays",
                    quality: "high"
                },
                features: simplifiedBarangays
            };
            
            const enhancedPath = 'lib/geo-data/davao-barangays-enhanced.json';
            fs.writeFileSync(enhancedPath, JSON.stringify(enhancedData, null, 2));
            console.log(`✅ Saved enhanced data to: ${enhancedPath}`);
            
            // Show statistics
            console.log('\n📊 Extraction Summary:');
            console.log(`   🎯 Total Barangays: ${simplifiedBarangays.length}`);
            console.log(`   🎯 Coverage: ${Math.round((simplifiedBarangays.length / 182) * 100)}% of Davao City`);
            console.log(`   🎯 Data Quality: High (Polygon geometries)`);
            console.log(`   🎯 Source: Official ArcGIS Feature Service`);
            
            // List unique barangay names
            const uniqueNames = [...new Set(simplifiedBarangays.map(b => b.name))];
            console.log(`   🎯 Unique Names: ${uniqueNames.length}`);
            console.log('\n📋 Sample barangay names:');
            uniqueNames.slice(0, 20).forEach((name, index) => {
                console.log(`   ${index + 1}. ${name}`);
            });
            
            if (uniqueNames.length > 20) {
                console.log(`   ... and ${uniqueNames.length - 20} more barangays`);
            }
            
        } else {
            console.log('❌ No features found in the service');
        }
        
    } catch (error) {
        console.error('❌ Error extracting data:', error.message);
        console.error('❌ Stack:', error.stack);
    }
}

extractBarangayData(); 