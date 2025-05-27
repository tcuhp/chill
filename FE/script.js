// API Configuration
const API_BASE_URL = 'http://localhost:3000/api';

let rooms = [];
let editingId = null;

// React Components Integration
const { useState, useEffect } = React;

// Custom Hook for Format Utils
const useFormatUtils = () => {
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    };

    const getStatusBadge = (status) => {
        const statusMap = {
            available: { text: 'Trống', class: 'status-available', icon: 'check-circle' },
            occupied: { text: 'Đã đặt', class: 'status-occupied', icon: 'times-circle' },
            maintenance: { text: 'Bảo trì', class: 'status-maintenance', icon: 'tools' }
        };

        const statusInfo = statusMap[status];
        return `<span class="status-badge ${statusInfo.class}">
            <i class="fas fa-${statusInfo.icon}"></i>
            ${statusInfo.text}
        </span>`;
    };

    return { formatCurrency, getStatusBadge };
};

// React Component for Room Stats
const RoomStats = ({ rooms }) => {
    const available = rooms.filter(r => r.status === 'available').length;
    const occupied = rooms.filter(r => r.status === 'occupied').length;
    const maintenance = rooms.filter(r => r.status === 'maintenance').length;

    return React.createElement('div', { className: 'room-stats' }, [
        React.createElement('div', { className: 'stat', key: 'available' }, [
            React.createElement('i', { 
                className: 'fas fa-circle', 
                style: { color: '#10b981' },
                key: 'icon1'
            }),
            React.createElement('span', { key: 'text1' }, `Trống: ${available}`)
        ]),
        React.createElement('div', { className: 'stat', key: 'occupied' }, [
            React.createElement('i', { 
                className: 'fas fa-circle', 
                style: { color: '#ef4444' },
                key: 'icon2'
            }),
            React.createElement('span', { key: 'text2' }, `Đã đặt: ${occupied}`)
        ]),
        React.createElement('div', { className: 'stat', key: 'maintenance' }, [
            React.createElement('i', { 
                className: 'fas fa-circle', 
                style: { color: '#f59e0b' },
                key: 'icon3'
            }),
            React.createElement('span', { key: 'text3' }, `Bảo trì: ${maintenance}`)
        ])
    ]);
};

// React Component for Search Bar
const SearchBar = ({ rooms, onSearchResults }) => {
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const handleSearch = () => {
            if (searchTerm.trim() === '') {
                onSearchResults(rooms);
                return;
            }

            const filteredRooms = rooms.filter(room => 
                room.room_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                room.room_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                room.status?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            
            onSearchResults(filteredRooms);
        };

        const debounceTimer = setTimeout(handleSearch, 300);
        return () => clearTimeout(debounceTimer);
    }, [searchTerm, rooms, onSearchResults]);

    return React.createElement('div', { className: 'search-container' }, [
        React.createElement('input', {
            key: 'input',
            type: 'text',
            value: searchTerm,
            onChange: (e) => setSearchTerm(e.target.value),
            className: 'search-input',
            placeholder: 'Tìm kiếm theo số phòng, loại phòng...'
        }),
        React.createElement('i', {
            key: 'icon',
            className: 'fas fa-search search-icon'
        })
    ]);
};

// Initialize React components after DOM is loaded
let searchResultsState = [];

document.addEventListener('DOMContentLoaded', async () => {
    await loadRooms();
    initializeReactComponents();

    // Keep existing event listeners for form
    document.getElementById('addBtn').addEventListener('click', handleAdd);
    document.getElementById('updateBtn').addEventListener('click', handleUpdate);
});

function initializeReactComponents() {
    // Initialize Search Component
    const searchContainer = document.querySelector('.search-container');
    if (searchContainer) {
        const searchRoot = ReactDOM.createRoot(searchContainer);
        searchRoot.render(
            React.createElement(SearchBar, {
                rooms: rooms,
                onSearchResults: (results) => {
                    searchResultsState = results;
                    displayRooms(results);
                }
            })
        );
    }

    // Initialize Stats Component
    updateReactStats();
}

function updateReactStats() {
    const statsContainer = document.querySelector('.room-stats');
    if (statsContainer) {
        const statsRoot = ReactDOM.createRoot(statsContainer);
        statsRoot.render(
            React.createElement(RoomStats, { rooms: rooms })
        );
    }
}

// API Functions (unchanged)
async function apiCall(url, options = {}) {
    try {
        const response = await fetch(`${API_BASE_URL}${url}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

async function loadRooms() {
    try {
        showMessage('Đang tải dữ liệu...', 'info');
        rooms = await apiCall('/rooms');
        console.log('Rooms loaded:', rooms);
        displayRooms(rooms);
        updateReactStats(); // Update React stats component
        hideMessage();
    } catch (error) {
        showMessage('Lỗi khi tải dữ liệu: ' + error.message, 'error');
    }
}

async function createRoom(roomData) {
    return await apiCall('/rooms', {
        method: 'POST',
        body: JSON.stringify(roomData),
    });
}

async function updateRoom(id, roomData) {
    return await apiCall(`/rooms/${id}`, {
        method: 'PUT',
        body: JSON.stringify(roomData),
    });
}

async function deleteRoomAPI(id) {
    return await apiCall(`/rooms/${id}`, {
        method: 'DELETE',
    });
}

// Display Functions - Updated to use React format utils
function displayRooms(roomsToShow) {
    const tbody = document.getElementById('roomList');
    tbody.innerHTML = '';

    if (roomsToShow.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="no-results">
                    <i class="fas fa-search"></i>
                    <div>Không tìm thấy phòng nào</div>
                </td>
            </tr>
        `;
        return;
    }

    // Use format utils from React hook
    const { formatCurrency, getStatusBadge } = useFormatUtils();

    roomsToShow.forEach(room => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${room.room_number}</strong></td>
            <td><span class="room-type">${room.room_type}</span></td>
            <td><span class="price">${formatCurrency(room.price)}</span></td>
            <td><i class="fas fa-users"></i> ${room.capacity} người</td>
            <td>${getStatusBadge(room.status)}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn edit-btn" onclick="editRoom(${room.id})">
                        <i class="fas fa-edit"></i> Sửa
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteRoom(${room.id})">
                        <i class="fas fa-trash"></i> Xóa
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Event Handlers (updated to work with React components)
async function handleAdd() {
    const formData = getFormData();
    if (!validateForm(formData)) return;

    try {
        showMessage('Đang thêm phòng...', 'info');
        const newRoom = await createRoom(formData);
        rooms.push(newRoom);
        
        resetForm();
        displayRooms(rooms);
        updateReactStats(); // Update React stats
        initializeReactComponents(); // Reinitialize search with new data
        showMessage('Thêm phòng thành công!', 'success');
    } catch (error) {
        showMessage('Lỗi khi thêm phòng: ' + error.message, 'error');
    }
}

async function handleUpdate() {
    if (editingId === null) return;

    const formData = getFormData();
    if (!validateForm(formData)) return;

    try {
        showMessage('Đang cập nhật phòng...', 'info');
        const updatedRoom = await updateRoom(editingId, formData);
        
        const roomIndex = rooms.findIndex(room => room.id === editingId);
        if (roomIndex !== -1) {
            rooms[roomIndex] = updatedRoom;
        }
        
        resetForm();
        displayRooms(rooms);
        updateReactStats(); // Update React stats
        initializeReactComponents(); // Reinitialize search with updated data
        showMessage('Cập nhật phòng thành công!', 'success');
    } catch (error) {
        showMessage('Lỗi khi cập nhật phòng: ' + error.message, 'error');
    }
}

function editRoom(id) {
    const room = rooms.find(r => r.id === id);
    if (!room) return;

    document.getElementById('roomNumber').value = room.room_number;
    document.getElementById('roomType').value = room.room_type;
    document.getElementById('price').value = room.price;
    document.getElementById('capacity').value = room.capacity;
    document.getElementById('status').value = room.status;

    editingId = id;
    document.getElementById('addBtn').disabled = true;
    document.getElementById('updateBtn').disabled = false;
    document.getElementById('formTitle').textContent = 'Cập nhật phòng';
}

async function deleteRoom(id) {
    const room = rooms.find(r => r.id === id);
    if (!room) return;

    if (confirm(`Bạn có chắc muốn xóa phòng ${room.room_number}?`)) {
        try {
            showMessage('Đang xóa phòng...', 'info');
            await deleteRoomAPI(id);
            rooms = rooms.filter(r => r.id !== id);
            displayRooms(rooms);
            updateReactStats(); // Update React stats
            initializeReactComponents(); // Reinitialize search with updated data
            showMessage('Xóa phòng thành công!', 'success');
        } catch (error) {
            showMessage('Lỗi khi xóa phòng: ' + error.message, 'error');
        }
    }
}

// Helper Functions (unchanged)
function getFormData() {
    return {
        room_number: document.getElementById('roomNumber').value.trim(),
        room_type: document.getElementById('roomType').value,
        price: parseInt(document.getElementById('price').value) || 0,
        capacity: parseInt(document.getElementById('capacity').value) || 0,
        status: document.getElementById('status').value
    };
}

function validateForm(data) {
    if (!data.room_number || !data.room_type || !data.price || !data.capacity || !data.status) {
        showMessage('Vui lòng điền đầy đủ thông tin!', 'error');
        return false;
    }

    if (data.price <= 0) {
        showMessage('Giá phòng phải lớn hơn 0!', 'error');
        return false;
    }

    if (data.capacity <= 0) {
        showMessage('Sức chứa phải lớn hơn 0!', 'error');
        return false;
    }

    return true;
}

function resetForm() {
    document.getElementById('roomForm').reset();
    editingId = null;
    document.getElementById('addBtn').disabled = false;
    document.getElementById('updateBtn').disabled = true;
    document.getElementById('formTitle').textContent = 'Thêm phòng mới';
}

function showMessage(message, type) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = message;
    messageEl.className = `message ${type} show`;

    if (type !== 'info') {
        setTimeout(() => {
            messageEl.classList.remove('show');
        }, 3000);
    }
}

function hideMessage() {
    const messageEl = document.getElementById('message');
    messageEl.classList.remove('show');
}

// Auto-refresh data every 30 seconds
setInterval(async () => {
    if (document.visibilityState === 'visible') {
        try {
            await loadRooms();
            initializeReactComponents(); // Reinitialize React components with fresh data
        } catch (error) {
            console.error('Auto-refresh failed:', error);
        }
    }
}, 30000);