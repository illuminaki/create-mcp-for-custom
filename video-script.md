# Notas para el video: MCP + herramientas de IA

## El problema que resuelve

Las herramientas de IA como Claude Code o Windsurf generan código, responden preguntas, leen archivos. Pero por defecto no pueden hacer nada en tu sistema — solo hablan.

MCP cambia eso. Es un protocolo abierto que permite que un modelo de lenguaje descubra y ejecute herramientas reales en tiempo de ejecución. No es un hack ni una integración custom — es el estándar que está adoptando la industria para conectar modelos con sistemas externos.

---

## Cómo funciona MCP

Un MCP server es un proceso que expone un conjunto de herramientas con nombre, descripción y parámetros. El modelo los recibe al inicio de la sesión y decide cuándo y cómo usarlos según lo que el usuario le pide.

La comunicación ocurre por stdio: el cliente (el editor o agente) lanza el proceso del server y se comunican por entrada/salida estándar. No hay puerto, no hay HTTP entre el modelo y el server — es un proceso local.

```
Herramienta de IA (Claude Code / Windsurf / Claude Desktop)
        |
        |  stdio (MCP protocol)
        v
   MCP Server  <-- proceso Node.js que tú escribes
        |
        |  HTTP
        v
   Tu backend / API / base de datos / lo que sea
```

El modelo no sabe nada de HTTP, de Rails ni de tu base de datos. Solo sabe que tiene una herramienta llamada `create_user` que recibe `name` y `score`. El MCP server es el que traduce esa llamada a lo que necesite hacer internamente.

---

## Qué se necesita para crear un MCP server

Tres cosas:

**1. El SDK oficial**
```bash
npm install @modelcontextprotocol/sdk
```
Anthropic publicó SDKs para TypeScript y Python. Manejan el protocolo por ti.

**2. Definir las herramientas**
Cada tool tiene nombre, descripción y schema de parámetros (con Zod en TypeScript). La descripción es lo que lee el modelo para decidir si usar o no esa herramienta — tiene que ser clara.

```js
server.tool(
    "create_user",
    "Crea un nuevo usuario con nombre y score en la base de datos",
    {
        name: z.string(),
        score: z.number()
    },
    async ({ name, score }) => {
        // aqui va la logica: HTTP call, query directa, lo que necesites
    }
);
```

**3. Conectar el transport**
```js
const transport = new StdioServerTransport();
await server.connect(transport);
```

Eso es todo. El server ya puede ser consumido por cualquier cliente MCP.

---

## Cómo está construido este proyecto

La API es una aplicación Rails estándar que expone endpoints REST para dos recursos: usuarios y libros. No tiene ninguna modificación especial para MCP — es un backend normal.

El MCP server está en `mcp-server/index.js`. Es un proceso Node.js separado con 9 herramientas que cubren las operaciones principales de la API. Cuando el modelo llama a una tool, el server hace un request HTTP a Rails con axios y devuelve la respuesta formateada.

La configuración para que Claude Code lo detecte está en `.mcp.json` en la raíz del proyecto. Al abrir la carpeta, Claude Code lanza el proceso automáticamente y el modelo ya tiene acceso a las herramientas.

Para Windsurf y Claude Desktop el mecanismo es el mismo — cambia solo dónde va el archivo de configuración.

---

## Por qué esto es útil

El modelo puede operar tu backend con lenguaje natural sin que construyas ninguna interfaz adicional. Durante desarrollo eso significa crear datos de prueba, verificar estado, probar flujos — todo desde el chat del editor.

Pero el patrón escala: el mismo MCP server puede conectarse a una base de datos directamente, a una API externa, a un sistema de archivos, a un servicio interno. Cualquier sistema que hoy requiere que un humano lo opere manualmente puede exponerse como herramientas MCP y quedar disponible para cualquier agente que soporte el protocolo.

---

## Puntos clave para mencionar en el video

- MCP es el protocolo, no la herramienta. Claude Code, Windsurf, Cursor y otros lo soportan porque es un estándar, no porque sea exclusivo de Anthropic.
- El server corre local — el modelo no tiene acceso directo a tu sistema, pasa por el proceso que tú controlas.
- Las descripciones de las tools importan. El modelo las usa para razonar. Una descripción vaga produce llamadas incorrectas.
- El backend no cambia. MCP es una capa encima, no una modificación a lo existente.
