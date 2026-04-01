import fs from 'fs';
import { loadEnvFile } from 'process';

loadEnvFile('.env.local');

const rawBase = process.env.VITE_N8N_BASE_URL || 'https://n8n.srv1444974.hstgr.cloud/';
const base = rawBase.replace('/webhook/', '').replace('/webhook', '');
const apiUrl = base.replace(/\/$/, '') + '/api/v1/workflows';
const apiKey = process.env.N8N_API_KEY;

if(!apiKey) {
    console.error('N8N_API_KEY env is missing');
    process.exit(1);
}

async function update(id, path) {
    console.log(`Updating ${path} on ID ${id}...`);
    const workflow = JSON.parse(fs.readFileSync(path, 'utf8'));
    const payload = {
        name: workflow.name,
        nodes: workflow.nodes,
        connections: workflow.connections,
        settings: workflow.settings || {
            executionOrder: "v1"
        }
    };

    const response = await fetch(`${apiUrl}/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-N8N-API-KEY': apiKey
        },
        body: JSON.stringify(payload)
    });
    
    if(response.ok) {
        console.log(`Success: ${path} updated!`);
    } else {
        const text = await response.text();
        console.error(`Status ${response.status}: Failed to update ${path} - `, text);
    }
}

async function run() {
    await update('ty4nuhyfYZChvdaS', './n8n-workflows/LAP_Generar_PDF_Cotizacion.json');
}

run();
