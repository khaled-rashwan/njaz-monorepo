const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const sharedAssetsDir = path.join(rootDir, 'packages', 'shared-assets', 'public', 'images');
const apps = ['landing', 'app-selector', 'estebian', 'dev', 'scholar'];

const targetAssets = [
    'favicon.png',
    'logo.png',
    'estebian-logo.png',
    'dev-logo.png',
    'process-logo.png',
    'scholar-logo.png'
];

function syncAssets() {
    console.log('🔄 Syncing shared assets to apps...');

    apps.forEach(app => {
        const targetDir = path.join(rootDir, 'apps', app, 'public', 'images');

        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        targetAssets.forEach(asset => {
            const sourcePath = path.join(sharedAssetsDir, asset);
            const targetPath = path.join(targetDir, asset);

            if (fs.existsSync(sourcePath)) {
                try {
                    fs.copyFileSync(sourcePath, targetPath);
                    console.log(`✅ Copied ${asset} to ${app}`);
                } catch (err) {
                    // Ignore EBUSY or EPERM race condition locks during parallel turbo operations
                    if (err.code === 'EBUSY' || err.code === 'EPERM') {
                        // Silently handle if another copy process won the race
                    } else {
                        throw err;
                    }
                }
            } else {
                console.warn(`⚠️ Source asset ${asset} not found in shared-assets`);
            }
        });
    });

    console.log('✨ Asset sync complete!');
}

syncAssets();
