const { spawn } = require('child_process');
const path = require('path');

/**
 * Bridge to Python-based Advanced Barangay Extractor
 * This provides a Node.js interface to the Python implementation
 * which offers better geospatial capabilities
 */
class PythonBarangayBridge {
  constructor() {
    this.pythonScript = path.join(__dirname, '..', 'scripts', 'python-barangay-extractor.py');
    this.isAvailable = null;
  }

  /**
   * Check if Python and the extractor script are available
   */
  async checkAvailability() {
    if (this.isAvailable !== null) {
      return this.isAvailable;
    }

    try {
      // Test if Python is available
      const result = await this.executePython(['--help']);
      this.isAvailable = result.success;
      
      if (this.isAvailable) {
        console.log('✅ Python barangay extractor is available');
      } else {
        console.log('⚠️ Python barangay extractor not available, falling back to JavaScript implementation');
      }
      
      return this.isAvailable;
    } catch (error) {
      console.log('⚠️ Python not available, using JavaScript fallback');
      this.isAvailable = false;
      return false;
    }
  }

  /**
   * Find barangay using Python extractor
   */
  async findBarangay(lat, lng) {
    // Check availability first
    const available = await this.checkAvailability();
    if (!available) {
      throw new Error('Python extractor not available');
    }

    try {
      const result = await this.executePython(['--lat', lat.toString(), '--lng', lng.toString()]);
      
      if (result.success && result.data) {
        return {
          ...result.data,
          source: 'python_extractor'
        };
      } else {
        throw new Error(result.error || 'Python extractor failed');
      }
    } catch (error) {
      console.error('Python extractor error:', error.message);
      throw error;
    }
  }

  /**
   * Execute Python script with given arguments
   */
  executePython(args) {
    return new Promise((resolve, reject) => {
      // Try different Python commands
      const pythonCommands = ['python3', 'python', 'py'];
      let commandIndex = 0;

      const tryCommand = () => {
        if (commandIndex >= pythonCommands.length) {
          reject(new Error('No Python interpreter found'));
          return;
        }

        const pythonCmd = pythonCommands[commandIndex];
        const process = spawn(pythonCmd, [this.pythonScript, ...args]);

        let stdout = '';
        let stderr = '';

        process.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        process.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        process.on('close', (code) => {
          if (code === 0) {
            try {
              // Parse JSON output
              const lines = stdout.trim().split('\n');
              const jsonLine = lines.find(line => line.startsWith('{'));
              
              if (jsonLine) {
                const data = JSON.parse(jsonLine);
                resolve({ success: true, data });
              } else {
                resolve({ success: true, data: null, output: stdout });
              }
            } catch (error) {
              resolve({ success: true, data: null, output: stdout });
            }
          } else {
            commandIndex++;
            if (commandIndex < pythonCommands.length) {
              // Try next Python command
              setTimeout(tryCommand, 100);
            } else {
              resolve({ 
                success: false, 
                error: `Python script failed with code ${code}. stderr: ${stderr}` 
              });
            }
          }
        });

        process.on('error', (error) => {
          commandIndex++;
          if (commandIndex < pythonCommands.length) {
            // Try next Python command
            setTimeout(tryCommand, 100);
          } else {
            resolve({ 
              success: false, 
              error: `Failed to start Python process: ${error.message}` 
            });
          }
        });
      };

      tryCommand();
    });
  }
}

/**
 * Enhanced findBarangay function that uses Python when available,
 * falls back to JavaScript implementation
 */
async function findBarangayEnhanced(lat, lng) {
  const bridge = new PythonBarangayBridge();
  
  try {
    // Try Python implementation first
    const result = await bridge.findBarangay(lat, lng);
    console.log(`🐍 Using Python extractor for enhanced accuracy`);
    return result;
  } catch (error) {
    console.log(`⚠️ Python extractor failed: ${error.message}`);
    console.log(`🔄 Falling back to JavaScript implementation`);
    
    // Fall back to JavaScript implementation
    const { findBarangay: jsBarangay } = require('./enhanced-barangay-geocoder');
    return await jsBarangay(lat, lng);
  }
}

module.exports = {
  PythonBarangayBridge,
  findBarangayEnhanced
}; 