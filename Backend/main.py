from app.routes import partnership_apis, dashboard_apis
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from config.database import connect_to_mongo, close_mongo_connection
from app.routes import auth, habits, users, streak_history, habit_logs
from app.routes import goals

from app.routes.auth import router as auth_router
from app.routes.partnership_apis import router as partnership_router
from app.routes.habits import router as habits_router
import os
from dotenv import load_dotenv

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    yield
    # Shutdown
    await close_mongo_connection()

app = FastAPI(
    title="Pact API",
    description="Habit accountability partnership API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(partnership_apis.router)
app.include_router(habits.router)
app.include_router(users.router)
app.include_router(streak_history.router)
app.include_router(auth_router)
app.include_router(partnership_router)
app.include_router(habits_router)

# Include routers with /api prefix
app.include_router(auth.router, prefix="/api")
app.include_router(partnership_apis.router, prefix="/api")
app.include_router(habits.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(streak_history.router, prefix="/api")
app.include_router(goals.router, prefix="/api")
app.include_router(habit_logs.router, prefix="/api")
app.include_router(dashboard_apis.router, prefix="/api")  # ← ADD THIS LINE


@app.get("/")
async def root():
    return {
        "message": "Welcome to Pact API",
        "status": "running",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )