# Hands-On: Your First Containers

## Overview

Time to get your hands dirty. In this section, you'll install Docker, run your first containers, build a custom image, and set up a multi-service AI stack with Docker Compose. Every command is explained -- just follow along.

---

## Step 1: Install Docker Desktop (15 minutes)

### Difficulty: Beginner

### Windows

1. Download Docker Desktop from [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/)
2. Run the installer
3. When prompted, ensure **"Use WSL 2 instead of Hyper-V"** is selected (recommended)
4. Restart your computer when asked
5. Open Docker Desktop -- you'll see a dashboard with a green "running" indicator

### macOS

1. Download Docker Desktop from [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/)
2. Open the `.dmg` file and drag Docker to Applications
3. Launch Docker from Applications
4. Grant the permissions it requests (network, system extension)
5. Wait for the Docker icon in the menu bar to show "running"

### Linux

```bash
# Ubuntu / Debian
sudo apt update
sudo apt install -y docker.io docker-compose-v2

# Add your user to the docker group (avoids needing sudo)
sudo usermod -aG docker $USER

# Log out and back in for the group change to take effect
# Then verify:
docker --version
```

> **Alternative on Linux:** You can also install Docker Desktop for Linux, which gives you the same graphical dashboard as Windows/macOS. See the Docker docs for instructions.

### Verify the Installation

Open a terminal (or PowerShell on Windows) and run:

```bash
docker --version
```

Expected output (version numbers may differ):

```
Docker version 27.3.1, build ce12230
```

```bash
docker compose version
```

Expected output:

```
Docker Compose version v2.30.3
```

If both commands produce output, you're ready to go.

---

## Step 2: Hello World (5 minutes)

### Difficulty: Beginner

Every Docker journey starts here:

```bash
docker run hello-world
```

What happens:

1. Docker looks for the `hello-world` image locally -- it won't find it
2. Docker downloads (pulls) the image from Docker Hub
3. Docker creates a container from that image
4. The container runs, prints a welcome message, and exits

You should see output that includes:

```
Hello from Docker!
This message shows that your installation appears to be working correctly.
```

Congratulations -- you've just run your first container.

---

## Step 3: Explore a Container Interactively (15 minutes)

### Difficulty: Beginner

Let's run an Ubuntu container and poke around inside it:

```bash
docker run -it ubuntu bash
```

The flags:
- `-i` -- interactive (keep STDIN open)
- `-t` -- allocate a terminal
- `bash` -- the command to run inside the container

You'll see a prompt like `root@a1b2c3d4e5f6:/#`. You're now inside an Ubuntu container. Try some commands:

```bash
# Where are we?
pwd

# What OS is this?
cat /etc/os-release

# What's installed?
ls /usr/bin/ | head -20

# Can we install something?
apt update && apt install -y curl
curl --version

# What's our hostname?
hostname
```

Notice that:

- You're `root` inside the container (full control)
- The container has its own filesystem, separate from your host
- You can install packages without affecting your real machine
- The hostname is a random container ID

When you're done exploring:

```bash
exit
```

The container stops when you exit. Any packages you installed are gone -- the container was ephemeral.

### Verify It's Gone

```bash
# List running containers
docker ps

# List ALL containers (including stopped ones)
docker ps -a
```

You'll see your stopped Ubuntu container in the second list. Clean it up:

```bash
# Remove all stopped containers
docker container prune -f
```

---

## Step 4: Run Ollama in a Container (20 minutes)

### Difficulty: Beginner

This is where containers start to shine for AI work. Instead of installing Ollama directly on your machine, let's run it in a container:

```bash
docker run -d \
  --name ollama \
  -v ollama-data:/root/.ollama \
  -p 11434:11434 \
  ollama/ollama
```

Let's break down every flag:

| Flag | Meaning |
|------|---------|
| `-d` | Run in the background (detached) |
| `--name ollama` | Give the container a friendly name |
| `-v ollama-data:/root/.ollama` | Store model files in a named volume (persists across restarts) |
| `-p 11434:11434` | Map port 11434 on your machine to port 11434 in the container |
| `ollama/ollama` | The image to use |

### Pull and Run a Model

```bash
# Execute a command inside the running container
docker exec -it ollama ollama pull llama3.2:3b

# Chat with the model
docker exec -it ollama ollama run llama3.2:3b "What is Docker in one sentence?"
```

### Test the API

Ollama exposes a REST API. Since we published port 11434, you can call it from your host:

```bash
curl http://localhost:11434/api/tags
```

This should return a JSON list of installed models.

### Stop and Restart

```bash
# Stop Ollama
docker stop ollama

# Your models are safe in the volume -- verify:
docker volume ls

# Start it again
docker start ollama

# Models are still there
docker exec -it ollama ollama list
```

This is the power of volumes. The container can be destroyed and recreated, but your downloaded models persist.

### Clean Up

```bash
docker stop ollama
docker rm ollama
# The volume (and your models) still exists:
docker volume ls
```

---

## Step 5: Build a Custom Image (25 minutes)

### Difficulty: Intermediate

Let's build a container image for a simple Python AI script. Create a project directory:

```bash
mkdir ~/docker-workshop && cd ~/docker-workshop
```

### Create the Python Script

Create a file called `summarise.py`:

```python
"""Simple text summarisation using a basic extractive approach."""

import sys


def summarise(text: str, num_sentences: int = 3) -> str:
    """Extract the most important sentences from text."""
    sentences = [s.strip() for s in text.split('.') if s.strip()]

    if len(sentences) <= num_sentences:
        return text

    # Score sentences by word count and position
    scored = []
    for i, sentence in enumerate(sentences):
        word_count = len(sentence.split())
        position_score = 1.0 / (i + 1)  # Earlier sentences score higher
        scored.append((sentence, word_count * 0.3 + position_score * 0.7))

    scored.sort(key=lambda x: x[1], reverse=True)
    top = scored[:num_sentences]

    # Return in original order
    top_sentences = [s[0] for s in top]
    result = '. '.join(
        s for s in sentences if s in top_sentences
    )
    return result + '.'


if __name__ == '__main__':
    if len(sys.argv) > 1:
        input_text = ' '.join(sys.argv[1:])
    else:
        print("Usage: python summarise.py <text to summarise>")
        print("       or pipe text via stdin")
        sys.exit(1)

    print("Summary:")
    print(summarise(input_text))
```

### Create the Dockerfile

Create a file called `Dockerfile`:

```dockerfile
# Use a small Python base image
FROM python:3.11-slim

# Set metadata
LABEL maintainer="DreamLab AI Workshop"
LABEL description="Simple text summarisation tool"

# Create a non-root user (security best practice)
RUN useradd --create-home appuser

# Set working directory
WORKDIR /app

# Copy application code
COPY summarise.py .

# Switch to non-root user
USER appuser

# Default command
ENTRYPOINT ["python", "summarise.py"]
```

### Create a .dockerignore

```
.git
__pycache__
*.pyc
.env
```

### Build the Image

```bash
docker build -t summarise:1.0 .
```

You'll see Docker execute each instruction in the Dockerfile. The `-t` flag tags the image with a name and version.

```
[+] Building 12.3s (9/9) FINISHED
 => [1/4] FROM python:3.11-slim
 => [2/4] RUN useradd --create-home appuser
 => [3/4] WORKDIR /app
 => [4/4] COPY summarise.py .
 => exporting to image
```

### Run Your Custom Image

```bash
docker run summarise:1.0 "Docker is a platform for developing, shipping, and running applications in containers. It allows developers to package an application with all of its dependencies into a standardised unit. This ensures consistency across different environments. Containers are lightweight and start quickly. They share the host OS kernel, making them more efficient than virtual machines. Docker has become the industry standard for containerisation."
```

You should see a summary of the input text.

### Inspect Your Image

```bash
# List your images
docker images

# See image details
docker inspect summarise:1.0

# See the layers
docker history summarise:1.0
```

---

## Step 6: Docker Compose -- Multi-Service Stack (30 minutes)

### Difficulty: Intermediate

Now let's set up something genuinely useful: Ollama running alongside Open WebUI, giving you a local ChatGPT-like interface for your AI models. Create a new directory:

```bash
mkdir ~/ai-stack && cd ~/ai-stack
```

Create `compose.yaml`:

```yaml
services:
  ollama:
    image: ollama/ollama:latest
    container_name: ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama-data:/root/.ollama
    restart: unless-stopped

  open-webui:
    image: ghcr.io/open-webui/open-webui:main
    container_name: open-webui
    ports:
      - "3000:8080"
    environment:
      OLLAMA_BASE_URL: http://ollama:11434
    volumes:
      - webui-data:/app/backend/data
    depends_on:
      - ollama
    restart: unless-stopped

volumes:
  ollama-data:
  webui-data:
```

### Start the Stack

```bash
docker compose up -d
```

Docker Compose will:

1. Pull both images (if not already downloaded)
2. Create a shared network for the services
3. Start Ollama first (because Open WebUI `depends_on` it)
4. Start Open WebUI

### Check Status

```bash
# See running services
docker compose ps

# View logs (follow mode)
docker compose logs -f

# Press Ctrl+C to stop following logs
```

### Pull a Model

```bash
docker exec -it ollama ollama pull llama3.2:3b
```

### Use the Interface

Open your browser and go to [http://localhost:3000](http://localhost:3000). You'll see Open WebUI's chat interface. Create an account (it's local only), select the model you pulled, and start chatting.

You now have a completely local, private ChatGPT alternative running in containers.

### Manage the Stack

```bash
# Stop everything (containers remain, data persists)
docker compose stop

# Start again
docker compose start

# Stop and remove containers (volumes persist)
docker compose down

# Stop, remove containers AND delete all data
docker compose down -v
```

> **Important:** `docker compose down -v` deletes your volumes. This means your downloaded models and chat history will be lost. Only use this if you want a completely clean slate.

---

## Common Commands Reference

Here's a cheat sheet of the commands you've learnt:

| Command | What it does |
|---------|-------------|
| `docker run <image>` | Create and start a container |
| `docker run -it <image> bash` | Interactive shell in a container |
| `docker run -d <image>` | Run in the background |
| `docker ps` | List running containers |
| `docker ps -a` | List all containers |
| `docker stop <name>` | Stop a container |
| `docker rm <name>` | Remove a stopped container |
| `docker exec -it <name> <cmd>` | Run a command in a running container |
| `docker build -t <tag> .` | Build an image from a Dockerfile |
| `docker images` | List images |
| `docker volume ls` | List volumes |
| `docker compose up -d` | Start a Compose stack |
| `docker compose down` | Stop and remove a Compose stack |
| `docker compose logs -f` | Follow logs from all services |

---

**Next:** [VS Code Dev Containers: Reproducible Environments](03_dev_containers.md)
