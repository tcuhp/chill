// API Configuration
const API_BASE_URL = 'http://localhost:3000/api';

let rooms = [];
let editingId = null;

const { useState, useEffect } = React;

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

let searchRoot = null;
let statsRoot = null;

document.addEventListener('DOMContentLoaded', async () => {
    await loadRooms();
    initializeReactComponents();

    document.getElementById('addBtn').addEventListener('click', handleAdd);
    document.getElementById('updateBtn').addEventListener('click', handleUpdate);
});

function initializeReactComponents() {
    const searchContainer = document.querySelector('.search-container');
    if (searchContainer && !searchRoot) {
        searchRoot = ReactDOM.createRoot(searchContainer);
    }
    
    if (searchRoot) {
        searchRoot.render(
            React.createElement(SearchBar, {
                rooms: rooms,
                onSearchResults: (results) => {
                    displayRooms(results);
                }
            })
        );
    }

 
    updateReactStats();
}

function updateReactStats() {
    const statsContainer = document.querySelector('.room-stats');
    if (statsContainer && !statsRoot) {
        statsRoot = ReactDOM.createRoot(statsContainer);
    }
    
    if (statsRoot) {
        statsRoot.render(
            React.createElement(RoomStats, { rooms: rooms })
        );
    }
}


async function apiCall(url, options = {}) {
    try {
        console.log('API Call:', url, options); 
        
        const response = await fetch(`${API_BASE_URL}${url}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        });

        const responseText = await response.text();
        console.log('API Response:', response.status, responseText); // Debug log

        if (!response.ok) {
            let error;
            try {
                error = JSON.parse(responseText);
            } catch (e) {
                error = { error: responseText || `HTTP error! status: ${response.status}` };
            }
            throw new Error(error.error || `HTTP error! status: ${response.status}`);
        }

        return responseText ? JSON.parse(responseText) : {};
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
        updateReactStats();
        hideMessage();
    } catch (error) {
        console.error('Load rooms error:', error);
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


async function handleAdd() {
    const formData = getFormData();
    console.log('Form data for add:', formData); 
    
    if (!validateForm(formData)) return;

    try {
        showMessage('Đang thêm phòng...', 'info');
        const newRoom = await createRoom(formData);
        console.log('New room created:', newRoom); 
        
    
        await loadRooms();
        initializeReactComponents();
        resetForm();
        showMessage('Thêm phòng thành công!', 'success');
    } catch (error) {
        console.error('Add room error:', error);
        showMessage('Lỗi khi thêm phòng: ' + error.message, 'error');
    }
}

async function handleUpdate() {
    if (editingId === null) return;

    const formData = getFormData();
    console.log('Form data for update:', formData, 'ID:', editingId); // Debug log
    
    if (!validateForm(formData)) return;

    try {
        showMessage('Đang cập nhật phòng...', 'info');
        const result = await updateRoom(editingId, formData);
        console.log('Room updated:', result); 
        
    
        await loadRooms();
        initializeReactComponents();
        resetForm();
        showMessage('Cập nhật phòng thành công!', 'success');
    } catch (error) {
        console.error('Update room error:', error);
        showMessage('Lỗi khi cập nhật phòng: ' + error.message, 'error');
    }
}

function editRoom(id) {
    console.log('Edit room:', id); 
    const room = rooms.find(r => r.id === id);
    if (!room) {
        console.error('Room not found:', id);
        return;
    }

    console.log('Found room:', room); 

    document.getElementById('roomNumber').value = room.room_number;
    document.getElementById('roomType').value = room.room_type;
    document.getElementById('price').value = room.price;
    document.getElementById('capacity').value = room.capacity;
    document.getElementById('status').value = room.status;

    editingId = id;
    document.getElementById('addBtn').disabled = true;
    document.getElementById('updateBtn').disabled = false;
    document.getElementById('formTitle').textContent = 'Cập nhật phòng';
    
  
    document.querySelector('.form-section').scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
    });
}

async function deleteRoom(id) {
    console.log('Delete room:', id); 
    const room = rooms.find(r => r.id === id);
    if (!room) {
        console.error('Room not found:', id);
        return;
    }

    if (confirm(`Bạn có chắc muốn xóa phòng ${room.room_number}?`)) {
        try {
            showMessage('Đang xóa phòng...', 'info');
            const result = await deleteRoomAPI(id);
            console.log('Room deleted:', result); 
            
        
            await loadRooms();
            initializeReactComponents();
            showMessage('Xóa phòng thành công!', 'success');
        } catch (error) {
            console.error('Delete room error:', error);
            showMessage('Lỗi khi xóa phòng: ' + error.message, 'error');
        }
    }
}


function getFormData() {
    const formData = {
        roomNumber: document.getElementById('roomNumber').value.trim(),
        roomType: document.getElementById('roomType').value,
        price: parseFloat(document.getElementById('price').value) || 0,
        capacity: parseInt(document.getElementById('capacity').value) || 0,
        status: document.getElementById('status').value
    };
    
    console.log('Raw form data:', formData); 
    return formData;
}

function validateForm(data) {
    console.log('Validating form data:', data); 
    
    if (!data.roomNumber || !data.roomType || !data.price || !data.capacity || !data.status) {
        console.log('Missing fields validation failed');
        showMessage('Vui lòng điền đầy đủ thông tin!', 'error');
        return false;
    }

    if (data.price <= 0) {
        console.log('Price validation failed:', data.price);
        showMessage('Giá phòng phải lớn hơn 0!', 'error');
        return false;
    }

    if (data.capacity <= 0) {
        console.log('Capacity validation failed:', data.capacity);
        showMessage('Sức chứa phải lớn hơn 0!', 'error');
        return false;
    }

    
    const duplicateRoom = rooms.find(room => 
        room.room_number === data.roomNumber && 
        room.id !== editingId
    );
    
    if (duplicateRoom) {
        console.log('Duplicate room number:', data.roomNumber);
        showMessage('Số phòng đã tồn tại!', 'error');
        return false;
    }

    console.log('Validation passed');
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

setInterval(async () => {
    if (document.visibilityState === 'visible' && editingId === null) {
        try {
            await loadRooms();
            initializeReactComponents();
        } catch (error) {
            console.error('Auto-refresh failed:', error);
        }
    }
}, 10000);