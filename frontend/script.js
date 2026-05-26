const API_URL = 'http://localhost:5000/tasks';

let tasks = [];
let currentEditingTaskId = null;
let currentDeletingTaskId = null;
let isDarkMode = localStorage.getItem('darkMode') === 'true';

document.addEventListener('DOMContentLoaded', () => {
    applyTheme();
    fetchTasks();

    document.getElementById('addTaskForm').addEventListener('submit', (event) => {
        event.preventDefault();
        addTask();
    });

    document.getElementById('searchInput').addEventListener('input', filterTasks);
    document.querySelectorAll('input[name="status"]').forEach((radio) => {
        radio.addEventListener('change', filterTasks);
    });
    document.getElementById('priorityFilter').addEventListener('change', filterTasks);
    document.getElementById('categoryFilter').addEventListener('change', filterTasks);
});

async function fetchTasks() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Failed to fetch tasks');

        tasks = await response.json();
        if (!Array.isArray(tasks)) tasks = [];

        updateCategoryFilter();
        updateStatistics();
        filterTasks();
    } catch (error) {
        console.error('Error fetching tasks:', error);
        showToast('Could not load tasks');
        displayTasks([]);
    }
}

async function addTask() {
    const title = document.getElementById('taskInput').value.trim();
    const priority = document.getElementById('priorityInput').value;
    const category = document.getElementById('categoryInput').value;
    const dueDate = document.getElementById('dueDateInput').value;
    const description = document.getElementById('descriptionInput').value.trim();

    if (!title) {
        showToast('Please enter a task title');
        return;
    }

    const newTask = {
        id: Date.now(),
        title,
        description,
        priority,
        category,
        dueDate,
        status: 'pending',
        createdAt: new Date().toISOString(),
        completedAt: null
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newTask)
        });

        if (!response.ok) throw new Error('Failed to create task');

        const savedTask = await response.json();
        tasks.push(savedTask);
        document.getElementById('addTaskForm').reset();
        document.getElementById('priorityInput').value = 'medium';

        updateCategoryFilter();
        updateStatistics();
        filterTasks();
        showToast('Task added');
    } catch (error) {
        console.error('Error adding task:', error);
        showToast('Failed to add task');
    }
}

async function updateTask(id, updates) {
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });

        if (!response.ok) throw new Error('Failed to update task');

        const updatedTask = await response.json();
        const index = tasks.findIndex((task) => task.id === id);
        if (index !== -1) tasks[index] = updatedTask;

        updateCategoryFilter();
        updateStatistics();
        filterTasks();
    } catch (error) {
        console.error('Error updating task:', error);
        showToast('Failed to update task');
    }
}

async function deleteTask(id) {
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to delete task');

        tasks = tasks.filter((task) => task.id !== id);
        updateCategoryFilter();
        updateStatistics();
        filterTasks();
        showToast('Task deleted');
    } catch (error) {
        console.error('Error deleting task:', error);
        showToast('Failed to delete task');
    }
}

function toggleTaskComplete(id) {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;

    updateTask(id, {
        status: task.status === 'completed' ? 'pending' : 'completed',
        completedAt: task.status === 'completed' ? null : new Date().toISOString()
    });
}

function openEditModal(id) {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;

    currentEditingTaskId = id;
    document.getElementById('editTitle').value = task.title;
    document.getElementById('editDescription').value = task.description || '';
    document.getElementById('editPriority').value = task.priority;
    document.getElementById('editCategory').value = task.category;
    document.getElementById('editDueDate').value = task.dueDate || '';

    new bootstrap.Modal(document.getElementById('editModal')).show();
}

function saveEditedTask() {
    const updates = {
        title: document.getElementById('editTitle').value.trim(),
        description: document.getElementById('editDescription').value.trim(),
        priority: document.getElementById('editPriority').value,
        category: document.getElementById('editCategory').value,
        dueDate: document.getElementById('editDueDate').value
    };

    if (!updates.title) {
        showToast('Please enter a title');
        return;
    }

    updateTask(currentEditingTaskId, updates);
    bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
}

function openDeleteModal(id) {
    currentDeletingTaskId = id;
    new bootstrap.Modal(document.getElementById('deleteModal')).show();
}

function confirmDelete() {
    if (!currentDeletingTaskId) return;

    deleteTask(currentDeletingTaskId);
    bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
    currentDeletingTaskId = null;
}

function displayTasks(tasksToDisplay) {
    const container = document.getElementById('taskContainer');

    if (tasksToDisplay.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div>
                    <i class="bi bi-inbox"></i>
                    <p>No tasks found</p>
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = tasksToDisplay.map((task) => `
        <article class="card task-card priority-${escapeHtml(task.priority || 'medium')} ${task.status === 'completed' ? 'completed' : ''}">
            <div class="card-body">
                <div class="task-row">
                    <div class="task-main">
                        <input type="checkbox" class="task-checkbox"
                               ${task.status === 'completed' ? 'checked' : ''}
                               onchange="toggleTaskComplete(${task.id})"
                               aria-label="Toggle task completion">
                        <div class="task-content">
                            <h2 class="task-title">${escapeHtml(task.title)}</h2>
                            <div class="task-meta">
                                <span class="badge-custom badge-${escapeHtml(task.priority || 'medium')}">
                                    <i class="bi bi-flag"></i>${escapeHtml(capitalize(task.priority || 'medium'))}
                                </span>
                                <span class="category-badge">
                                    <i class="bi bi-tag"></i>${escapeHtml(capitalize(task.category || 'other'))}
                                </span>
                                ${task.dueDate ? `
                                    <span class="due-date ${isOverdue(task.dueDate) ? 'overdue' : ''}">
                                        <i class="bi bi-calendar3"></i>${formatDate(task.dueDate)}
                                    </span>
                                ` : ''}
                            </div>
                            ${task.description ? `
                                <div class="task-description">${escapeHtml(task.description)}</div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="task-actions">
                        <button class="task-btn" onclick="openEditModal(${task.id})" title="Edit task" aria-label="Edit task">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="task-btn delete" onclick="openDeleteModal(${task.id})" title="Delete task" aria-label="Delete task">
                            <i class="bi bi-trash3"></i>
                        </button>
                    </div>
                </div>
            </div>
        </article>
    `).join('');
}

function filterTasks() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.querySelector('input[name="status"]:checked')?.value || 'all';
    const priorityFilter = document.getElementById('priorityFilter').value;
    const categoryFilter = document.getElementById('categoryFilter').value;

    const filtered = tasks.filter((task) => {
        const matchesSearch = task.title.toLowerCase().includes(searchTerm) ||
            (task.description && task.description.toLowerCase().includes(searchTerm));
        const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
        const matchesPriority = !priorityFilter || task.priority === priorityFilter;
        const matchesCategory = !categoryFilter || task.category === categoryFilter;

        return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
    });

    filtered.sort((a, b) => {
        const priorityOrder = { high: 1, medium: 2, low: 3 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;

        if (a.dueDate && b.dueDate) {
            return new Date(a.dueDate) - new Date(b.dueDate);
        }
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    displayTasks(filtered);
}

function updateStatistics() {
    const total = tasks.length;
    const completed = tasks.filter((task) => task.status === 'completed').length;
    const pending = tasks.filter((task) => task.status === 'pending').length;
    const high = tasks.filter((task) => task.priority === 'high').length;

    document.getElementById('statTotal').textContent = total;
    document.getElementById('statCompleted').textContent = completed;
    document.getElementById('statPending').textContent = pending;
    document.getElementById('statHigh').textContent = high;
    document.getElementById('taskCount').textContent = total;
}

function updateCategoryFilter() {
    const categories = [...new Set(tasks.map((task) => task.category || 'other'))].sort();
    const select = document.getElementById('categoryFilter');
    const currentValue = select.value;

    select.innerHTML = '<option value="">All categories</option>';
    categories.forEach((category) => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = capitalize(category);
        select.appendChild(option);
    });

    select.value = categories.includes(currentValue) ? currentValue : '';
}

function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('statusAll').checked = true;
    document.getElementById('priorityFilter').value = '';
    document.getElementById('categoryFilter').value = '';
    filterTasks();
}

function toggleTheme() {
    isDarkMode = !isDarkMode;
    localStorage.setItem('darkMode', isDarkMode);
    applyTheme();
}

function applyTheme() {
    document.documentElement.classList.toggle('dark-mode', isDarkMode);
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) {
        themeIcon.className = isDarkMode ? 'bi bi-sun' : 'bi bi-moon-stars';
    }
}

function showToast(message) {
    const toastEl = document.getElementById('appToast');
    const toastMessage = document.getElementById('toastMessage');
    if (!toastEl || !toastMessage || !window.bootstrap) return;

    toastMessage.textContent = message;
    bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 2200 }).show();
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isOverdue(dueDate) {
    if (!dueDate) return false;
    const today = new Date();
    const due = new Date(dueDate);
    return due < today && due.toDateString() !== today.toDateString();
}

function capitalize(text) {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    })[character]);
}
