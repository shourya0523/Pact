from app.routes import partnership_apis, dashboard_apis, upload  # ← Add dashboard import
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from config.database import connect_to_mongo, close_mongo_connection
from app.routes import auth, habits, users, streak_history, habit_logs, notifications
from app.routes import goals
import asyncio

from app.routes.auth import router as auth_router
from app.routes.partnership_apis import router as partnership_router
from app.routes.habits import router as habits_router
from app.routes.streaks import router as streaks_router
import os
from dotenv import load_dotenv

from fastapi import WebSocket, WebSocketDisconnect
from app.services.websocket import manager
from app.utils.security import decode_access_token

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    try:
        yield
    except (asyncio.CancelledError, KeyboardInterrupt):
        # Suppress cancellation errors during shutdown - this is normal
        # These are expected when uvicorn/starlette shuts down the server
        pass
    finally:
        # Shutdown - handle any cancellation errors gracefully
        try:
            # Close all WebSocket connections
            for user_id in list(manager.active_connections.keys()):
                try:
                    await manager.disconnect(user_id)
                except (asyncio.CancelledError, KeyboardInterrupt):
                    pass  # Ignore cancellation during cleanup
                except Exception:
                    pass  # Ignore other errors during cleanup
            
            # Close MongoDB connection
            try:
                await close_mongo_connection()
            except (asyncio.CancelledError, KeyboardInterrupt):
                pass  # Ignore cancellation during cleanup
        except (asyncio.CancelledError, KeyboardInterrupt):
            # Suppress cancellation errors during shutdown - this is normal
            pass
        except Exception as e:
            # Log other errors but don't fail shutdown
            print(f"⚠️  Error during shutdown: {e}")

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
app.include_router(streaks_router)
app.include_router(upload.router)

# Include routers with /api prefix
app.include_router(auth.router, prefix="/api")
app.include_router(partnership_apis.router, prefix="/api")
app.include_router(habits.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(streak_history.router, prefix="/api")
app.include_router(goals.router, prefix="/api")
app.include_router(habit_logs.router, prefix="/api")
app.include_router(dashboard_apis.router, prefix="/api")  # ← ADD THIS LINE
app.include_router(notifications.router, prefix="/api")


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

# WebSocket endpoint for the real-time notifications
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(user_id, websocket)
    try:
        while True:
            # Keep connection alive and listen for any messages from client
            data = await websocket.receive_text()
            # Client can send pings, we just acknowledge
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        await manager.disconnect(user_id)
        print(f"Client {user_id} disconnected")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )