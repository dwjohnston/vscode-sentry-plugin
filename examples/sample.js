// Example JavaScript file that might have errors reported to Sentry

function processUserData(userData) {
    // This function might throw errors that get reported to Sentry
    try {
        const user = JSON.parse(userData);
        return user.profile.name;
    } catch (error) {
        // This error might be captured by Sentry
        console.error('Failed to process user data:', error);
        throw error;
    }
}

function calculateTotal(items) {
    // Another function that might have errors
    return items.reduce((sum, item) => sum + item.price, 0);
}

function handleApiResponse(response) {
    // Function that might fail and get reported to Sentry
    if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
    }
    return response.json();
}

// Export functions
module.exports = {
    processUserData,
    calculateTotal,
    handleApiResponse
};