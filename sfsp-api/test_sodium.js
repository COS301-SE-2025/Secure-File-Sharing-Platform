// Standalone test for sodium initialization
async function initializeSodium() {
    try {
        let sodium;

        try {
        sodium = require('libsodium-wrappers-sumo');
        console.log('Sodium imported via require');
        console.log('Sodium object keys:', Object.keys(sodium));
        console.log('Sodium ready status:', sodium.ready);
        } catch (requireError) {
        console.warn('Require failed, trying dynamic import:', requireError.message);
        try {
            sodium = (await import('libsodium-wrappers-sumo')).default;
            console.log('Sodium imported via dynamic import');
            console.log('Sodium object keys:', Object.keys(sodium));
            console.log('Sodium ready status:', sodium.ready);
        } catch (importError) {
            console.error('Both import methods failed');
            throw new Error('Failed to import libsodium-wrappers-sumo');
        }
        }

        console.log('Waiting for sodium to be ready...');
        await sodium.ready;
        console.log('Sodium is now ready');

        await new Promise(resolve => setTimeout(resolve, 200));

        console.log('Checking sodium constants and functions...');
        console.log('crypto_pwhash_SALTBYTES exists:', typeof sodium.crypto_pwhash_SALTBYTES);
        console.log('crypto_secretbox_NONCEBYTES exists:', typeof sodium.crypto_secretbox_NONCEBYTES);
        console.log('crypto_pwhash exists:', typeof sodium.crypto_pwhash);
        console.log('crypto_secretbox_easy exists:', typeof sodium.crypto_secretbox_easy);
        console.log('crypto_sign_keypair exists:', typeof sodium.crypto_sign_keypair);

        if (typeof sodium.crypto_pwhash_SALTBYTES === 'undefined') {
        throw new Error('crypto_pwhash_SALTBYTES constant is not available');
        }
        if (typeof sodium.crypto_secretbox_NONCEBYTES === 'undefined') {
        throw new Error('crypto_secretbox_NONCEBYTES constant is not available');
        }
        if (typeof sodium.crypto_sign_keypair !== 'function') {
        throw new Error('crypto_sign_keypair is not a function');
        }

        if (typeof sodium.crypto_pwhash !== 'function') {
        throw new Error('crypto_pwhash is not a function');
        }
        if (typeof sodium.from_base64 !== 'function') {
        throw new Error('from_base64 is not a function');
        }
        if (typeof sodium.crypto_secretbox_easy !== 'function') {
        throw new Error('crypto_secretbox_easy is not a function');
        }
        if (typeof sodium.crypto_secretbox_open_easy !== 'function') {
        throw new Error('crypto_secretbox_open_easy is not a function');
        }

        console.log('Sodium fully initialized and validated');
        return sodium;

    } catch (error) {
        console.error('Failed to initialize sodium:', error.message);
        throw new Error('Sodium initialization failed: ' + error.message);
    }
    }

    async function testSodiumInitialization() {
    try {
        console.log('Testing sodium initialization...');

        const sodium = await initializeSodium();

        console.log('Sodium initialization successful!');
        console.log('Sodium functions available:', {
        crypto_pwhash: typeof sodium.crypto_pwhash,
        crypto_secretbox_easy: typeof sodium.crypto_secretbox_easy,
        crypto_secretbox_open_easy: typeof sodium.crypto_secretbox_open_easy,
        from_base64: typeof sodium.from_base64,
        to_base64: typeof sodium.to_base64,
        randombytes_buf: typeof sodium.randombytes_buf
        });

        return true;
    } catch (error) {
        console.error('❌ Sodium initialization failed:', error.message);
        return false;
    }
}

testSodiumInitialization();