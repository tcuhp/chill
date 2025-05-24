const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();
const path = require('path'); // Thêm module 'path' để xử lý đường dẫn

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Phục vụ các tệp tĩnh (HTML, CSS, JS) từ thư mục gốc của ứng dụng
// Điều này giả định index.html, style.css, script.js nằm cùng cấp với app.js
app.use(express.static(path.join(__dirname, '')));

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'thienphuc2004',
    database: process.env.DB_NAME || 'hotelmanage',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Database connected successfully');
        connection.release();
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
    }
}

// Routes

// Get all rooms
app.get('/api/rooms', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM rooms');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching rooms:', error);
        res.status(500).json({ error: 'Failed to fetch rooms' });
    }
});

// Add a new room
app.post('/api/rooms', async (req, res) => {
    const { roomNumber, roomType, price, capacity, status } = req.body;
    try {
        const [result] = await pool.execute(
            'INSERT INTO rooms (room_number, room_type, price, capacity, status) VALUES (?, ?, ?, ?, ?)',
            [roomNumber, roomType, price, capacity, status]
        );
        res.status(201).json({ id: result.insertId, roomNumber, roomType, price, capacity, status });
    } catch (error) {
        console.error('Error adding room:', error);
        res.status(500).json({ error: 'Failed to add room' });
    }
});

// Update a room
app.put('/api/rooms/:id', async (req, res) => {
    const { id } = req.params;
    const { roomNumber, roomType, price, capacity, status } = req.body;
    try {
        const [result] = await pool.execute(
            'UPDATE rooms SET room_number = ?, room_type = ?, price = ?, capacity = ?, status = ? WHERE id = ?',
            [roomNumber, roomType, price, capacity, status, id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Room not found' });
        }
        res.json({ message: 'Room updated successfully' });
    } catch (error) {
        console.error('Error updating room:', error);
        res.status(500).json({ error: 'Failed to update room' });
    }
});

// Delete a room
app.delete('/api/rooms/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.execute('DELETE FROM rooms WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Room not found' });
        }
        res.json({ message: 'Room deleted successfully' });
    } catch (error) {
        console.error('Error deleting room:', error);
        res.status(500).json({ error: 'Failed to delete room' });
    }
});

// Search rooms
app.get('/api/rooms/search', async (req, res) => {
    const searchTerm = req.query.q;
    if (!searchTerm) {
        return res.status(400).json({ error: 'Search term is required' });
    }
    try {
        const [rows] = await pool.execute(`
            SELECT * FROM rooms
            WHERE room_number LIKE ? OR room_type LIKE ? OR status LIKE ?
        `, [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`]);

        res.json(rows);
    } catch (error) {
        console.error('Error searching rooms:', error);
        res.status(500).json({ error: 'Failed to search rooms' });
    }
});

// Get room statistics
app.get('/api/rooms/stats', async (req, res) => {
    try {
        const [stats] = await pool.execute(`
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
                SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) as occupied,
                SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance
            FROM rooms
        `);

        res.json(stats[0]);
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start the server
app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Frontend: http://localhost:${PORT}`);
    await testConnection(); // Test database connection on startup
});
