# YTY Rails

CRUD de usuarios y libros construido con Rails 8, usado como ejemplo de integración con herramientas de IA via MCP.

## Stack

- Ruby 3.2.3
- Rails 8.0.5
- SQLite (desarrollo)

## Setup (Recomendado con Docker)

```bash
docker compose build
docker compose up
```

### Setup Local (Sin Docker)

```bash
bundle install
rails db:create db:migrate
rails s
```

## MCP

Este proyecto incluye un MCP server que permite a herramientas como Claude Code, Windsurf o Claude Desktop operar el backend directamente mediante lenguaje natural.

Ver [mcp-walkthrough.md](./mcp-walkthrough.md) para configuración e instrucciones de uso.

El archivo `.mcp.json` en la raiz del proyecto configura el server automaticamente en Claude Code al abrir la carpeta.
