/**
 * Sync Amplify Configuration
 * 
 * Copies amplify_outputs.json from shared-backend to all frontend apps.
 * Run this after `npx ampx sandbox` generates the config.
 */

const fs = require('fs');
const path = require('path');

// Root of the monorepo (parent of scripts directory)
const ROOT = path.resolve(__dirname, '..');

const SOURCE = path.join(ROOT, 'packages/shared-backend/amplify_outputs.json');
const TARGETS = [
    path.join(ROOT, 'apps/landing/amplify_outputs.json'),
    path.join(ROOT, 'apps/app-selector/amplify_outputs.json'),
    path.join(ROOT, 'apps/estebian/amplify_outputs.json'),
];

function syncConfig() {
    console.log('🔄 Syncing Amplify configuration...\n');

    if (!fs.existsSync(SOURCE)) {
        console.error('❌ Source file not found:', SOURCE);
        console.log('   Run `npx ampx sandbox` in packages/shared-backend first.');
        process.exit(1);
    }

    const config = fs.readFileSync(SOURCE, 'utf-8');

    for (const target of TARGETS) {
        const dir = path.dirname(target);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(target, config);
        console.log('✅ Synced to:', path.relative(__dirname, target));
    }

    console.log('\n✨ Done! Amplify config synced to all apps.');
}

syncConfig();
