import os
import sys
from pathlib import Path
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Add backend directory to sys.path so app imports work from anywhere
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.config.settings import settings
from app.api.routes import router, run_audit, run_simulation
from app.core.exceptions import register_exception_handlers

# Initialize FastAPI application
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    debug=settings.debug,
)

# Register custom exception handlers
register_exception_handlers(app)

# Register CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the unified v1 router
app.include_router(router)

# Expose a legacy/direct endpoint at /audit/run for frontend compatibility
app.post("/audit/run", tags=["Legacy Compatibility"])(run_audit)

# Expose a legacy/direct endpoint at /simulate for frontend compatibility
app.post("/simulate", tags=["Legacy Compatibility"])(run_simulation)

@app.get("/")
def read_root():
    # Redirect root requests to Swagger UI
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/docs")

if __name__ == "__main__":
    uvicorn.run("main:app", host=settings.host, port=settings.port, reload=True)
