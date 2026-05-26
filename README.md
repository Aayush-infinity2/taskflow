# TaskFlow Pro

A clean Docker Compose task manager with a static frontend, Express API, and Redis storage.

## Structure

```text
taskflow-devops/
├── .github/workflows/ci.yml
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── Dockerfile
│   ├── index.html
│   ├── script.js
│   └── style.css
├── .dockerignore
├── .gitignore
├── docker-compose.yml
├── Jenkinsfile
└── README.md
```

## Run

```bash
docker compose up --build
```

Open:

- Frontend: http://localhost:3000
- Backend health: http://localhost:5000/health
- Tasks API: http://localhost:5000/tasks

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/tasks` | List tasks |
| POST | `/tasks` | Create task |
| PUT | `/tasks/:id` | Update task |
| DELETE | `/tasks/:id` | Delete task |
| DELETE | `/tasks` | Clear all tasks |
| GET | `/stats` | Task statistics |
| POST | `/reset` | Reset Redis task data |

## Stack

- Frontend: HTML, CSS, JavaScript, Bootstrap Icons
- Backend: Node.js, Express
- Storage: Redis
- DevOps: Docker, Docker Compose, GitHub Actions, Jenkins
