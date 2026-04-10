import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Load environment variables
dotenv.config();

const app = express();
app.set('trust proxy', 1); // Trust the first proxy
const PORT = 3000;

// Security Middleware
// app.use(helmet());
// app.use(rateLimit({ 
//     windowMs: 15 * 60 * 1000, 
//     max: 300,
//     message: "Prea multe cereri, încearcă mai târziu."
// }));

// Middleware to parse JSON bodies
app.use(express.json({ limit: '1mb' }));

// Health check endpoint
app.get('/api/ping', (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

async function startServer() {
    // Vite middleware for development
    if (process.env.NODE_ENV !== "production") {
        const { createServer: createViteServer } = await import('vite');
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: "spa",
        });
        app.use(vite.middlewares);
    } else {
        const distPath = path.join(process.cwd(), 'dist');
        console.log(`[Server] Production mode. Serving static files from: ${distPath}`);
        app.use(express.static(distPath));
        
        // Express 5 wildcard fix: use *all instead of (.*) or *
        app.get('*all', (req, res) => {
            res.sendFile(path.join(distPath, 'index.html'));
        });
    }

    // Always listen on the specified port in this environment
    app.listen(PORT, "0.0.0.0", () => {
        console.log(`[Server] Started successfully on http://0.0.0.0:${PORT}`);
        console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
    });
}

startServer().catch(err => {
    console.error("[Server] Critical failure during startup:", err);
    process.exit(1);
});

export default app;
