function checkAndInitialize() {
    if (typeof initializeUI === 'function') {
        console.log('Initializing popup...');
        initializeUI(false);
    } else {
        console.error('app.js not loaded, retrying in 100ms');
        setTimeout(checkAndInitialize, 100);
    }
}

checkAndInitialize();