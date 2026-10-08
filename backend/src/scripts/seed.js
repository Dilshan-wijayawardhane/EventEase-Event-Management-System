require('dotenv').config();
const { sequelize, User, Event, TicketType } = require('../models');

const seed = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected');

        // Sync (force: true drops tables — use carefully!)
        await sequelize.sync({ force: true });
        console.log('✅ Tables recreated');

        // Create admin
        const admin = await User.create({
            email: 'admin@eventease.com',
            password_hash: await User.hashPassword('Admin@123'),
            full_name: 'EventEase Admin',
            role: 'admin',
            is_email_verified: true
        });
        console.log('✅ Admin created:', admin.email);

        // Create student
        const student = await User.create({
            email: 'student@eventease.com',
            password_hash: await User.hashPassword('Student@123'),
            full_name: 'John Student',
            role: 'student',
            phone: '+1234567890',
            is_email_verified: true
        });
        console.log('✅ Student created:', student.email);

        // Create sample events
        const eventsData = [
            {
                title: 'University Night 2025',
                description: 'The biggest campus party of the year! Live music, DJs, food trucks, and unforgettable vibes.',
                banner_image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800',
                category: 'Party',
                event_date: '2025-12-15',
                start_time: '19:00:00',
                end_time: '23:59:00',
                venue: 'Main Campus Auditorium',
                organizer: 'Student Union',
                max_tickets: 500,
                status: 'upcoming',
                created_by: admin.id,
                ticketTypes: [
                    { name: 'Early Bird', price: 15.00, max_quantity: 100 },
                    { name: 'Regular', price: 25.00, max_quantity: 300 },
                    { name: 'VIP', price: 75.00, max_quantity: 100 }
                ]
            },
            {
                title: 'Tech Innovation Summit',
                description: 'Join industry leaders and fellow students for a day of talks on AI, Web3, and the future of tech.',
                banner_image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
                category: 'Conference',
                event_date: '2025-11-20',
                start_time: '09:00:00',
                end_time: '17:00:00',
                venue: 'Engineering Building Hall A',
                organizer: 'CS Department',
                max_tickets: 200,
                status: 'upcoming',
                created_by: admin.id,
                ticketTypes: [
                    { name: 'Student', price: 10.00, max_quantity: 150 },
                    { name: 'Professional', price: 50.00, max_quantity: 50 }
                ]
            },
            {
                title: 'Basketball Championship Finals',
                description: 'Cheer for your university team in the championship finals!',
                banner_image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800',
                category: 'Sports',
                event_date: '2025-10-30',
                start_time: '18:00:00',
                end_time: '21:00:00',
                venue: 'University Sports Arena',
                organizer: 'Athletics Department',
                max_tickets: 1000,
                status: 'upcoming',
                created_by: admin.id,
                ticketTypes: [
                    { name: 'General Admission', price: 8.00, max_quantity: 800 },
                    { name: 'Courtside', price: 30.00, max_quantity: 200 }
                ]
            }
        ];

        for (const e of eventsData) {
            const { ticketTypes, ...eventData } = e;
            const event = await Event.create(eventData);
            for (const tt of ticketTypes) {
                await TicketType.create({
                    event_id: event.id,
                    name: tt.name,
                    price: tt.price,
                    max_quantity: tt.max_quantity,
                    available_quantity: tt.max_quantity,
                    sales_start: new Date(),
                    sales_end: new Date(eventData.event_date)
                });
            }
            console.log(`✅ Event created: ${event.title}`);
        }

        console.log('\n🎉 Seed complete!\n');
        console.log('Demo credentials:');
        console.log('  Admin:   admin@eventease.com / Admin@123');
        console.log('  Student: student@eventease.com / Student@123\n');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seed error:', error);
        process.exit(1);
    }
};

seed();