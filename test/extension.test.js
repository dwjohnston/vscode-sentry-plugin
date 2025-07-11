// Basic test to verify extension functionality
// This test can be run manually in VSCode extension development host

const assert = require('assert');

// Mock Sentry error data for testing
const mockSentryErrors = [
    {
        id: '1',
        title: 'TypeError: Cannot read property of undefined',
        count: 42,
        lastSeen: '2024-01-15T10:30:00Z',
        culprit: 'processUserData',
        metadata: {
            filename: 'sample.js',
            function: 'processUserData'
        }
    },
    {
        id: '2', 
        title: 'ReferenceError: variable is not defined',
        count: 15,
        lastSeen: '2024-01-15T09:15:00Z',
        culprit: 'calculateTotal'
    }
];

function testErrorMatching() {
    console.log('Testing error matching algorithms...');
    
    // Test function name extraction
    const testLines = [
        'function processUserData(userData) {',
        '    // This function might throw errors',
        '    try {',
        '        const user = JSON.parse(userData);',
        '        return user.profile.name;',
        '    } catch (error) {',
        '        console.error("Failed to process user data:", error);',
        '        throw error;',
        '    }',
        '}'
    ];
    
    // Simulate finding function in file
    let foundLine = -1;
    for (let i = 0; i < testLines.length; i++) {
        if (testLines[i].includes('function processUserData')) {
            foundLine = i;
            break;
        }
    }
    
    assert(foundLine === 0, 'Should find processUserData function at line 0');
    console.log('✅ Function matching test passed');
    
    return true;
}

function testKeywordExtraction() {
    console.log('Testing keyword extraction...');
    
    const title = 'TypeError: Cannot read property of undefined';
    const commonWords = ['error', 'exception', 'failed', 'cannot', 'undefined', 'null', 'invalid'];
    const words = title.toLowerCase().split(/\s+/);
    const keywords = words.filter(word => 
        word.length > 3 && 
        !commonWords.includes(word) &&
        /^[a-zA-Z]+$/.test(word)
    );
    
    assert(keywords.includes('property'), 'Should extract property as keyword');
    assert(keywords.length > 0, 'Should extract some keywords');
    
    console.log('Extracted keywords:', keywords);
    
    console.log('✅ Keyword extraction test passed');
    return true;
}

function runTests() {
    console.log('Running Sentry Plugin Tests...');
    
    try {
        testErrorMatching();
        testKeywordExtraction();
        
        console.log('🎉 All tests passed!');
        return true;
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return false;
    }
}

// Export for potential use in extension
module.exports = {
    runTests,
    mockSentryErrors
};

// Run tests if this file is executed directly
if (require.main === module) {
    runTests();
}