# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server with HMR at http://localhost:5173
- `npm run build` - Create production build
- `npm run start` - Run production server
- `npm run typecheck` - Run React Router typegen and TypeScript checking
- `npm run lint` - Run Prettier check and ESLint (removes dist folder first)
- `npm run format` - Format code with Prettier

## Architecture Overview

This is a full-stack React Router application with an integrated MCP (Model Context Protocol) server that provides tools via HTTP endpoints.

### Key Architectural Components

**Frontend (React Router SSR)**

- Uses React Router v7 with server-side rendering enabled
- UI code lives in `src/ui/` (configured in `react-router.config.ts`)
- Built with React 19, TypeScript, Tailwind CSS, and DaisyUI
- DaisyUI provides pre-built components and themes on top of Tailwind CSS
- Routes defined in `src/ui/routes.ts` with components in `src/ui/routes/`

**Backend (Express + MCP)**

- Express server in `server/app.ts` integrates React Router SSR and MCP middleware
- MCP server exposes tools at `/mcp` endpoint using custom framework in `src/framework/`
- Custom MCP framework provides `DefineTool` utility and middleware for Express integration

**MCP Tools System**

- Tools defined in `src/tools/` directory, exported via `src/tools/index.ts`
- Currently includes a `bash` tool that executes shell commands with UI integration
- Tools use custom `DefineTool` wrapper with Zod schemas for input validation
- Tools can return text and UI resources for rich client experiences

**Directory Structure**

```
src/
├── framework/     # Custom MCP framework (tools definition, server middleware)
├── lib/           # Utility libraries (shell execution, headers, UUID)
├── tools/         # MCP tools (bash tool implementation)
└── ui/           # React Router frontend application
    ├── routes/    # Route components
    └── welcome/   # Welcome page assets
```

### Import Aliases

- `$framework` → `src/framework/`
- `$lib` → `src/lib/`
- `$tools` → `src/tools/`

### Production Deployment

The application is containerized with Docker and can be deployed to various cloud platforms. The build process creates both client-side assets and server-side bundles in the `build/` directory.
