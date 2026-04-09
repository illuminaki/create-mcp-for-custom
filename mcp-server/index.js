import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import axios from "axios";

// Configuración de la URL de Rails (usar service name en Docker o localhost fuera)
const RAILS_API_URL = process.env.RAILS_API_URL || "http://localhost:3000";
const RAILS_API_TOKEN = process.env.RAILS_API_TOKEN;
const RAILS_API_TIMEOUT_MS = Number.parseInt(process.env.RAILS_API_TIMEOUT_MS || "10000", 10);
const SERVER_VERSION = "1.2.0";

// Logger simple con nivel y metadata opcional.
const log = (level, message, meta) => {
    const context = meta ? ` ${JSON.stringify(meta)}` : "";
    console.error(`[${new Date().toISOString()}] [${level}] ${message}${context}`);
};

// Resume objetos (user/book) en una línea legible.
const summarizeItem = (item) => {
    if (!item || typeof item !== "object") {
        return String(item);
    }

    const summary = [];
    if (item.id != null) summary.push(`#${item.id}`);
    if (item.name) summary.push(item.name);
    if (item.title) summary.push(item.title);
    if (item.score != null) summary.push(`score=${item.score}`);

    return summary.join(" | ") || JSON.stringify(item);
};

// Normaliza respuestas para que el LLM reciba texto compacto.
const formatResponse = (data, context = "Resultado") => {
    if (Array.isArray(data)) {
        const preview = data
            .slice(0, 10)
            .map((item, index) => `${index + 1}. ${summarizeItem(item)}`)
            .join("\n");

        const remaining = data.length > 10 ? `\n...y ${data.length - 10} más.` : "";

        return {
            content: [{ type: "text", text: `${context}\nTotal: ${data.length}\n${preview}${remaining}` }],
        };
    }

    if (data && typeof data === "object") {
        return {
            content: [{ type: "text", text: `${context}\n${summarizeItem(data)}` }],
        };
    }

    return {
        content: [{ type: "text", text: `${context}\n${String(data)}` }],
    };
};

// Uniforma errores y agrega contexto operativo.
const formatError = (action, error) => {
    const statusCode = error.response?.status;
    const details = error.response?.data?.error || error.message;

    log("ERROR", `Fallo al ${action}`, { statusCode, details });

    return {
        content: [
            {
                type: "text",
                text: `❌ Error en ${action}: ${details}. Asegúrate de que la app de Rails esté corriendo en ${RAILS_API_URL}`,
            },
        ],
    };
};

// Cliente HTTP base para todas las llamadas a Rails.
const railsApi = axios.create({
    baseURL: RAILS_API_URL,
    timeout: RAILS_API_TIMEOUT_MS,
    headers: {
        "Content-Type": "application/json",
        "X-MCP-Client": `yty-rails-manager/${SERVER_VERSION}`,
        ...(RAILS_API_TOKEN ? { Authorization: `Bearer ${RAILS_API_TOKEN}` } : {}),
    },
});

// Instancia principal del servidor MCP.
const server = new McpServer({
    name: "yty-rails-manager",
    version: SERVER_VERSION,
});

// --- Tools para USERS ---

// server.tool(
//     nombre,           // 1. Nombre de la herramienta
//     descripción,      // 2. Descripción para que el LLM entienda qué hace
//     schema,           // 3. Esquema de parámetros (con Zod)
//     handler           // 4. Función async que se ejecuta realmente
// );

// 1. Listar Usuarios
server.tool(
    "list_users",
    "Obtiene la lista de todos los usuarios registrados en la base de datos de Rails",
    {},
    async () => {
        try {
            log("INFO", "Invocando list_users");
            const response = await railsApi.get("/users.json");
            return formatResponse(response.data, "Usuarios encontrados");
        } catch (error) {
            return formatError("listar usuarios", error);
        }
    }
);

// 2. Obtener Usuario por ID
server.tool(
    "get_user",
    "Obtiene los detalles completos de un usuario específico mediante su ID único",
    { id: z.number().describe("El ID numérico del usuario") },
    async ({ id }) => {
        try {
            log("INFO", "Invocando get_user", { id });
            const response = await railsApi.get(`/users/${id}.json`);
            return formatResponse(response.data, `Detalles del usuario ${id}`);
        } catch (error) {
            return formatError(`obtener usuario ${id}`, error);
        }
    }
);

// 3. Crear Usuario
server.tool(
    "create_user",
    "Crea un nuevo registro de usuario en Rails con nombre y puntaje (score)",
    {
        name: z.string().describe("Nombre completo del usuario"),
        score: z.string().describe("Puntaje o score asignado (debe enviarse como string)"),
    },
    async ({ name, score }) => {
        try {
            log("INFO", "Invocando create_user", { name });
            const response = await railsApi.post("/users.json", {
                user: { name, score },
            });
            return formatResponse(response.data, "Usuario creado exitosamente");
        } catch (error) {
            return formatError("crear usuario", error);
        }
    }
);

// 4. Eliminar Usuario
server.tool(
    "delete_user",
    "Elimina permanentemente a un usuario de la base de datos de Rails por su ID",
    { id: z.number().describe("ID del usuario a eliminar") },
    async ({ id }) => {
        try {
            log("INFO", "Invocando delete_user", { id });
            await railsApi.delete(`/users/${id}.json`);
            return {
                content: [{ type: "text", text: `Usuario con ID ${id} ha sido eliminado correctamente.` }],
            };
        } catch (error) {
            return formatError(`eliminar usuario ${id}`, error);
        }
    }
);

// 5. [NEW] Top Usuarios (Score > 50)
server.tool(
    "get_top_users",
    "Filtra y devuelve los usuarios cuyo score es superior a 50. Útil para métricas de desempeño.",
    {},
    async () => {
        try {
            log("INFO", "Invocando get_top_users");
            const response = await railsApi.get("/users.json");
            const topUsers = response.data
                .filter((u) => Number.parseInt(u.score, 10) > 50)
                .sort((a, b) => Number.parseInt(b.score, 10) - Number.parseInt(a.score, 10));

            return formatResponse(topUsers, "🏆 Usuarios destacados (Score > 50)");
        } catch (error) {
            return formatError("obtener top usuarios", error);
        }
    }
);

// --- Tools para BOOKS ---

// 6. Listar Libros
server.tool(
    "list_books",
    "Obtiene el catálogo completo de libros registrados en la aplicación Rails",
    {},
    async () => {
        try {
            log("INFO", "Invocando list_books");
            const response = await railsApi.get("/books.json");
            return formatResponse(response.data, "Catálogo de libros");
        } catch (error) {
            return formatError("listar libros", error);
        }
    }
);

// 7. Obtener Libro por ID
server.tool(
    "get_book",
    "Recupera la información detallada (título y descripción) de un libro por su ID",
    { id: z.number().describe("ID del libro a consultar") },
    async ({ id }) => {
        try {
            log("INFO", "Invocando get_book", { id });
            const response = await railsApi.get(`/books/${id}.json`);
            return formatResponse(response.data, `Información del libro ${id}`);
        } catch (error) {
            return formatError(`obtener libro ${id}`, error);
        }
    }
);

// 8. Crear Libro
server.tool(
    "create_book",
    "Registra un nuevo libro con su título y una breve descripción en la base de datos",
    {
        title: z.string().describe("El título del libro"),
        desc: z.string().describe("Descripción o resumen del libro"),
    },
    async ({ title, desc }) => {
        try {
            log("INFO", "Invocando create_book", { title });
            const response = await railsApi.post("/books.json", {
                book: { title, desc },
            });
            return formatResponse(response.data, "📚 Libro registrado exitosamente");
        } catch (error) {
            return formatError("crear libro", error);
        }
    }
);

// 9. Eliminar Libro
server.tool(
    "delete_book",
    "Remueve de forma definitiva un libro del sistema Rails mediante su ID",
    { id: z.number().describe("ID del libro a eliminar") },
    async ({ id }) => {
        try {
            log("INFO", "Invocando delete_book", { id });
            await railsApi.delete(`/books/${id}.json`);
            return {
                content: [{ type: "text", text: `🗑️ Libro con ID ${id} eliminado satisfactoriamente.` }],
            };
        } catch (error) {
            return formatError(`eliminar libro ${id}`, error);
        }
    }
);

// --- Iniciar Servidor ---
const main = async () => {
    try {
        if (!RAILS_API_TOKEN) {
            log("WARN", "RAILS_API_TOKEN no está definido; continuando sin autenticación Bearer");
        }

        const transport = new StdioServerTransport();
        await server.connect(transport);
        log("INFO", `🚀 YTY Rails Manager MCP Server v${SERVER_VERSION} running on stdio`, {
            railsUrl: RAILS_API_URL,
            timeoutMs: RAILS_API_TIMEOUT_MS,
        });
    } catch (error) {
        log("ERROR", "No se pudo iniciar el MCP server", { error: error.message });
        process.exit(1);
    }
};

process.on("unhandledRejection", (reason) => {
    log("ERROR", "Unhandled promise rejection", {
        reason: reason instanceof Error ? reason.message : String(reason),
    });
});

process.on("uncaughtException", (error) => {
    log("ERROR", "Uncaught exception", { error: error.message });
    process.exit(1);
});

await main();
