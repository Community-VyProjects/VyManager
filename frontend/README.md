# VyManager Frontend

Modern Next.js 16 frontend for VyOS router management.

## 🎨 Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Icons**: Lucide React
- **Theme**: Dark mode (enforced)

## 🚀 Quick Start

### Development

```bash
# Install dependencies
npm install

# Configure API endpoint
cp .env.local.example .env.local
# Edit .env.local: NEXT_PUBLIC_API_URL=http://localhost:8000

# Run development server
npm run dev
```

Visit http://localhost:3000

### Production

```bash
# Build for production
npm run build

# Start production server
npm start
```

## 📁 Project Structure

```
frontend/
├── src/
│   ├── app/                      # Next.js App Router pages
│   │   ├── firewall/
│   │   │   ├── groups/          # Firewall groups management
│   │   │   └── rules/           # Firewall rules management
│   │   ├── network/
│   │   │   └── interfaces/      # Interface management
│   │   ├── layout.tsx           # Root layout (dark mode)
│   │   └── page.tsx             # Dashboard
│   ├── components/
│   │   ├── layout/              # Layout components
│   │   │   ├── Sidebar.tsx      # Navigation sidebar
│   │   │   └── AppLayout.tsx    # Main layout wrapper
│   │   ├── firewall/            # Firewall modals/components
│   │   ├── network/             # Network modals/components
│   │   └── ui/                  # shadcn/ui components
│   └── lib/
│       ├── api/                 # API service layer
│       │   ├── client.ts        # Base API client
│       │   ├── firewall-groups.ts
│       │   ├── ethernet.ts
│       │   └── types/           # TypeScript types
│       └── utils.ts             # Utility functions
├── public/                       # Static assets
├── package.json
└── next.config.ts               # Next.js config with API proxy
```

## 🔌 API Integration

### API Client Pattern

All API calls use a centralized client with service-specific modules:

**Base Client** (`src/lib/api/client.ts`):
```typescript
export const apiClient = new ApiClient();
```

**Service Layer** (`src/lib/api/[service].ts`):
```typescript
import { apiClient } from "./client";

class ServiceName {
  async getConfig() {
    return apiClient.get("/endpoint/config");
  }

  async batchConfigure(request) {
    return apiClient.post("/endpoint/batch", request);
  }

  // Always refresh cache after mutations
  async refreshConfig() {
    return apiClient.post("/vyos/config/refresh");
  }
}

export const serviceName = new ServiceService();
```

### Using Services in Components

```typescript
import { firewallGroupsService } from "@/lib/api/firewall-groups";

// Get capabilities (version-specific features)
const capabilities = await firewallGroupsService.getCapabilities();

// Get data
const config = await firewallGroupsService.getConfig();

// Create/update
await firewallGroupsService.createGroup(name, type, config);

// IMPORTANT: Always refresh cache after mutations
await firewallGroupsService.refreshConfig();
```

### API Proxy

The frontend uses Next.js rewrites to proxy API calls:

- Browser calls: `/api/endpoint` → proxied to backend
- Server-side calls: `http://localhost:8000/endpoint` → direct

Configured in `next.config.ts`:
```typescript
async rewrites() {
  return [
    {
      source: '/api/:path*',
      destination: `${process.env.NEXT_PUBLIC_API_URL}/:path*`,
    },
  ];
}
```

## 🎨 Styling Guidelines

### Tailwind CSS v4

Use utility classes with design tokens from `globals.css`:

```tsx
// Colors
<div className="bg-background text-foreground" />
<div className="bg-card text-card-foreground" />
<div className="bg-primary text-primary-foreground" />
<div className="bg-destructive text-destructive-foreground" />

// States
<div className="hover:bg-accent hover:text-accent-foreground" />
<div className="border border-border" />
```

### Component Patterns

**Page Layout:**
```tsx
import { AppLayout } from "@/components/layout/AppLayout";

export default function Page() {
  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Page Title</h1>
        <p className="text-muted-foreground mt-2">Description</p>
      </div>
      {/* Page content */}
    </AppLayout>
  );
}
```

**Using `cn()` utility:**
```tsx
import { cn } from "@/lib/utils";

<div className={cn(
  "base-classes",
  isActive && "active-classes",
  variant === "primary" && "primary-classes"
)} />
```

## 🧩 Adding shadcn/ui Components

```bash
# Add a component
npx shadcn@latest add [component-name]

# Examples
npx shadcn@latest add dialog
npx shadcn@latest add table
npx shadcn@latest add badge
```

Components are added to `src/components/ui/` and can be customized.

## 📋 Version-Aware Features

The frontend adapts to VyOS version capabilities:

```typescript
// Fetch capabilities from backend
const capabilities = await service.getCapabilities();

// Conditionally render features
{capabilities.features.domain_group.supported && (
  <SelectItem value="domain-group">Domain Group</SelectItem>
)}

// Filter options based on version
const availableTypes = getAvailableGroupTypes(capabilities);
```

**Pattern for Modals:**
- Pass `capabilities` prop to modals
- Filter options based on `capabilities.features`
- Show/hide UI elements dynamically

## 🔄 State Management Pattern

### After Mutations

**Always refresh the backend cache** after create/update/delete operations:

```typescript
const handleCreate = async () => {
  try {
    // 1. Perform mutation
    await service.createSomething(data);

    // 2. Refresh backend cache
    await service.refreshConfig();

    // 3. Trigger UI refresh
    onSuccess();
  } catch (err) {
    setError(err.message);
  }
};
```

### Modal Pattern

```typescript
interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: Capabilities | null;  // For version-aware features
}

export function Modal({ open, onOpenChange, onSuccess, capabilities }: ModalProps) {
  const handleSubmit = async () => {
    await service.doSomething();
    await service.refreshConfig();  // Always refresh!
    onSuccess();
    onOpenChange(false);
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>...</Dialog>;
}
```

## 📝 TypeScript

### Best Practices

- **Strict mode enabled** - No `any` types
- **Define interfaces** for all data structures
- **Type API responses** using types from `src/lib/api/types/`
- **Use optional chaining** for nullable values

### Type Files

Types are organized by feature in `src/lib/api/types/`:

```typescript
// src/lib/api/types/[feature].ts
export interface FeatureConfig {
  name: string;
  value: string | null;
}

export interface FeatureCapabilities {
  version: string;
  features: Record<string, boolean>;
}

export interface BatchOperation {
  op: string;
  value?: string;
}
```

## 🧪 Development

### Type Checking

```bash
# Check types
npx tsc --noEmit

# Watch mode
npx tsc --noEmit --watch
```

### Linting

```bash
# Run linter
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix
```

## 📱 Responsive Design

All pages are responsive using Tailwind breakpoints:

```tsx
<div className="flex flex-col md:flex-row gap-4">
  <div className="w-full md:w-1/2">...</div>
  <div className="w-full md:w-1/2">...</div>
</div>
```

## 🎯 Key Features

- **Dark mode enforced** - Consistent dark theme
- **Version-aware UI** - Adapts to VyOS 1.4 vs 1.5
- **Real-time updates** - Auto-refresh after mutations
- **Type-safe API calls** - Full TypeScript support
- **Modular components** - Reusable UI components
- **Responsive layout** - Works on all screen sizes

## 🔗 Related

- **Main README**: See `../README.md` for full project documentation
- **Backend README**: See `../backend/README.md` for API documentation
- **API Docs**: http://localhost:8000/docs (when running)

---

**Built with Next.js 16 and shadcn/ui**
