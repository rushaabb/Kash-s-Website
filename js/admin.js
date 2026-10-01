const API_BASE = '/api';

// Elements
const loginScreen = document.getElementById('login-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const showsTbody = document.getElementById('shows-tbody');
const addShowBtn = document.getElementById('add-show-btn');
const showModal = document.getElementById('show-modal');
const showForm = document.getElementById('show-form');
const cancelModalBtn = document.getElementById('cancel-modal');
const modalTitle = document.getElementById('modal-title');

// Karaoke Elements
const editKaraokeBtn = document.getElementById('edit-karaoke-btn');
const karaokeModal = document.getElementById('karaoke-modal');
const karaokeForm = document.getElementById('karaoke-form');
const cancelKaraokeModalBtn = document.getElementById('cancel-karaoke-modal');

const prevKStatus = document.getElementById('prev-k-status');
const prevKTitle = document.getElementById('prev-k-title');
const prevKSchedule = document.getElementById('prev-k-schedule');
const prevKVenue = document.getElementById('prev-k-venue');
const prevKBtn = document.getElementById('prev-k-btn');

const karaokeEnabledInput = document.getElementById('karaoke-enabled');
const karaokeTitleInput = document.getElementById('karaoke-title');
const karaokeScheduleInput = document.getElementById('karaoke-schedule');
const karaokeVenueInput = document.getElementById('karaoke-venue');
const karaokeBtnTextInput = document.getElementById('karaoke-btn-text');
const karaokeBtnLinkInput = document.getElementById('karaoke-btn-link');

let currentKaraoke = null;

// Auth Setup
function getToken() {
    return localStorage.getItem('token');
}

function getHeaders() {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
}

// Check initial auth state
if (getToken()) {
    showDashboard();
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    try {
        const res = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        let data = {};
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            data = await res.json();
        } else {
            const text = await res.text();
            if (res.status === 404) {
                throw new Error('API server unreachable (404 Not Found). Backend is deploying.');
            }
            throw new Error(`Server status ${res.status}: ${text || res.statusText}`);
        }
        
        if (!res.ok) {
            throw new Error(data.error || 'Invalid credentials');
        }
        
        localStorage.setItem('token', data.token);
        showDashboard();
    } catch (err) {
        loginError.textContent = err.message;
    }
});

// Logout
logoutBtn.addEventListener('click', async () => {
    try {
        await fetch(`${API_BASE}/logout`, { method: 'POST' });
    } catch (e) {}
    localStorage.removeItem('token');
    showLogin();
});

function showLogin() {
    dashboardScreen.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    loginForm.reset();
}

function showDashboard() {
    loginScreen.classList.add('hidden');
    dashboardScreen.classList.remove('hidden');
    fetchShows();
    fetchKaraoke();
}

// Fetch Karaoke
async function fetchKaraoke() {
    try {
        const res = await fetch(`${API_BASE}/karaoke`);
        const karaoke = await res.json();
        currentKaraoke = karaoke;
        renderKaraoke(karaoke);
    } catch (err) {
        console.error('Failed to fetch karaoke settings', err);
    }
}

function renderKaraoke(k) {
    if (!k) return;
    if (prevKStatus) {
        prevKStatus.innerHTML = k.enabled !== false 
            ? '<span class="status-badge active">Active / Visible</span>'
            : '<span class="status-badge inactive">Hidden / Inactive</span>';
    }
    if (prevKTitle) prevKTitle.textContent = k.title || 'Karaoke Nights';
    if (prevKSchedule) prevKSchedule.textContent = k.schedule || 'Every Friday • 8 PM onwards';
    if (prevKVenue) prevKVenue.textContent = k.venue || 'The Melody Lounge, Mumbai';
    if (prevKBtn) {
        const text = k.btn_text || 'Reserve a Spot';
        const link = k.btn_link || '#contact';
        prevKBtn.innerHTML = `${text} (<code>${link}</code>)`;
    }
}

// Fetch Shows
async function fetchShows() {
    try {
        const res = await fetch(`${API_BASE}/shows`);
        const shows = await res.json();
        renderShows(shows);
    } catch (err) {
        console.error('Failed to fetch shows', err);
    }
}

function renderShows(shows) {
    showsTbody.innerHTML = '';
    shows.forEach(show => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${show.date}</td>
            <td>${show.venue}</td>
            <td>${show.city}</td>
            <td>${show.type}</td>
            <td>${show.ticket_url ? `<a href="${show.ticket_url}" target="_blank" style="color:#d4a017">Link</a>` : '-'}</td>
            <td class="action-btns">
                <button class="edit-btn" onclick="editShow(${show.id})">Edit</button>
                <button class="delete-btn" onclick="deleteShow(${show.id})">Delete</button>
            </td>
        `;
        // Store data on element for easy retrieval
        tr.dataset.show = JSON.stringify(show);
        showsTbody.appendChild(tr);
    });
}

// Modal handling
addShowBtn.addEventListener('click', () => {
    modalTitle.textContent = 'Add Show';
    showForm.reset();
    document.getElementById('show-id').value = '';
    showModal.classList.remove('hidden');
});

cancelModalBtn.addEventListener('click', () => {
    showModal.classList.add('hidden');
});

// Add/Edit Submit
showForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('show-id').value;
    const date = document.getElementById('show-date').value;
    const venue = document.getElementById('show-venue').value;
    const city = document.getElementById('show-city').value;
    const type = document.getElementById('show-type').value;
    const ticket_url = document.getElementById('show-url').value;

    const payload = { date, venue, city, type, ticket_url };
    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_BASE}/shows/${id}` : `${API_BASE}/shows`;

    try {
        const res = await fetch(url, {
            method,
            headers: getHeaders(),
            body: JSON.stringify(payload)
        });
        
        if (!res.ok) {
            if (res.status === 401) return handleUnauthorized();
            throw new Error('Save failed');
        }
        
        showModal.classList.add('hidden');
        fetchShows();
    } catch (err) {
        alert(err.message);
    }
});

// Edit Show
window.editShow = function(id) {
    const row = Array.from(showsTbody.children).find(tr => {
        const show = JSON.parse(tr.dataset.show);
        return show.id === id;
    });
    
    if (row) {
        const show = JSON.parse(row.dataset.show);
        modalTitle.textContent = 'Edit Show';
        document.getElementById('show-id').value = show.id;
        document.getElementById('show-date').value = show.date;
        document.getElementById('show-venue').value = show.venue;
        document.getElementById('show-city').value = show.city;
        document.getElementById('show-type').value = show.type;
        document.getElementById('show-url').value = show.ticket_url || '';
        showModal.classList.remove('hidden');
    }
};

// Delete Show
window.deleteShow = async function(id) {
    if (!confirm('Are you sure you want to delete this show?')) return;
    
    try {
        const res = await fetch(`${API_BASE}/shows/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        
        if (!res.ok) {
            if (res.status === 401) return handleUnauthorized();
            throw new Error('Delete failed');
        }
        
        fetchShows();
    } catch (err) {
        alert(err.message);
    }
};

function handleUnauthorized() {
    localStorage.removeItem('token');
    showLogin();
    alert('Session expired. Please login again.');
}

// Karaoke Modal Handling
if (editKaraokeBtn) {
    editKaraokeBtn.addEventListener('click', () => {
        const k = currentKaraoke || {
            title: 'Karaoke Nights',
            schedule: 'Every Friday • 8 PM onwards',
            venue: 'The Melody Lounge, Mumbai',
            btn_text: 'Reserve a Spot',
            btn_link: '#contact',
            enabled: true
        };
        
        if (karaokeEnabledInput) karaokeEnabledInput.checked = k.enabled !== false;
        if (karaokeTitleInput) karaokeTitleInput.value = k.title || 'Karaoke Nights';
        if (karaokeScheduleInput) karaokeScheduleInput.value = k.schedule || 'Every Friday • 8 PM onwards';
        if (karaokeVenueInput) karaokeVenueInput.value = k.venue || 'The Melody Lounge, Mumbai';
        if (karaokeBtnTextInput) karaokeBtnTextInput.value = k.btn_text || 'Reserve a Spot';
        if (karaokeBtnLinkInput) karaokeBtnLinkInput.value = k.btn_link || '#contact';

        karaokeModal.classList.remove('hidden');
    });
}

if (cancelKaraokeModalBtn) {
    cancelKaraokeModalBtn.addEventListener('click', () => {
        karaokeModal.classList.add('hidden');
    });
}

if (karaokeForm) {
    karaokeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const payload = {
            enabled: karaokeEnabledInput ? karaokeEnabledInput.checked : true,
            title: karaokeTitleInput ? karaokeTitleInput.value.trim() : 'Karaoke Nights',
            schedule: karaokeScheduleInput ? karaokeScheduleInput.value.trim() : 'Every Friday • 8 PM onwards',
            venue: karaokeVenueInput ? karaokeVenueInput.value.trim() : 'The Melody Lounge, Mumbai',
            btn_text: karaokeBtnTextInput ? karaokeBtnTextInput.value.trim() : 'Reserve a Spot',
            btn_link: karaokeBtnLinkInput ? karaokeBtnLinkInput.value.trim() : '#contact'
        };

        try {
            const res = await fetch(`${API_BASE}/karaoke`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) {
                if (res.status === 401) return handleUnauthorized();
                throw new Error(data.error || 'Failed to update karaoke');
            }

            currentKaraoke = data.karaoke || payload;
            renderKaraoke(currentKaraoke);
            karaokeModal.classList.add('hidden');
        } catch (err) {
            alert(err.message);
        }
    });
}
