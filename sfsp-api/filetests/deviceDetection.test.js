
// Mock userService functions for testing
const mockUserService = {
    parseUserAgent(userAgent) {
        if (!userAgent) return {};

        const ua = userAgent.toLowerCase();

        // Browser detection
        let browserName = 'Unknown';
        let browserVersion = 'Unknown';

        if (ua.includes('chrome') && !ua.includes('edg')) {
            browserName = 'Chrome';
            const match = ua.match(/chrome\/([\d.]+)/);
            browserVersion = match ? match[1] : 'Unknown';
        } else if (ua.includes('firefox')) {
            browserName = 'Firefox';
            const match = ua.match(/firefox\/([\d.]+)/);
            browserVersion = match ? match[1] : 'Unknown';
        } else if (ua.includes('safari') && !ua.includes('chrome')) {
            browserName = 'Safari';
            const match = ua.match(/version\/([\d.]+)/);
            browserVersion = match ? match[1] : 'Unknown';
        } else if (ua.includes('edg')) {
            browserName = 'Edge';
            const match = ua.match(/edg\/([\d.]+)/);
            browserVersion = match ? match[1] : 'Unknown';
        }

    // OS detection
    let osName = 'Unknown';
    let osVersion = 'Unknown';

    if (ua.includes('windows')) {
        osName = 'Windows';
        const match = ua.match(/windows nt ([\d.]+)/);
        osVersion = match ? match[1] : 'Unknown';
    } else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) {
        osName = 'iOS';
        const match = ua.match(/os ([\d_]+)/);
        osVersion = match ? match[1].replace(/_/g, '.') : 'Unknown';
    } else if (ua.includes('mac os x')) {
        osName = 'macOS';
        const match = ua.match(/mac os x ([\d_]+)/);
        osVersion = match ? match[1].replace(/_/g, '.') : 'Unknown';
    } else if (ua.includes('linux')) {
        osName = 'Linux';
    } else if (ua.includes('android')) {
        osName = 'Android';
        const match = ua.match(/android ([\d.]+)/);
        osVersion = match ? match[1] : 'Unknown';
    }

    // Device type detection
    let deviceType = 'desktop';
    let isMobile = false;
    let isTablet = false;
    let isDesktop = true;

    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
        deviceType = 'mobile';
        isMobile = true;
        isDesktop = false;
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
        deviceType = 'tablet';
        isTablet = true;
        isDesktop = false;
    }

    return {
        browserName,
        browserVersion,
        osName,
        osVersion,
        deviceType,
        isMobile,
        isTablet,
        isDesktop
    };
},

    generateDeviceFingerprint(userAgent, ipAddress) {
        const crypto = require('crypto');
        const fingerprint = `${userAgent || ''}:${ipAddress || ''}`;
        return crypto.createHash('sha256').update(fingerprint).digest('hex');
    }
};

// Test user agent parsing
console.log('Testing user agent parsing...');
const testUserAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Mobile Safari/537.36'
];

testUserAgents.forEach((ua, index) => {
    console.log(`\nTest ${index + 1}:`);
    console.log('User Agent:', ua);
    const parsed = mockUserService.parseUserAgent(ua);
    console.log('Parsed Info:', JSON.stringify(parsed, null, 2));
});

// Test device fingerprint generation
console.log('\nTesting device fingerprint generation...');
const testData = [
    { ua: testUserAgents[0], ip: '192.168.1.1' },
    { ua: testUserAgents[1], ip: '192.168.1.2' },
    { ua: testUserAgents[0], ip: '192.168.1.1' } // Same as first - should generate same fingerprint
];

testData.forEach((data, index) => {
    const fingerprint = mockUserService.generateDeviceFingerprint(data.ua, data.ip);
    console.log(`Fingerprint ${index + 1}:`, fingerprint);
});

console.log('\nDevice detection test completed!');
