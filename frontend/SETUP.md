# VyManager Frontend Setup Guide

## API Configuration

The frontend needs to connect to the backend API server. By default, it will use `http://localhost:3001/api` as the base URL.

### Setting a Custom API URL

If your backend is running on a different host or port, create a `.env.local` file in the `frontend` directory with the following content:

```
# API URL for the backend server
NEXT_PUBLIC_API_URL=http://your-backend-host:port/api
```

For example, if your backend is running on port 8000:

```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

## Troubleshooting Connection Issues

If you see the "Connection Error" screen when starting the application, check the following:

1. Make sure the backend server is running:
   ```bash
   # From the project root
   python -m uvicorn main:app --host 0.0.0.0 --port 3001
   ```

2. Verify the API URL in your browser console:
   - Open the browser's developer tools (F12)
   - Look for network errors in the console
   - Check if the requests are going to the correct URL

3. If you're using a custom API URL, verify it's correctly set in `.env.local`

4. If running in development mode, restart the Next.js development server after changing the `.env.local` file:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

## Cache Configuration

The frontend implements a caching system to reduce API calls. You can customize the cache TTL (Time To Live) values by adding the following to your `.env.local` file:

```
# Cache configuration (values in seconds)
NEXT_PUBLIC_CACHE_TTL_CONFIG=30
NEXT_PUBLIC_CACHE_TTL_ROUTES=60
NEXT_PUBLIC_CACHE_TTL_DHCP=60
NEXT_PUBLIC_CACHE_TTL_SYSTEM=10
``` 