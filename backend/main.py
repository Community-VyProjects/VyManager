"""Entrypoint to run the FastAPI app with Uvicorn.

Run:
	python main.py
"""

from __future__ import annotations

import uvicorn


def main():
	uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=False, proxy_headers=True)


if __name__ == "__main__":
	main()
