
// Set NODE_ENV if not already set
if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'production';
}

console.log('🚀 Starting Chess Game Server...');
console.log('📁 Environment:', process.env.NODE_ENV);
console.log('🎯 PM2 Process Name: chess');

// Start the main application
require('./index.js');

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('🛑 Chess server received SIGINT, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('🛑 Chess server received SIGTERM, shutting down gracefully...');
    process.exit(0);
});
