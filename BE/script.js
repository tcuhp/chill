// API Configuration
const API_BASE_URL = 'http://localhost:3000/api';

let rooms = [];
let editingId = null;

document.addEventListener('DOMContentLoaded', async () => {
    await loadRooms();
    updateStats();

    // Event listeners
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    document.getElementById('addBtn').addEventListener('click', handleAdd);
    document.getElementById('updateBtn').addEventListener('click', handleUpdate);
});

// API Functions
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
        displayRooms(rooms);
        updateStats();
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

async function searchRooms(term) {
    if (!term.trim()) {
        return rooms;
    }
    return await apiCall(`/rooms/search/${encodeURIComponent(term)}`);
}

// Display Functions
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

    roomsToShow.forEach(room => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${room.roomNumber}</strong></td>
            <td><span class="room-type">${room.roomType}</span></td>
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

function getStatusBadge(status) {
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
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

function updateStats() {
    const available = rooms.filter(r => r.status === 'available').length;
    const occupied = rooms.filter(r => r.status === 'occupied').length;
    const maintenance = rooms.filter(r => r.status === 'maintenance').length;

    document.getElementById('availableCount').textContent = available;
    document.getElementById('occupiedCount').textContent = occupied;
    document.getElementById('maintenanceCount').textContent = maintenance;
}

// Event Handlers
async function handleSearch() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    
    try {
        let filteredRooms;
        if (searchTerm === '') {
            filteredRooms = rooms;
        } else {
            // Use local search for better performance
            filteredRooms = rooms.filter(room => 
                room.roomNumber.toLowerCase().includes(searchTerm) ||
                room.roomType.toLowerCase().includes(searchTerm) ||
                room.status.toLowerCase().includes(searchTerm)
            );
        }
        displayRooms(filteredRooms);
    } catch (error) {
        showMessage('Lỗi khi tìm kiếm: ' + error.message, 'error');
    }
}

async function handleAdd() {
    const formData = getFormData();
    if (!validateForm(formData)) return;

    try {
        showMessage('Đang thêm phòng...', 'info');
        const newRoom = await createRoom(formData);
        rooms.push(newRoom);
        
        resetForm();
        displayRooms(rooms);
        updateStats();
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
        updateStats();
        showMessage('Cập nhật phòng thành công!', 'success');
    } catch (error) {
        showMessage('Lỗi khi cập nhật phòng: ' + error.message, 'error');
    }
}

function editRoom(id) {
    const room = rooms.find(r => r.id === id);
    if (!room) return;

    document.getElementById('roomNumber').value = room.roomNumber;
    document.getElementById('roomType').value = room.roomType;
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

    if (confirm(`Bạn có chắc muốn xóa phòng ${room.roomNumber}?`)) {
        try {
            showMessage('Đang xóa phòng...', 'info');
            await deleteRoomAPI(id);
            rooms = rooms.filter(r => r.id !== id);
            displayRooms(rooms);
            updateStats();
            showMessage('Xóa phòng thành công!', 'success');
        } catch (error) {
            showMessage('Lỗi khi xóa phòng: ' + error.message, 'error');
        }
    }
}

// Helper Functions
function getFormData() {
    return {
        roomNumber: document.getElementById('roomNumber').value.trim(),
        roomType: document.getElementById('roomType').value,
        price: parseInt(document.getElementById('price').value) || 0,
        capacity: parseInt(document.getElementById('capacity').value) || 0,
        status: document.getElementById('status').value
    };
}

function validateForm(data) {
    if (!data.roomNumber || !data.roomType || !data.price || !data.capacity || !data.status) {
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

// Auto-refresh data every 30 seconds (optional)
setInterval(async () => {
    if (document.visibilityState === 'visible') {
        try {
            await loadRooms();
        } catch (error) {
            console.error('Auto-refresh failed:', error);
        }
    }
}, 30000);