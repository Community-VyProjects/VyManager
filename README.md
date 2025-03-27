# VyOS Configuration Viewer

A web application for viewing and analyzing VyOS router configurations.
DEMO: https://vyosipam.beosai.io/
## Features

- Dashboard with system overview
- Network interfaces visualization
- Firewall rules management
- NAT configuration display
- DHCP and DNS service management
- Configuration logging with anomaly detection

## Production Deployment

### Prerequisites

- Python 3.8 or higher (3.11 Tested)
- VyOS router with HTTP API enabled (1.4 Is currently tested and working)

### Setup

1. Clone the repository:
   ```
   git clone https://github.com/MadsZBC/FastAPI-Vyos.git
   cd vyos-config-viewer
   ```

2. Create a virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Configure environment variables:
   ```
   cp .env.sample .env
   ```
   Edit the `.env` file with your VyOS router API details.

### Running in Production

#### Linux/macOS

```bash
# Set executable permission
chmod +x start.sh

# Run in production mode
ENVIRONMENT=production ./start.sh
```

#### Windows

```batch
# Run in production mode
set ENVIRONMENT=production
start.bat
```

Alternatively, you can run with Uvicorn directly:

```bash
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

## Development

For local development:

```bash
# Run with hot-reload
uvicorn main:app --reload
```

## Setup using container

There is also a container image that can you can build and run.

1. Clone the repository:
   ```
   git clone https://github.com/MadsZBC/FastAPI-Vyos.git
   cd vyos-config-viewer
   ```

2. Build the image
   ```
   podman build -t vyos-dash .
   ```

3. Execute the image
   ```
   podman run -v dot_env_file_path_here:/app/.env:ro -p 8000:8000 vyos-dash
   ```

## Acknowledgements

- [FastAPI](https://fastapi.tiangolo.com/)
- [VyOS](https://vyos.io/)
- [Bootstrap](https://getbootstrap.com/)
- [Cursor](https://www.cursor.com/) - Helped alot with some of the logic when i was stuck.
