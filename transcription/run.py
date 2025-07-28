import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8080,
        reload=True,

        ws_ping_interval=20,
        ws_ping_timeout=20,
        proxy_headers=True,
        timeout_keep_alive=65
    )
