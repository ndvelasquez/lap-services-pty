import fs from 'fs';
import { loadEnvFile } from 'process';

loadEnvFile('.env.local');

const rawBase = process.env.VITE_N8N_BASE_URL || 'https://n8n.srv1444974.hstgr.cloud/';
const base = rawBase.replace('/webhook/', '').replace('/webhook', '');
const apiUrl = base.replace(/\/$/, '') + '/api/v1/workflows';
const apiKey = process.env.N8N_API_KEY;

if(!apiKey) {
    console.error('Missing N8N_API_KEY in .env');
    process.exit(1);
}

async function upload(path) {
    console.log(`Uploading ${path}...`);
    const workflow = JSON.parse(fs.readFileSync(path, 'utf8'));
    const payload = {
        name: workflow.name,
        nodes: workflow.nodes,
        connections: workflow.connections,
        settings: workflow.settings || {
            executionOrder: "v1"
        }
    };

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-N8N-API-KEY': apiKey
        },
        body: JSON.stringify(payload)
    });
    
    if(response.ok) {
        console.log(`Success: ${path} uploaded!`);
    } else {
        const error = await response.text();
        console.error(`Status ${response.status}: Failed to upload ${path} - `, error);
    }
}

async function start() {
    await upload('./n8n-workflows/LAP_Generar_PDF_Cotizacion.json');
    await upload('./n8n-workflows/LAP_Enviar_Cotizacion_con_PDF.json');
}

start();
