# Docker & Containers for AI Development

> **Last Updated: June 2026** -- Covers Docker Engine 27.x, Docker Desktop 4.x, VS Code Dev Containers, and containerised AI workflows.

## Overview

This workshop teaches you how to use Docker and containers to create reproducible, portable AI development environments. Whether you're a researcher who needs to share an exact computing setup with collaborators, a business analyst running local AI tools, or a creative professional experimenting with generative models, containers solve the single most common problem in AI work: *"it works on my machine."*

By the end of this workshop, you'll be able to package any AI tool or workflow into a container that runs identically on any computer -- yours, a colleague's, or a powerful GPU server in the cloud.

## Key Learning Outcomes

By completing this workshop, you will:

- **Understand why containers matter** -- the problems they solve and why every serious AI practitioner uses them
- **Master core Docker concepts** -- images, containers, volumes, networks, and Docker Compose
- **Build and run containers** -- from simple commands to custom images and multi-service stacks
- **Use VS Code Dev Containers** -- one-click reproducible development environments for AI work
- **Work with remote Docker hosts** -- edit locally while running AI models on powerful remote machines
- **Containerise AI agents and pipelines** -- package Claude Code, RAG pipelines, and multi-service AI stacks
- **Apply security best practices** -- non-root users, secrets management, network isolation

## Prerequisites

Before starting this workshop, you should have:

- **A computer** running Windows 10/11, macOS (Apple Silicon or Intel), or Linux
- **VS Code** installed (see Workshop 01 if you need help with this)
- **Basic terminal comfort** -- you don't need to be an expert, but you should be able to open a terminal and type commands
- **8 GB of RAM** minimum (16 GB recommended for running AI models in containers)
- **20 GB of free disk space** for Docker and container images

No prior Docker experience is needed. We start from the very beginning.

## Time Estimate

**6 hours total**, broken into self-paced sections:

| Section | Time | Description |
|---------|------|-------------|
| [Introduction](00_introduction.md) | 30 min | Why containers matter for AI |
| [Core Concepts](01_concepts.md) | 45 min | Images, containers, volumes, networks |
| [Hands-On](02_hands_on.md) | 90 min | Your first containers and builds |
| [Dev Containers](03_dev_containers.md) | 60 min | VS Code reproducible environments |
| [Remote Docker](04_remote_docker.md) | 45 min | Developing on powerful machines |
| [AI Containers](05_ai_containers.md) | 60 min | Containerising AI agents and workflows |
| [Exercises](06_exercises.md) | 90 min | Four practical exercises |
| [Resources](07_resources.md) | -- | Further reading and next steps |

You don't need to complete the workshop in one sitting. Each section is self-contained, so you can take breaks between them.

## Target Audience

This workshop is designed for:

- **AI practitioners** who want reproducible environments for their experiments
- **Researchers** who need to share exact computing setups with collaborators
- **Developers** building AI-powered applications with multiple services
- **Anyone** who has completed the earlier DreamLab workshops and wants to level up their infrastructure skills

## What You'll Build

Throughout this workshop, you'll work with real tools and build practical things:

- A **local AI chat stack** with Ollama and Open WebUI, running entirely in containers
- A **custom container image** for a Python AI script
- A **VS Code Dev Container** with Python, Node.js, Claude Code, and Jupyter pre-configured
- A **remote development setup** for running models on powerful hardware from your laptop
- A **containerised RAG pipeline** with embedding service, vector database, and query service
- A **multi-container AI pipeline** in the exercises

## Workshop Structure

```
00: Introduction ............... Why containers matter for AI
 |
01: Core Concepts .............. Images, containers, volumes, networks
 |
02: Hands-On ................... Your first containers and builds
 |
03: Dev Containers ............. VS Code reproducible environments
 |
04: Remote Docker .............. Developing on powerful machines
 |
05: AI Containers .............. Containerising agents and workflows
 |
06: Exercises .................. Four practical exercises
 |
07: Resources .................. Links, cheat sheets, next steps
```

## Navigation

**Start Here:** [Introduction: Why Containers Matter for AI](00_introduction.md)

**Complete Chapter List:**

1. [Introduction: Why Containers Matter for AI](00_introduction.md)
2. [Core Concepts: Images, Containers, Volumes, Networks](01_concepts.md)
3. [Hands-On: Your First Containers](02_hands_on.md)
4. [VS Code Dev Containers: Reproducible Environments](03_dev_containers.md)
5. [Remote Docker: Developing on Powerful Machines](04_remote_docker.md)
6. [Containerising AI Agents and Workflows](05_ai_containers.md)
7. [Practical Exercises](06_exercises.md)
8. [Resources & Next Steps](07_resources.md)

## Technology Covered

| Tool | What you'll learn |
|------|------------------|
| **Docker Engine & CLI** | Running, building, and managing containers |
| **Docker Compose** | Orchestrating multi-container stacks |
| **Docker Desktop** | Graphical management (+ alternatives: Podman, OrbStack) |
| **VS Code Dev Containers** | One-click reproducible development environments |
| **NVIDIA Container Toolkit** | GPU passthrough for AI model inference |
| **Ollama** | Running LLMs in containers |
| **Open WebUI** | Chat interface for local models |
| **ChromaDB** | Vector database for RAG systems |
| **Claude Code** | Running AI coding agents in containers |

## How This Workshop Fits In

This is part of the DreamLab AI Self-Guided Workshop series. It builds on the terminal and VS Code skills from earlier workshops, and the containerisation techniques you learn here are used heavily in advanced workshops on AI agents, orchestration, and deployment.

| Workshop | Relationship |
|----------|-------------|
| **Workshop 01: VS Code Setup** | Prerequisite -- terminal and editor skills |
| **Workshop 03: Local AI** | Uses containers for Ollama and model runners |
| **Workshop 04: AI Agents** | Multi-agent systems often run in containers |
| **Workshop 08: Claude Code** | Can be run inside containers for isolation |

---

**Ready to start?** [Introduction: Why Containers Matter for AI](00_introduction.md)

---

*Workshop created June 2026 for DreamLab AI. Docker Engine 27.x, Docker Desktop 4.x, Dev Containers specification 0.7+.*
