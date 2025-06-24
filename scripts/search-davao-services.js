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

async function searchDavaoServices() {
    console.log('🔍 Searching for Davao City Barangay Services...');
    
    try {
        // Search approach 1: Search ArcGIS Online for public items
        console.log('\n📋 Step 1: Searching ArcGIS Online for Davao City items...');
        const searchTerms = [
            'Davao City barangay',
            'Davao barangay boundaries',
            'Davao administrative boundaries',
            'owner:chuckzmaverick'  // The owner we found earlier
        ];
        
        for (const term of searchTerms) {
            console.log(`\n🔍 Searching for: "${term}"`);
            const encodedTerm = encodeURIComponent(term);
            const searchUrl = `https://www.arcgis.com/sharing/rest/search?q=${encodedTerm}&f=json&num=10&start=1`;
            
            try {
                const searchResults = await fetchJSON(searchUrl);
                
                if (searchResults.results && searchResults.results.length > 0) {
                    console.log(`✅ Found ${searchResults.results.length} results:`);
                    
                    searchResults.results.forEach((item, index) => {
                        console.log(`\n   Item ${index + 1}:`);
                        console.log(`   📌 Title: ${item.title}`);
                        console.log(`   📌 Type: ${item.type}`);
                        console.log(`   📌 Owner: ${item.owner}`);
                        console.log(`   📌 ID: ${item.id}`);
                        
                        if (item.url) {
                            console.log(`   📌 URL: ${item.url}`);
                        }
                        
                        // Check if this looks like a feature service
                        if (item.type === 'Feature Service' || item.type === 'Map Service') {
                            console.log(`   🎯 POTENTIAL DATA SOURCE: ${item.type}`);
                            
                            if (item.title.toLowerCase().includes('barangay')) {
                                console.log(`   🏆 LIKELY BARANGAY DATA: ${item.title}`);
                            }
                        }
                        
                        // Check if this is a web map
                        if (item.type === 'Web Map') {
                            console.log(`   🗺️ WEB MAP FOUND: ${item.title}`);
                        }
                    });
                } else {
                    console.log(`❌ No results found for "${term}"`);
                }
                
            } catch (error) {
                console.log(`❌ Search failed for "${term}": ${error.message}`);
            }
            
            // Add a small delay between searches
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Search approach 2: Look for common Philippine administrative data sources
        console.log('\n📋 Step 2: Checking common Philippine data sources...');
        
        const commonSources = [
            'https://services1.arcgis.com/LJXCnwJLQ3Zk3Y8h/arcgis/rest/services',  // Common Philippines services
            'https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services',    // World administrative boundaries
            'https://services.arcgisonline.com/arcgis/rest/services'                // Esri world services
        ];
        
        for (const serviceRoot of commonSources) {
            console.log(`\n🔍 Checking service directory: ${serviceRoot}`);
            
            try {
                const servicesData = await fetchJSON(`${serviceRoot}?f=json`);
                
                if (servicesData.services) {
                    console.log(`✅ Found ${servicesData.services.length} services`);
                    
                    // Look for services that might contain Philippine/Davao data
                    servicesData.services.forEach(service => {
                        const serviceName = service.name.toLowerCase();
                        if (serviceName.includes('philippines') || 
                            serviceName.includes('davao') || 
                            serviceName.includes('admin') ||
                            serviceName.includes('boundary')) {
                            console.log(`   🎯 Relevant service: ${service.name} (${service.type})`);
                            console.log(`   📌 URL: ${serviceRoot}/${service.name}/${service.type}`);
                        }
                    });
                } else {
                    console.log(`❌ No services found at ${serviceRoot}`);
                }
                
            } catch (error) {
                console.log(`❌ Failed to check ${serviceRoot}: ${error.message}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

searchDavaoServices(); 