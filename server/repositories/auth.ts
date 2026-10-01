import { databasePool } from '../database/config.js';
export async function accountExists(email: string): Promise<boolean> {
    const result = await databasePool().query<{
        exists: boolean;
    }>('SELECT EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = lower($1)) AS exists', [email]);
    return result.rows[0]?.exists ?? false;
}
