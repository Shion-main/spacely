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

async function investigateArcGISService() {
    console.log('🔍 Investigating Davao City ArcGIS Service...');
    
    const appId = '93405292386245b9b789c5cb89ce7971';
    
    try {
        // 1. Get app item details
        console.log('\n📋 Step 1: Fetching app item details...');
        const itemUrl = `https://www.arcgis.com/sharing/rest/content/items/${appId}?f=json`;
        const itemData = await fetchJSON(itemUrl);
        
        if (typeof itemData === 'object' && itemData.type) {
            console.log('✅ Item Type:', itemData.type);
            console.log('✅ Title:', itemData.title);
            console.log('✅ Owner:', itemData.owner);
            
            // 2. Get app data to find web map source
            if (itemData.type === 'Web Mapping Application') {
                console.log('\n📋 Step 2: Fetching web map data...');
                const dataUrl = `https://www.arcgis.com/sharing/rest/content/items/${appId}/data?f=json`;
                const appData = await fetchJSON(dataUrl);
                
                console.log('📋 App data type:', typeof appData);
                console.log('📋 App data keys:', Object.keys(appData || {}));
                
                // Check for 'source' field which points to the actual web map
                if (typeof appData === 'object' && appData.source) {
                    const sourceId = appData.source;
                    console.log('✅ Found Web Map Source ID:', sourceId);
                    
                    // 3. Get source app details
                    console.log('\n📋 Step 3: Fetching source app details...');
                    const sourceUrl = `https://www.arcgis.com/sharing/rest/content/items/${sourceId}?f=json`;
                    const sourceData = await fetchJSON(sourceUrl);
                    console.log('✅ Source Title:', sourceData.title);
                    console.log('✅ Source Type:', sourceData.type);
                    
                    // 4. Get source app configuration
                    console.log('\n📋 Step 4: Fetching source app configuration...');
                    const sourceDataUrl = `https://www.arcgis.com/sharing/rest/content/items/${sourceId}/data?f=json`;
                    const sourceConfigData = await fetchJSON(sourceDataUrl);
                    
                    console.log('📋 Source config keys:', Object.keys(sourceConfigData || {}));
                    
                    // Look for web map ID in the values or configurationSettings
                    let webMapId = null;
                    
                    if (sourceConfigData.values) {
                        console.log('📋 Values keys:', Object.keys(sourceConfigData.values || {}));
                        
                        // Look for common web map reference patterns
                        if (sourceConfigData.values.webmap) {
                            webMapId = sourceConfigData.values.webmap;
                            console.log('✅ Found webmap in values:', webMapId);
                        } else if (sourceConfigData.values.map) {
                            webMapId = sourceConfigData.values.map;
                            console.log('✅ Found map in values:', webMapId);
                        } else {
                            // Look for any field that looks like a map ID
                            for (const [key, value] of Object.entries(sourceConfigData.values)) {
                                if (typeof value === 'string' && value.length === 32 && value.match(/^[a-f0-9]+$/)) {
                                    console.log(`✅ Potential map ID found in ${key}:`, value);
                                    webMapId = value;
                                    break;
                                }
                            }
                        }
                    }
                    
                    if (sourceConfigData.configurationSettings) {
                        console.log('📋 Configuration settings found');
                        // Add logic to explore configuration settings if needed
                    }
                    
                    // 5. If we found a web map ID, explore it
                    if (webMapId) {
                        console.log(`\n📋 Step 5: Exploring web map ${webMapId}...`);
                        const webMapUrl = `https://www.arcgis.com/sharing/rest/content/items/${webMapId}?f=json`;
                        const webMapData = await fetchJSON(webMapUrl);
                        console.log('✅ Web Map Title:', webMapData.title);
                        console.log('✅ Web Map Type:', webMapData.type);
                        
                        // Get web map operational layers
                        console.log('\n📋 Step 6: Fetching web map operational layers...');
                        const webMapDataUrl = `https://www.arcgis.com/sharing/rest/content/items/${webMapId}/data?f=json`;
                        const operationalData = await fetchJSON(webMapDataUrl);
                        
                        console.log('📋 Web map data keys:', Object.keys(operationalData || {}));
                        
                        if (operationalData.operationalLayers && operationalData.operationalLayers.length > 0) {
                            console.log(`✅ Found ${operationalData.operationalLayers.length} operational layers:`);
                            operationalData.operationalLayers.forEach((layer, index) => {
                                console.log(`\n   Layer ${index + 1}:`);
                                console.log(`   📌 Title: ${layer.title || 'No title'}`);
                                console.log(`   📌 Type: ${layer.layerType || layer.type || 'Unknown'}`);
                                console.log(`   📌 URL: ${layer.url || 'No URL'}`);
                                
                                if (layer.url && (layer.url.includes('FeatureServer') || layer.url.includes('MapServer'))) {
                                    console.log(`   🎯 POTENTIAL BARANGAY DATA SOURCE: ${layer.url}`);
                                    
                                    if (layer.title && layer.title.toLowerCase().includes('barangay')) {
                                        console.log(`   🏆 LIKELY BARANGAY LAYER: ${layer.title}`);
                                    }
                                }
                            });
                        } else {
                            console.log('❌ No operational layers found in web map');
                            
                            // Check other possible layer locations
                            if (operationalData.baseMap && operationalData.baseMap.baseMapLayers) {
                                console.log(`📋 Found ${operationalData.baseMap.baseMapLayers.length} base map layers`);
                            }
                            
                            if (operationalData.layers) {
                                console.log(`📋 Found 'layers' array with ${operationalData.layers.length} items`);
                            }
                        }
                        
                    } else {
                        console.log('❌ Could not find web map ID in source configuration');
                        console.log('📋 Full values object:', JSON.stringify(sourceConfigData.values || {}, null, 2));
                    }
                    
                } else {
                    console.log('❌ No source found in app data');
                    console.log('📋 Available keys:', Object.keys(appData || {}));
                }
                
            } else {
                console.log(`❌ Not a Web Mapping Application: ${itemData.type}`);
            }
        } else {
            console.log('❌ Failed to parse item data or no type found');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('❌ Stack:', error.stack);
    }
}

investigateArcGISService(); 