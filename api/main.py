"""
Public API Gateway Service for WindCast UK.
Receives incoming public requests and proxies to the internal backend service
using the BACKEND_URL service binding injected by Vercel.
"""

import os
import httpx
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="WindCast UK API Gateway", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Vercel injects the internal backend service URL into BACKEND_URL via bindings
BACKEND_URL = os.environ.get("BACKEND_URL", "http://127.0.0.1:8000").rstrip("/")

@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"])
async def proxy_api(request: Request, path: str):
    target_url = f"{BACKEND_URL}/api/{path}"
    if request.url.query:
        target_url += f"?{request.url.query}"
        
    async with httpx.AsyncClient(timeout=30.0) as client:
        body = await request.body()
        headers = {k: v for k, v in request.headers.items() if k.lower() not in ["host", "content-length"]}
        
        resp = await client.request(
            method=request.method,
            url=target_url,
            headers=headers,
            content=body
        )
        
        # Filter hop-by-hop headers
        resp_headers = {
            k: v for k, v in resp.headers.items() 
            if k.lower() not in ["content-encoding", "transfer-encoding", "content-length"]
        }
        
        return Response(
            content=resp.content,
            status_code=resp.status_code,
            headers=resp_headers,
            media_type=resp.headers.get("content-type")
        )

@app.get("/health")
async def gateway_health():
    return {
        "gateway": "healthy",
        "backendUrl": BACKEND_URL
    }
