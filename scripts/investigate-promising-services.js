const https = require('https');

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

async function investigateFeatureService(serviceUrl, serviceName) {
    console.log(`\n🔍 Investigating Feature Service: ${serviceName}`);
    console.log(`📌 URL: ${serviceUrl}`);
    
    try {
        // Get service metadata
        const serviceData = await fetchJSON(`${serviceUrl}?f=json`);
        
        if (serviceData.layers) {
            console.log(`✅ Found ${serviceData.layers.length} layers:`);
            
            serviceData.layers.forEach((layer, index) => {
                console.log(`\n   Layer ${index}:`);
                console.log(`   📌 Name: ${layer.name}`);
                console.log(`   📌 ID: ${layer.id}`);
                console.log(`   📌 Type: ${layer.type || 'Feature Layer'}`);
                
                // Check if this looks like barangay data
                if (layer.name.toLowerCase().includes('barangay') || 
                    layer.name.toLowerCase().includes('admin') ||
                    layer.name.toLowerCase().includes('boundary')) {
                    console.log(`   🏆 LIKELY BARANGAY LAYER: ${layer.name}`);
                    console.log(`   📌 Layer URL: ${serviceUrl}/${layer.id}`);
                }
            });
            
            // If we found potential barangay layers, get more details
            for (const layer of serviceData.layers) {
                if (layer.name.toLowerCase().includes('barangay') || 
                    layer.name.toLowerCase().includes('admin') ||
                    layer.name.toLowerCase().includes('boundary')) {
                    
                    console.log(`\n🔬 Detailed analysis of layer: ${layer.name}`);
                    try {
                        const layerData = await fetchJSON(`${serviceUrl}/${layer.id}?f=json`);
                        
                        console.log(`   📊 Geometry Type: ${layerData.geometryType}`);
                        console.log(`   📊 Feature Count: ${layerData.count || 'Unknown'}`);
                        
                        if (layerData.fields) {
                            console.log(`   📊 Fields (${layerData.fields.length}):`);
                            layerData.fields.slice(0, 10).forEach(field => {
                                console.log(`      - ${field.name} (${field.type})`);
                            });
                            if (layerData.fields.length > 10) {
                                console.log(`      ... and ${layerData.fields.length - 10} more fields`);
                            }
                        }
                        
                        // Try to get a sample feature
                        console.log(`\n   📝 Sample feature query:`);
                        const sampleQuery = `${serviceUrl}/${layer.id}/query?where=1=1&outFields=*&returnGeometry=false&resultRecordCount=1&f=json`;
                        const sampleData = await fetchJSON(sampleQuery);
                        
                        if (sampleData.features && sampleData.features.length > 0) {
                            const feature = sampleData.features[0];
                            console.log(`   ✅ Sample feature attributes:`);
                            Object.keys(feature.attributes).slice(0, 5).forEach(key => {
                                console.log(`      - ${key}: ${feature.attributes[key]}`);
                            });
                            
                            // Look for barangay name fields
                            const barangayFields = Object.keys(feature.attributes).filter(key =>
                                key.toLowerCase().includes('barangay') ||
                                key.toLowerCase().includes('brgy') ||
                                key.toLowerCase().includes('name')
                            );
                            
                            if (barangayFields.length > 0) {
                                console.log(`   🎯 Potential barangay name fields: ${barangayFields.join(', ')}`);
                            }
                        }
                        
                    } catch (error) {
                        console.log(`   ❌ Failed to get layer details: ${error.message}`);
                    }
                    
                    break; // Only analyze the first promising layer for now
                }
            }
        } else {
            console.log(`❌ No layers found in service`);
        }
        
    } catch (error) {
        console.log(`❌ Failed to investigate service: ${error.message}`);
    }
}

async function investigateWebMap(webMapId, webMapName) {
    console.log(`\n🗺️ Investigating Web Map: ${webMapName}`);
    console.log(`📌 ID: ${webMapId}`);
    
    try {
        // Get web map details
        const webMapUrl = `https://www.arcgis.com/sharing/rest/content/items/${webMapId}?f=json`;
        const webMapData = await fetchJSON(webMapUrl);
        console.log(`✅ Title: ${webMapData.title}`);
        console.log(`✅ Owner: ${webMapData.owner}`);
        
        // Get web map operational layers
        const webMapDataUrl = `https://www.arcgis.com/sharing/rest/content/items/${webMapId}/data?f=json`;
        const operationalData = await fetchJSON(webMapDataUrl);
        
        if (operationalData.operationalLayers && operationalData.operationalLayers.length > 0) {
            console.log(`✅ Found ${operationalData.operationalLayers.length} operational layers:`);
            
            operationalData.operationalLayers.forEach((layer, index) => {
                console.log(`\n   Layer ${index + 1}:`);
                console.log(`   📌 Title: ${layer.title || 'No title'}`);
                console.log(`   📌 Type: ${layer.layerType || layer.type || 'Unknown'}`);
                console.log(`   📌 URL: ${layer.url || 'No URL'}`);
                
                if (layer.url && (layer.url.includes('FeatureServer') || layer.url.includes('MapServer'))) {
                    console.log(`   🎯 POTENTIAL DATA SOURCE: ${layer.url}`);
                    
                    if (layer.title && (layer.title.toLowerCase().includes('barangay') ||
                        layer.title.toLowerCase().includes('admin') ||
                        layer.title.toLowerCase().includes('boundary'))) {
                        console.log(`   🏆 LIKELY BARANGAY LAYER: ${layer.title}`);
                    }
                }
            });
        } else {
            console.log(`❌ No operational layers found in web map`);
        }
        
    } catch (error) {
        console.log(`❌ Failed to investigate web map: ${error.message}`);
    }
}

async function main() {
    console.log('🔍 Investigating Promising Davao City Services...');
    
    // Most promising candidates
    const candidates = [
        {
            type: 'webmap',
            id: '3d84cfb18542480f82796171431549f9',
            name: 'Davao City Airshed Online Map'
        },
        {
            type: 'webmap',
            id: '4f376cf6227340b88a1c9d1e5668a0c3',
            name: 'Davao City Covid Cases per Barangay'
        },
        {
            type: 'feature_service',
            url: 'https://services5.arcgis.com/jWIEmDpiJeMDAn4G/arcgis/rest/services/Davao_City_WFL1/FeatureServer',
            name: 'Davao City_WFL1'
        },
        {
            type: 'feature_service',
            url: 'https://services6.arcgis.com/TVMck5zIWiWcufgV/arcgis/rest/services/Davao/FeatureServer',
            name: 'Davao'
        }
    ];
    
    for (const candidate of candidates) {
        try {
            if (candidate.type === 'webmap') {
                await investigateWebMap(candidate.id, candidate.name);
            } else if (candidate.type === 'feature_service') {
                await investigateFeatureService(candidate.url, candidate.name);
            }
            
            // Add delay between requests
            await new Promise(resolve => setTimeout(resolve, 2000));
            
        } catch (error) {
            console.log(`❌ Error investigating ${candidate.name}: ${error.message}`);
        }
    }
}

main(); 