import logging

from fastapi import FastAPI

from .api.chat import router as chat_router

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="CommonGround API")
app.include_router(chat_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
