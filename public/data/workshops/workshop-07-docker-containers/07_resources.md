# Resources & Next Steps

## Official Documentation

These are the definitive references. Bookmark them -- you'll return to them often.

### Docker

| Resource | URL | What it covers |
|----------|-----|----------------|
| Docker Documentation | [docs.docker.com](https://docs.docker.com/) | Complete reference for Docker Engine, CLI, Compose |
| Dockerfile Reference | [docs.docker.com/reference/dockerfile/](https://docs.docker.com/reference/dockerfile/) | Every Dockerfile instruction explained |
| Docker Compose Reference | [docs.docker.com/compose/](https://docs.docker.com/compose/) | Compose file format, CLI commands, networking |
| Docker Hub | [hub.docker.com](https://hub.docker.com/) | Browse and search for official and community images |
| Docker Desktop | [docs.docker.com/desktop/](https://docs.docker.com/desktop/) | Installation, settings, troubleshooting |

### Dev Containers

| Resource | URL | What it covers |
|----------|-----|----------------|
| Dev Containers Specification | [containers.dev](https://containers.dev/) | The open specification for development containers |
| Dev Container Features | [containers.dev/features](https://containers.dev/features) | Browse installable features |
| Dev Container Templates | [containers.dev/templates](https://containers.dev/templates) | Ready-made configurations for common stacks |
| VS Code Dev Containers Docs | [code.visualstudio.com/docs/devcontainers/containers](https://code.visualstudio.com/docs/devcontainers/containers) | VS Code-specific setup and usage |
| devcontainer.json Reference | [containers.dev/implementors/json_reference/](https://containers.dev/implementors/json_reference/) | Every configuration option explained |

### NVIDIA Container Toolkit

| Resource | URL | What it covers |
|----------|-----|----------------|
| Installation Guide | [docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html) | Setting up GPU access for containers |
| Docker Integration | [docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/docker-specialized.html](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/docker-specialized.html) | Docker-specific GPU configuration |

---

## Useful AI Docker Images

These are well-maintained, production-quality images you can use immediately.

### Language Models

| Image | Purpose | Example |
|-------|---------|---------|
| `ollama/ollama` | Run LLMs locally (Llama, Mistral, Gemma, etc.) | `docker run -d -p 11434:11434 ollama/ollama` |
| `vllm/vllm-openai` | High-throughput LLM serving with OpenAI-compatible API | `docker run --gpus all vllm/vllm-openai --model meta-llama/Llama-3.2-3B-Instruct` |
| `ghcr.io/huggingface/text-generation-inference` | Hugging Face model serving | GPU required, see HF docs for setup |

### Chat Interfaces

| Image | Purpose | Example |
|-------|---------|---------|
| `ghcr.io/open-webui/open-webui` | Feature-rich chat UI for Ollama and OpenAI-compatible APIs | `docker run -d -p 3000:8080 ghcr.io/open-webui/open-webui:main` |

### Vector Databases

| Image | Purpose | Example |
|-------|---------|---------|
| `chromadb/chroma` | Lightweight embedding database | `docker run -d -p 8000:8000 chromadb/chroma` |
| `qdrant/qdrant` | Production-grade vector search | `docker run -d -p 6333:6333 qdrant/qdrant` |
| `semitechnologies/weaviate` | AI-native vector database | See Weaviate docs for Compose setup |

### Development Environments

| Image | Purpose | Example |
|-------|---------|---------|
| `jupyter/scipy-notebook` | Jupyter with scientific Python stack | `docker run -p 8888:8888 jupyter/scipy-notebook` |
| `jupyter/tensorflow-notebook` | Jupyter with TensorFlow | `docker run -p 8888:8888 jupyter/tensorflow-notebook` |
| `mcr.microsoft.com/devcontainers/python` | Microsoft Dev Container base (Python) | Used in `.devcontainer/devcontainer.json` |
| `mcr.microsoft.com/devcontainers/universal` | Dev Container with multiple languages | Larger image but very comprehensive |

### Utilities

| Image | Purpose | Example |
|-------|---------|---------|
| `redis:7` | In-memory cache and message broker | `docker run -d -p 6379:6379 redis:7` |
| `postgres:16` | Relational database with pgvector extension | `docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=pass postgres:16` |
| `nginx:alpine` | Reverse proxy and static file server | `docker run -d -p 80:80 nginx:alpine` |

---

## Recommended Reading

### Books

- **Docker Deep Dive** by Nigel Poulton -- the most accessible and thorough introduction to Docker. Updated regularly. Start here if you want one book.
- **Docker in Action** (Manning) -- more hands-on, with practical examples throughout.
- **Building Containerized Applications** (O'Reilly) -- covers modern patterns for multi-container architectures.

### Articles and Guides

- [Docker Best Practices for Python Developers](https://testdriven.io/blog/docker-best-practices/) -- practical tips for keeping images small and builds fast
- [A Beginner's Guide to Understanding Docker](https://docker-curriculum.com/) -- free online tutorial with exercises
- [Awesome Docker](https://github.com/veggiemonk/awesome-docker) -- curated list of Docker resources, tools, and projects
- [Awesome Compose](https://github.com/docker/awesome-compose) -- official collection of Docker Compose examples, including AI/ML stacks

### Videos

- **Docker in 100 Seconds** (Fireship) -- brilliant quick overview if you want a recap
- **Docker Tutorial for Beginners** (TechWorld with Nana) -- comprehensive free course on YouTube
- **VS Code Dev Containers Tutorial** (VS Code official channel) -- step-by-step walkthrough

---

## Cheat Sheet

### Essential Commands

```bash
# Images
docker pull <image>              # Download an image
docker build -t <tag> .          # Build from Dockerfile
docker images                    # List local images
docker rmi <image>               # Remove an image

# Containers
docker run <image>               # Create and start
docker run -d <image>            # Run in background
docker run -it <image> bash      # Interactive shell
docker ps                        # List running
docker ps -a                     # List all
docker stop <name>               # Stop
docker rm <name>                 # Remove
docker logs <name>               # View logs
docker exec -it <name> <cmd>     # Run command in running container

# Volumes
docker volume create <name>      # Create
docker volume ls                 # List
docker volume rm <name>          # Remove
docker volume prune              # Remove unused

# Networks
docker network create <name>     # Create
docker network ls                # List
docker network rm <name>         # Remove

# Compose
docker compose up -d             # Start all services
docker compose down              # Stop and remove
docker compose ps                # List services
docker compose logs -f           # Follow logs
docker compose build             # Rebuild images

# Cleanup
docker system prune              # Remove unused data
docker system prune -a           # Remove everything unused (reclaim disk)
```

### Dockerfile Template

```dockerfile
FROM python:3.11-slim

# System dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends <packages> && \
    rm -rf /var/lib/apt/lists/*

# Non-root user
RUN useradd --create-home appuser

WORKDIR /app

# Python dependencies (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application code
COPY . .

USER appuser

EXPOSE 8000

CMD ["python", "app.py"]
```

### Compose Template

```yaml
services:
  app:
    build: .
    ports:
      - "8000:8000"
    volumes:
      - app-data:/app/data
    environment:
      - ENV_VAR=value
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:16
    volumes:
      - db-data:/var/lib/postgresql/data
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}

volumes:
  app-data:
  db-data:
```

### devcontainer.json Template

```json
{
  "name": "My Project",
  "image": "mcr.microsoft.com/devcontainers/python:3.11",
  "features": {
    "ghcr.io/devcontainers/features/node:1": {"version": "20"}
  },
  "customizations": {
    "vscode": {
      "extensions": ["ms-python.python"],
      "settings": {"editor.formatOnSave": true}
    }
  },
  "postCreateCommand": "pip install -r requirements.txt",
  "forwardPorts": [8000],
  "remoteUser": "vscode"
}
```

---

## Next Steps in the DreamLab Workshop Series

Now that you understand containerisation, you're well prepared for:

- **Workshop 08: Claude Code** -- uses containerised development environments
- **Workshop 04: AI Agents & Orchestration** -- multi-agent systems often run in containers
- **Workshop 03: Local AI Models** -- Ollama and other local model runners are best managed via Docker

---

## Getting Help

- **Docker Community Forums:** [forums.docker.com](https://forums.docker.com/)
- **Docker Discord:** [discord.com/invite/docker](https://discord.com/invite/docker) (unofficial but active)
- **Stack Overflow:** Tag your questions with `docker`, `docker-compose`, or `devcontainer`
- **GitHub Issues:** For bugs in specific images, file issues on the image's GitHub repository

---

## Final Thoughts

Containers are one of those technologies that, once you learn them, you can't imagine working without. They bring order to the chaos of AI development -- where every project needs its own specific combination of runtimes, libraries, drivers, and configurations.

You don't need to memorise every command or option. The cheat sheet above and the official documentation are always there when you need them. What matters is understanding the core concepts: images are blueprints, containers are running instances, volumes persist data, and Compose orchestrates services.

Start simple. Containerise one project. Use a Dev Container for your next piece of work. Run Ollama in Docker instead of installing it directly. Each time, the workflow becomes more natural.

Happy containerising.

---

*Workshop created June 2026 for DreamLab AI. Docker Engine 27.x, Docker Desktop 4.x, Dev Containers specification 0.7+.*
