const fs = require('fs');
const path = require('path');

// Paths based on script location
const portPath = path.join(__dirname, '.vscode', 'port.txt');
const settingsPath = path.join(__dirname, '.vscode', 'settings.json');

// Read port
if (!fs.existsSync(portPath)) {
    console.error('❌ Port file not found:', portPath);
    process.exit(1);
}

const port = fs.readFileSync(portPath, 'utf8').trim();

// Create new settings
const settings = {
    "remote.portsAttributes": {
        [port]: {
            "label": "API Server",
            "onAutoForward": "openBrowser"
        }
    },
    "remote.autoForwardPorts": true,
    "remote.autoForwardPortsSource": "process"
}

// Write updated settings
fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

console.log(`✅ Updated settings.json with port ${port}`);
