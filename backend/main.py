import os
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uvicorn
from dotenv import load_dotenv

# Load local environment files if present
load_dotenv()

from orchestrator import run_agent_pipeline

app = FastAPI(title="AI Stack Auditor Backend", version="1.0")

# Enable CORS for local and web frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to the frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AuditRequest(BaseModel):
    use_demo: bool = False
    business_name: Optional[str] = "My Startup"

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "ai-stack-auditor-backend"}

@app.post("/audit/run")
async def run_audit(
    file: Optional[UploadFile] = File(None),
    use_demo: bool = Form(False),
    business_name: str = Form("My Startup"),
    business_id: Optional[str] = Form(None)
):
    try:
        # Read the file data if uploaded
        file_content = None
        if file:
            contents = await file.read()
            file_content = contents.decode("utf-8")
        
        # Trigger the sequential multi-agent execution pipeline
        result = await run_agent_pipeline(
            file_content=file_content,
            use_demo=use_demo,
            business_name=business_name,
            business_id=business_id
        )
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
