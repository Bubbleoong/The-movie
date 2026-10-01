import { asyncHandler } from '../utils/asyncHandler.js';
import { existsSync } from 'node:fs';
import path from 'node:path';
export const getHealthController = asyncHandler(async (_request, response) => {
    const caCertificate = process.env.DATABASE_CA_CERT
        ? 'env'
        : existsSync(path.resolve(process.cwd(), 'supabase/ca.crt')) ? 'file' : 'missing';
    response.json({
        data: {
            status: 'ok',
            config: {
                database: Boolean(process.env.DATABASE_URL),
                caCertificate,
                supabaseAuth: Boolean(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_PUBLISHABLE_KEY),
            },
        },
    });
});
