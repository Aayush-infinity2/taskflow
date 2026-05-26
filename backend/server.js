const express = require('express')
const cors = require('cors')
const redis = require('redis')

const app = express()

app.use(cors())
app.use(express.json())

const client = redis.createClient({
    url: 'redis://redis:6379'
})

client.connect()

// Initialize - Clear old list format and use string format instead
async function initializeRedis() {
    try {
        // Check if old list format exists
        const typeCheck = await client.type('tasks')
        if (typeCheck === 'list') {
            // Old format found - delete it and initialize fresh
            await client.del('tasks')
            console.log('Cleared old list format tasks')
        }
        
        // Ensure JSON format exists
        const existingTasks = await client.get('tasks')
        if (!existingTasks) {
            await client.set('tasks', JSON.stringify([]))
            console.log('Initialized tasks with JSON format')
        }
    } catch (error) {
        console.error('Redis initialization error:', error)
    }
}

// Initialize on startup
initializeRedis()

// GET all tasks
app.get('/tasks', async (req, res) => {
    try {
        // Ensure correct format
        const typeCheck = await client.type('tasks')
        if (typeCheck === 'list') {
            // Old format - convert it
            await client.del('tasks')
            await client.set('tasks', JSON.stringify([]))
        }
        
        const tasksJson = await client.get('tasks')
        const tasks = tasksJson ? JSON.parse(tasksJson) : []
        res.json(tasks)
    } catch (error) {
        console.error('Error fetching tasks:', error)
        res.status(500).json({ error: 'Failed to fetch tasks' })
    }
})

// POST - Create new task
app.post('/tasks', async (req, res) => {
    try {
        const task = req.body
        
        if (!task.title) {
            return res.status(400).json({ error: 'Title is required' })
        }

        // Check and fix data type
        const typeCheck = await client.type('tasks')
        if (typeCheck === 'list') {
            await client.del('tasks')
            await client.set('tasks', JSON.stringify([]))
        }

        // Ensure task has all required fields
        const newTask = {
            id: task.id || Date.now(),
            title: task.title,
            description: task.description || '',
            priority: task.priority || 'medium',
            category: task.category || 'other',
            status: task.status || 'pending',
            dueDate: task.dueDate || null,
            createdAt: task.createdAt || new Date().toISOString(),
            completedAt: task.completedAt || null
        }

        // Get existing tasks
        const tasksJson = await client.get('tasks')
        let tasks = []
        try {
            tasks = tasksJson ? JSON.parse(tasksJson) : []
        } catch (parseError) {
            // If parsing fails, start fresh
            tasks = []
        }

        // Add new task
        tasks.push(newTask)

        // Save back to Redis
        await client.set('tasks', JSON.stringify(tasks))

        res.status(201).json(newTask)
    } catch (error) {
        console.error('Error creating task:', error)
        res.status(500).json({ error: 'Failed to create task' })
    }
})

// PUT - Update task
app.put('/tasks/:id', async (req, res) => {
    try {
        const taskId = parseInt(req.params.id)
        const updates = req.body

        // Get existing tasks
        const tasksJson = await client.get('tasks')
        const tasks = tasksJson ? JSON.parse(tasksJson) : []

        // Find and update task
        const taskIndex = tasks.findIndex(t => t.id === taskId)
        if (taskIndex === -1) {
            return res.status(404).json({ error: 'Task not found' })
        }

        // Merge updates
        tasks[taskIndex] = {
            ...tasks[taskIndex],
            ...updates,
            id: taskId // Ensure ID doesn't change
        }

        // Save back to Redis
        await client.set('tasks', JSON.stringify(tasks))

        res.json(tasks[taskIndex])
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Failed to update task' })
    }
})

// DELETE - Remove task
app.delete('/tasks/:id', async (req, res) => {
    try {
        const taskId = parseInt(req.params.id)

        // Get existing tasks
        const tasksJson = await client.get('tasks')
        const tasks = tasksJson ? JSON.parse(tasksJson) : []

        // Find task to delete
        const taskIndex = tasks.findIndex(t => t.id === taskId)
        if (taskIndex === -1) {
            return res.status(404).json({ error: 'Task not found' })
        }

        // Remove task
        const deletedTask = tasks.splice(taskIndex, 1)[0]

        // Save back to Redis
        await client.set('tasks', JSON.stringify(tasks))

        res.json({ message: 'Task deleted', deletedTask })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Failed to delete task' })
    }
})

// DELETE all tasks (Clear)
app.delete('/tasks', async (req, res) => {
    try {
        await client.set('tasks', JSON.stringify([]))
        res.json({ message: 'All tasks cleared' })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Failed to clear tasks' })
    }
})

// GET statistics
app.get('/stats', async (req, res) => {
    try {
        const tasksJson = await client.get('tasks')
        const tasks = tasksJson ? JSON.parse(tasksJson) : []

        const stats = {
            total: tasks.length,
            completed: tasks.filter(t => t.status === 'completed').length,
            pending: tasks.filter(t => t.status === 'pending').length,
            high: tasks.filter(t => t.priority === 'high').length,
            medium: tasks.filter(t => t.priority === 'medium').length,
            low: tasks.filter(t => t.priority === 'low').length,
            byCategory: {}
        }

        // Count by category
        tasks.forEach(task => {
            stats.byCategory[task.category] = (stats.byCategory[task.category] || 0) + 1
        })

        res.json(stats)
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Failed to fetch statistics' })
    }
})

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'TaskFlow Backend is running' })
})

// Reset/Clear all tasks (useful for clearing corrupted data)
app.post('/reset', async (req, res) => {
    try {
        await client.del('tasks')
        await client.set('tasks', JSON.stringify([]))
        res.json({ message: 'All tasks cleared successfully', status: 'reset' })
    } catch (error) {
        console.error('Error resetting tasks:', error)
        res.status(500).json({ error: 'Failed to reset tasks' })
    }
})

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
})

const PORT = 5000
app.listen(PORT, () => {
    console.log(`Backend Running On Port ${PORT}`)
    console.log(`API Health: http://localhost:${PORT}/health`)
    console.log(`Get Tasks: http://localhost:${PORT}/tasks`)
    console.log(`Get Stats: http://localhost:${PORT}/stats`)
})
