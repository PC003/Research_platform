---
trigger: always_on
---


For this project, it's actually a good idea to give Antigravity strict rules. Otherwise, AI coding tools tend to over-engineer the project by adding authentication, dashboards, unnecessary UI libraries, and features you don't need yet.

Below is a prompt you can append after the project description.

---

# Project Guidelines (Must Follow)

## Project Goal

This project is an **AI-powered Undergraduate Research Discovery Platform**.

The first prototype focuses **only on semantic search** over research papers.

The objective is to validate the search experience before adding any advanced AI features.

---

# MUST DO

### Architecture

* Use clean folder structure.
* Follow modular architecture.
* Separate frontend and backend.
* Use reusable React components.
* Use FastAPI routers and services.
* Keep business logic separate from API routes.
* Write readable, production-quality code.
* Add comments only where necessary.

---

### Frontend

Use

* React
* Vite
* Tailwind CSS
* Axios
* React Router

Pages

* Home
* Paper Details

Components

* Navbar
* Search Bar
* Paper Card
* Filter Sidebar
* Loading Skeleton
* Empty State

The UI should be minimal, modern, responsive, and research-oriented.

---

### Backend

Use

* FastAPI
* Pydantic
* Sentence Transformers
* FAISS

Structure

```
app/
    api/
    services/
    models/
    core/
    utils/
```

---

### Data

Initially use

```
papers.json
```

Each paper should contain

```
id
title
authors
abstract
keywords
department
year
journal
pdf_url
```

---

### Search

Implement semantic search using

```
sentence-transformers/all-MiniLM-L6-v2
```

Store embeddings in

```
FAISS
```

Search should return

* similarity score
* title
* abstract
* department
* year

---

### API

Prepare endpoints like

```
GET /papers

GET /papers/{id}

POST /search
```

---

### Code Quality

Always

* use type hints
* use environment variables
* use configuration file
* avoid duplicate code
* use constants
* organize imports
* handle errors properly

---

### Git

Maintain clean commits.

Keep README updated.

---

# DO NOT DO

Do NOT implement

❌ Login

❌ Authentication

❌ User Profiles

❌ Admin Dashboard

❌ Chatbot

❌ Recommendation Engine

❌ Notifications

❌ Analytics

❌ Elasticsearch

❌ PostgreSQL

❌ Docker

❌ Kubernetes

❌ Redis

❌ Microservices

❌ CI/CD

❌ OAuth

❌ Email Verification

❌ Payment Gateway

❌ Role Management

❌ Cloud Deployment

These features belong to future versions.

---

# UI Rules

The design should look like

* Google Scholar
* Semantic Scholar
* arXiv
* ResearchGate

Characteristics

* clean
* white background
* subtle shadows
* blue accent color
* easy-to-read typography
* responsive
* accessibility-friendly

Avoid fancy animations.

Avoid glassmorphism.

Avoid unnecessary gradients.

Prioritize usability over aesthetics.

---

# Future Scalability

Design the codebase so that future versions can easily support

* RAG Chat Assistant
* Personalized Recommendations
* Research Collaboration
* Citation Graph
* Paper Summarization
* AI Research Assistant
* PostgreSQL
* Elasticsearch
* Docker Deployment
* Cloud Hosting

Do **not** implement these now; only keep the architecture extensible.

---

# Coding Style

* Follow SOLID principles where appropriate.
* Keep components small and reusable.
* Keep functions under ~50 lines when practical.
* Use descriptive variable names.
* Avoid hard-coded values.
* Prefer composition over duplication.
* Ensure the project can scale from a few hundred papers to tens of thousands without major architectural changes.

---

### One more recommendation

Since this project is intended to become a research platform, structure your development into clear milestones rather than trying to build everything at once:

| Phase       | Goal                                                                    | Status     |
| ----------- | ----------------------------------------------------------------------- | ---------- |
| **Phase 1** | Data scraping + semantic search over a small dataset                    | 🚧 Current |
| **Phase 2** | Advanced filters (author, department, year, keywords)                   | Planned    |
| **Phase 3** | Paper details page + PDF viewer + bookmarking                           | Planned    |
| **Phase 4** | AI-powered paper summarization and RAG-based Q&A                        | Planned    |
| **Phase 5** | Personalized recommendations and collaboration features                 | Planned    |
| **Phase 6** | Production deployment with PostgreSQL, Docker, and cloud infrastructure | Planned    |

This phased approach keeps the prototype focused while ensuring the architecture remains suitable for the full AI-powered research platform you described previously. 
