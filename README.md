# VyOS Configuration Manager

A modern web interface for managing VyOS router configurations.

**Currently being developed for VyOS 1.4-sagitta (full) and 1.5-circinus (partial)**

![image](https://github.com/user-attachments/assets/c4063b1c-d3a9-4ced-8e75-c272f297c0ff)

## Features

- **Dashboard Overview**: View system info, interfaces, and services at a glance
- **Configuration Management**: Browse and edit VyOS configurations through a user-friendly interface
- **Interface Management**: See details of all network interfaces and edit their properties
- **Firewall Management**: Configure firewall rules, policies, and address groups
- **Routing**: Manage static routes, dynamic routing protocols, and view routing tables
- **NAT**: Configure source and destination NAT rules
- **VPN**: Manage VPN configurations and monitor connections
- **Services**: Configure DHCP, DNS, NTP, and SSH services
- **Modern UI**: Built with Next.js, React, TypeScript, and Tailwind CSS for a responsive experience
- **Dark Mode**: Optimized dark interface for reduced eye strain

## Architecture

This project consists of two main components:

1. **Backend API**: Python-based FastAPI application that interfaces with VyOS CLI to manage configurations
2. **Frontend**: Next.js application built with React, TypeScript, and Shadcn UI components

## Prerequisites

- Node.js 18+ for the frontend
- Python 3.11+ for the backend
- VyOS router with API access enabled
- Docker and Docker Compose (optional, for containerized deployment)

## Installation

### Using Docker (Recommended)

The easiest way to run the application is using Docker Compose:

```bash
# Create a .env file with your VyOS router configuration
# See .env.example for required variables

# Build and start the container
docker-compose up -d

# View logs
docker-compose logs -f
```

For more detailed Docker instructions, see [README-docker.md](README-docker.md).

### Manual Installation

#### Backend

```bash
# Install Python dependencies
pip install -r requirements.txt

# Configure your VyOS connection in .env file
# See .env.example for required variables

# Run the backend server
uvicorn main:app --host 0.0.0.0 --port 8000
```

#### Frontend

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev

# Build for production
npm run build
npm start
```

## Configuration

Create a `.env` file in the root directory with the following configuration:

```
VYOS_HOST=your-vyos-router-ip
VYOS_API_KEY=your-api-key
VYOS_HTTPS=true
TRUST_SELF_SIGNED=true  # For self-signed certificates
ENVIRONMENT=production  # or development
```

## Accessing the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
