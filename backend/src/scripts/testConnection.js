const { testConnection } = require('../config/database');
const User = require('../models/User');

(async () => {
    try {
        await testConnection();
        console.log('✅ Database connected!');
        
        // Test user creation
        const user = await User.create({
            email: 'test@eventease.com',
            password_hash: await User.hashPassword('Test123!'),
            full_name: 'Test User',
            role: 'student'
        });
        console.log('✅ Test user created:', user.toJSON());
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
})();