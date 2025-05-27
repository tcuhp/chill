const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


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

// tao ket noi toi database
const pool = mysql.createPool(dbConfig);

//kiem tra ket noi toi database
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Database connected successfully');
        connection.release();
    } catch (error) {
        console.error(' Database connection failed:', error.message);
    }
}


app.use(express.static(path.join(__dirname, '../FE')));

// Route 
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../FE/index.html'));
});

app.get('/api/rooms', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM rooms');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching rooms:', error);
        res.status(500).json({ error: 'Failed to fetch rooms' });
    }
});

// them phong 
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

// edit phong 
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

// xoa phong 
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

// tim phong 
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

// 404 
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// bat dau vao sv 
app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Frontend: http://localhost:${PORT}`);
    await testConnection(); 
});
