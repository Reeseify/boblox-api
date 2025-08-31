const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
//const PORT = process.argv[2] || 3000;
const PORT = 3000;
const DATABASE_FOLDER = path.join(__dirname, 'Databases');
const ACCOUNTS_FILE = path.join(DATABASE_FOLDER, 'Accounts.json');
const PLACES_FILE = path.join(DATABASE_FOLDER, 'Places.json');;
const GAMES_FILE = path.join(DATABASE_FOLDER, 'Games.json');;
const ASSETS_FILE = path.join(DATABASE_FOLDER, 'Assets.json');
const TOOLBOX_FILE = path.join(DATABASE_FOLDER, 'Toolbox.json');
const PASSWORD = "FxBv8K0IfK248RRHBdM3dqQEVnglHTQO/5N4G224qEyW9JuuTStmO8DTQLY0aYA0a";

//const CLOUDFLARED_PATH = path.join(__dirname, 'node_modules', 'cloudflared', 'bin', 'cloudflared.exe');

const { spawn } = require('child_process');

const { execFile, exec } = require('child_process');

const INTERNAL_PORT = 3000;

app.get('/', (req, res) => {
    res.send('🚀 Server is running!');
});

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*"); // Allow any origin (or specify)
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.use(express.json({ limit: '10mb' })); // Adjust limit as needed
app.use(express.urlencoded({ extended: true }));

// Ensure the Databases folder and Accounts.json exist
if (!fs.existsSync(DATABASE_FOLDER)) {
    fs.mkdirSync(DATABASE_FOLDER);
}
if (!fs.existsSync(ACCOUNTS_FILE)) {
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify({}));
}
if (!fs.existsSync(PLACES_FILE)) {
    fs.writeFileSync(PLACES_FILE, JSON.stringify({}));
}

app.use(bodyParser.json()); // Middleware to parse JSON requests

const substitutionTable = {
    A: "Q", a: "q", B: "W", b: "w", C: "E", c: "e", D: "R", d: "r", E: "T", e: "t",
    F: "Y", f: "y", G: "U", g: "u", H: "I", h: "i", I: "O", i: "o", J: "P", j: "p",
    K: "A", k: "a", L: "S", l: "s", M: "D", m: "d", N: "F", n: "f", O: "G", o: "g",
    P: "H", p: "h", Q: "J", q: "j", R: "K", r: "k", S: "L", s: "l", T: "Z", t: "z",
    U: "X", u: "x", V: "C", v: "c", W: "V", w: "v", X: "B", x: "b", Y: "N", y: "n",
    Z: "M", z: "m", "0": "5", "1": "6", "2": "7", "3": "8", "4": "9",
    "5": "0", "6": "1", "7": "2", "8": "3", "9": "4"
};

const reverseSubstitutionTable = Object.fromEntries(
    Object.entries(substitutionTable).map(([k, v]) => [v, k])
);

function substitution(data, reverse = false) {
    const table = reverse ? reverseSubstitutionTable : substitutionTable;
    return data.split('').map(c => table[c] || c).join('');
}

function transposition(data, key, reverse = false) {
    const blockSize = key.length;
    const numRows = Math.ceil(data.length / blockSize);
    const paddingSize = blockSize - (data.length % blockSize || blockSize);
    const paddedData = data + " ".repeat(paddingSize);

    if (!reverse) {
        let result = "";
        for (let i = 0; i < blockSize; i++) {
            for (let j = 0; j < numRows; j++) {
                const idx = j * blockSize + i;
                if (idx < paddedData.length) result += paddedData[idx];
            }
        }
        return result;
    } else {
        let result = Array(data.length).fill(" ");
        let idx = 0;
        for (let i = 0; i < blockSize; i++) {
            for (let j = 0; j < numRows; j++) {
                const pos = j * blockSize + i;
                if (pos < data.length) result[pos] = data[idx++];
            }
        }
        return result.join('').trimEnd();
    }
}

function xorWithKey(data, key) {
    let result = "";
    for (let i = 0; i < data.length; i++) {
        const dataChar = data.charCodeAt(i);
        const keyChar = key.charCodeAt(i % key.length);
        result += String.fromCharCode(dataChar ^ keyChar);
    }
    return result;
}

function authenticate(providedPassword) {
    return providedPassword === PASSWORD;
}

function encryptTransaction(data, key) {
    if (!authenticate(key)) {
        console.warn("Invalid password!");
        return null;
    }
    const substituted = substitution(data, false);
    const transposed = transposition(substituted, key, false);
    return xorWithKey(transposed, key);
}

function decryptTransaction(encryptedData, key) {
    if (!authenticate(key)) {
        console.warn("Invalid password!");
        return null;
    }
    const decrypted = xorWithKey(encryptedData, key);
    const detransposed = transposition(decrypted, key, true);
    return substitution(detransposed, true);
}


// Nodemailer transporter for Hostinger SMTP
const transporter = nodemailer.createTransport({
    host: "smtp.hostinger.com", // Outgoing SMTP server
    port: 465, // SMTP port for SSL
    secure: true, // Use SSL
    auth: {
        user: "admin@boblox.ca", // Replace with your Hostinger email
        pass: "rtH0p1@t", // Replace with your email password
    },
});

// Function to generate a 6-digit verification code
const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// Email API
app.post("/send-email", async (req, res) => {
    console.log("Received Request:", req.body); // Debugging

    const { to } = req.body;

    if (!to) {
        return res.status(400).json({ error: "Missing recipient email" });
    }

    const code = generateCode(); // Generate a 6-digit code

    try {
        // Send email with the code
        /*const info = await transporter.sendMail({
            from: `"Boblox" <noreply@boblox.ca>`,
            to,
            subject: "Login Code",
            text: `Your verification code is: ${code}`,
            html: `<h1>Your verification code is: ${code}</h1>`,
        });*/

        //console.log("Email Sent:", info.response);

        // Send the code back to Roblox
        res.json({ success: true, code });
        //res.json({ success: true, code });
    } catch (error) {
        console.error("Email Error:", error);
        res.status(500).json({ error: "Failed to send email" });
    }
});


// Create an account
app.post('/create-account', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).send('Username and password are required.');
    }

    const accountsData = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf-8'));

    if (accountsData[username]) {
        return res.status(409).send('Account already exists.');
    }

    accountsData[username] = { password };
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accountsData, null, 2));
    res.status(201).send('Account created successfully.');
});

let chunksStorage = {}; // Temporary storage for chunks

app.post('/beta/save-place', (req, res) => {
    const {
        requestId,
        placeName,
        placeDescription,
        placeFile,
        gameId,
        placeId,
        chunkIndex,
        totalChunks
    } = req.body;

    // Ensure all required fields are present
    if (!requestId || !placeName || !placeDescription || !gameId || !placeId || placeFile === undefined || chunkIndex === undefined || totalChunks === undefined) {
        console.error('Missing required fields:', req.body);
        return res.status(400).send('Missing required fields.');
    }

    // Initialize chunk storage if it's the first chunk
    if (!chunksStorage[requestId]) {
        chunksStorage[requestId] = {
            totalChunks: totalChunks,
            receivedChunks: 0,
            chunks: new Array(totalChunks).fill(null),
            placeName,
            placeDescription,
            gameId,
            placeId
        };
    }

    // Add chunk to storage
    chunksStorage[requestId].chunks[chunkIndex] = placeFile;
    chunksStorage[requestId].receivedChunks++;

    // If all chunks are received, assemble and save the place
    if (chunksStorage[requestId].receivedChunks === totalChunks) {
        const fullPlaceFile = chunksStorage[requestId].chunks.join(''); // Merge chunks

        // Load existing places
        const placesData = JSON.parse(fs.readFileSync(PLACES_FILE, 'utf-8'));

        // Save the new place
        placesData[chunksStorage[requestId].placeId] = {
            placeName: chunksStorage[requestId].placeName,
            placeDescription: chunksStorage[requestId].placeDescription,
            gameId: chunksStorage[requestId].gameId,
            placeFile: fullPlaceFile
        };

        // Write to file
        fs.writeFileSync(PLACES_FILE, JSON.stringify(placesData, null, 2));

        // Cleanup
        delete chunksStorage[requestId];

        console.log('Place saved successfully:', placeId);
        return res.status(201).send('Place saved successfully.');
    }

    res.status(202).send('Chunk received.');
});



// Saves a place
app.post('/save-place', (req, res) => {
    const { placeName, placeDescription, placeFile, gameId, placeId } = req.body;

    if (!placeName || !placeDescription || !gameId || !placeFile) {
        return res.status(400).send('Missing one of four fields required.');
    }

    const placesData = JSON.parse(fs.readFileSync(PLACES_FILE, 'utf-8'));

    if (placesData[placeId]) {
        return res.status(409).send('Place already exists.');
    }

    placesData[placeId] = { placeName, placeDescription, gameId, placeFile };
    fs.writeFileSync(PLACES_FILE, JSON.stringify(placesData, null, 2));
    res.status(201).send('Place saved and created successfully.');
});

// Create an account
app.post('/toolbox/save-model', (req, res) => {
    const { assetId, assetFile } = req.body;

    const id = 1;
    if (!assetId || !assetFile) {
        return res.status(400).send('Missing one of two fields required.');
    }

    const toolboxData = JSON.parse(fs.readFileSync(TOOLBOX_FILE, 'utf-8'));

    if (toolboxData[assetId]) {
        toolboxData[assetId].assetFile = assetFile;
        fs.writeFileSync(TOOLBOX_FILE, JSON.stringify(toolboxData, null, 2));
        res.status(201).send('Model saved successfully.');
    } else {
        res.status(201).send('Could not find model.');
        return res.status(400).send('Could not find model.');
    }
});

// Get assetType by assetId
app.get('/toolbox/get-model', (req, res) => {
    const { assetId } = req.query;

    if (!assetId) {
        return res.status(400).send('assetId is required.');
    }

    const toolboxData = JSON.parse(fs.readFileSync(TOOLBOX_FILE, 'utf-8'));

    if (toolboxData[assetId]) {
        res.status(200).send({ asset: toolboxData[assetId] });
    } else {
        res.status(404).send('Asset not found.');
    }
});

// Get assetType by assetId
app.post('/login', (req, res) => {
    const { encryptedPayload } = req.body;

    if (!encryptedPayload) {
        return res.status(400).send('Encrypted data is required.');
    }

    let encryptedBuffer;
    try {
        encryptedBuffer = atob(encryptedPayload); // base64 decode
    } catch (err) {
        return res.status(400).send('Invalid base64 encoding.');
    }

    let decrypted;
    try {
        decrypted = decryptTransaction(encryptedBuffer, PASSWORD);
        console.log("🔓 Decrypted string:", decrypted);
    } catch (err) {
        return res.status(400).send('Failed to decrypt data.');
    }

    let parsed;
    try {
        parsed = JSON.parse(decrypted);
        console.log("🧾 Parsed:", parsed);
    } catch (err) {
        return res.status(400).send('Decrypted data is not valid JSON.');
    }

    const { username, password } = parsed;

    if (!username || !password) {
        return res.status(400).send('Username and password are required.');
    }

    const accountsData = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf-8'));
    const account = accountsData[username];

    if (account) {
        const decryptedPassword = account.password;
        if (decryptedPassword === password) {
            if (account.email.verified === true) {
                return res.status(200).send(account.email.email);
            } else {
                return res.status(200).send('Login successful.');
            }
        }
    }

    return res.status(401).send('Invalid username or password.');
});


// Get password by username
app.get('/get-password', (req, res) => {
    const { username } = req.query;

    if (!username) {
        return res.status(400).send('Username is required.');
    }

    const accountsData = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf-8'));

    if (accountsData[username]) {
        res.status(200).send({ password: accountsData[username].password });
    } else {
        res.status(404).send('Account not found.');
    }
});

// Get assetType by assetId
app.get('/assets/get-type', (req, res) => {
    const { assetId } = req.query;

    if (!assetId) {
        return res.status(400).send('assetId is required.');
    }

    const assetsData = JSON.parse(fs.readFileSync(ASSETS_FILE, 'utf-8'));

    if (assetsData[assetId]) {
        res.status(200).send({ assetType: assetsData[assetId].AssetType });
    } else {
        res.status(404).send('Asset not found.');
    }
});

// List asset
app.get('/assets/list', (req, res) => {


    const assetsData = JSON.parse(fs.readFileSync(ASSETS_FILE, 'utf-8'));

    if (assetsData) {
        res.status(200).send({ assetsData });
    } else {
        res.status(404).send('Assets not found.');
    }
});

// List toolbox
app.get('/assets/toolbox', (req, res) => {


    const toolboxData = JSON.parse(fs.readFileSync(TOOLBOX_FILE, 'utf-8'));

    if (toolboxData) {
        res.status(200).send({ toolboxData });
    } else {
        res.status(404).send('Assets not found.');
    }
});

// Get asset
app.get('/assets/get', (req, res) => {
    const { assetId } = req.query;

    if (!assetId) {
        return res.status(400).send('assetId is required.');
    }

    const assetsData = JSON.parse(fs.readFileSync(ASSETS_FILE, 'utf-8'));
    const gamesData = JSON.parse(fs.readFileSync(GAMES_FILE, 'utf-8'));
    const placesData = JSON.parse(fs.readFileSync(PLACES_FILE, 'utf-8'));
    const toolboxData = JSON.parse(fs.readFileSync(TOOLBOX_FILE, 'utf-8'));

    if (assetsData[assetId]) {
        if (assetsData[assetId].AssetType == "Game") {
            res.status(200).send(gamesData[assetId]);
        } else if (assetsData[assetId].AssetType == "Place") {
            res.status(200).send({ asset: placesData[assetId] });
        } else if (assetsData[assetId].AssetType == "Model") {  // Fixed this line
            res.status(200).send({ asset: toolboxData[assetId] });
        } else if (assetsData[assetId].AssetType == "Sound") {
            res.status(200).send({ asset: toolboxData[assetId] });
        }
    } else {
        res.status(404).send('Asset not found.');
    }
});

// Get placeFile by placeId
app.get('/load-place', (req, res) => {
    const { placeId } = req.query;

    if (!placeId) {
        return res.status(400).send('placeId is required.');
    }

    const placesData = JSON.parse(fs.readFileSync(PLACES_FILE, 'utf-8'));

    if (placesData[placeId]) {
        res.status(200).send({ placeFile: placesData[placeId].placeFile });
    } else {
        res.status(404).send('Place not found.');
    }
});

// Add or update an account (for testing purposes)
app.post('/add-account', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).send('Username and password are required.');
    }

    const accountsData = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf-8'));
    accountsData[username] = { password };

    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accountsData, null, 2));
    res.status(201).send(`Account for ${username} added/updated.`);
});

// Paths
const vscodeDir = path.join(__dirname, '.vscode');
const portFilePath = path.join(vscodeDir, 'port.txt');
const updateScriptPath = path.join(__dirname, 'updateSettings.js');

// Make sure .vscode directory exists
fs.mkdirSync(path.dirname(portFilePath), { recursive: true });

// Write the port to file
fs.writeFileSync(portFilePath, PORT.toString());

app.get('/', (req, res) => {
    res.send('Access denied when accessing server.');
});

app.listen(INTERNAL_PORT, '0.0.0.0', () => {
    // Run the updateSettings script
    execFile('node', [updateScriptPath], (error, stdout, stderr) => {
        if (error) {
            console.error('❌ Error running updateSettings.js:', error);
            return;
        }
        if (stderr) {
            console.error('⚠️ stderr:', stderr);
        }
        console.log('✅ updateSettings.js output:\n' + stdout);
    });

    // Launch cloudflared tunnel
    //const tunnel = spawn(CLOUDFLARED_PATH, ['tunnel', '--url', `http://localhost:3000`]);



    console.log(`🚀 Server started at http://localhost:${PORT}`);

    // Start the dev tunnel (no tunnel ID)
    //startTunnel();
});
