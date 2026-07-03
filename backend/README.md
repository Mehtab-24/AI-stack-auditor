# AI Stack Auditor — Backend

Agent-based AI spend rationalization service built with FastAPI. This backend identifies tool overlaps, detects inactive subscriptions, scores ROI, and provides cost-saving recommendations for your organization's AI tech stack.

## ✨ Features Implemented

- **Clean Architecture:** Modular design with strict separation of concerns (API routes, orchestrator, distinct agents, centralized Pydantic schemas, and configuration).
- **8-Stage Agent Pipeline:** A deterministic, sequentially executed pipeline handling data extraction, categorization, waste detection, prompt optimization (placeholder), ROI scoring, AI routing (placeholder), recommendation generation, and report aggregation.
- **Stateless Execution:** The pipeline requires no external database and processes each request cleanly from start to finish in memory.
- **Custom Error Handling:** A centralized exception hierarchy with precise structured JSON responses.
- **Knowledge Base Grounding:** Uses an in-memory seed of ~45 popular AI tools for intelligent job mapping without relying on external API calls.
- **Stack Simulator:** An independent service endpoint for simulating hypothetical "what-if" scenarios (e.g., "replace X with Y", "reduce spend by 20%").
- **Demo Dataset Generator:** A built-in synthetic dataset designed specifically to trigger all waste detectors for testing and demonstration purposes.

## 🚀 Quick Start

### 1. Setup the Environment

```bash
cd backend
python3 -m venv venv
source venv/bin/activate   # On Windows use `venv\Scripts\activate`
pip install -r requirements.txt
cp .env.example .env
```

### 2. Run the Server

Start the development server with live reload:
```bash
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`.
Opening `http://localhost:8000/` in your browser will automatically redirect you to the **Interactive API Docs (Swagger UI)** at `http://localhost:8000/docs`.

## 📂 Project Structure

```
backend/
├── app/
│   ├── api/          # FastAPI route definitions (endpoints)
│   ├── agents/       # Agent implementations (one subclass per file)
│   ├── services/     # Orchestrator and independent business logic (Stack Simulator)
│   ├── schemas/      # Pydantic request/response models & I/O contracts
│   ├── core/         # Logging, error handling, shared infrastructure
│   ├── config/       # Application settings mapped from environment variables
│   └── utils/        # CSV parser, knowledge base, demo dataset
├── main.py           # Application entry point & FastAPI instance factory
├── requirements.txt  # Python dependencies
└── .env.example      # Environment variable template
```

## 🧠 Architecture: The Agent Pipeline

Every agent is built by extending the `BaseAgent` class, which ensures they:
- Have a single responsibility.
- Receive a **typed input** and return a **typed output** (via Pydantic).
- Never call another agent directly.
- Are orchestrated entirely by the central `AgentOrchestrator`.

```
CSV Upload ──▶ Discovery Agent (Extract tools & hidden add-ons)
                    │
              Job Mapping Agent (Categorize using Knowledge Base)
                    │
             Waste Detection Agent (Flag overlaps, inactive seats)
                    │
               Prompt Agent (Placeholder for future optimization)
                    │
                ROI Agent (Score business value vs. cost)
                    │
              AI Router Agent (Placeholder for future model routing)
                    │
            Recommendation Agent (Propose actions & compute savings)
                    │
               Action Agent (Aggregate final Audit Report)
                    │
              ┌─────┴─────┐
          Dashboard   Reports
```

*Note: Currently, all agents use deterministic rule-based logic to meet the stateless foundation requirements. The architecture supports swapping in advanced LLM reasoning in the future without changing the API surface.*

## 🌐 API Endpoints

All routes are prefixed with `/api/v1`.

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/v1/health` | Health check to verify service status. |
| `POST` | `/api/v1/audit/run` | Run the full agent pipeline. Accepts file upload, raw CSV string, or demo mode. |
| `POST` | `/api/v1/simulate` | Run the independent Stack Simulator for hypothetical scenarios. |
| `GET` | `/api/v1/demo/dataset` | Retrieve the synthetic demo dataset used for testing. |

## 🧪 Testing the Pipeline

You can instantly test the entire pipeline using the built-in demo dataset endpoint:

```bash
curl -X POST http://localhost:8000/api/v1/audit/run \
  -H "Content-Type: application/json" \
  -d '{"use_demo": true}'
```
