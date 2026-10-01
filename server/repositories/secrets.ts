import { databasePool } from '../database/config.js'

export async function findTmdbApiKey(): Promise<string | undefined> {
  const result = await databasePool().query<{ decrypted_secret: string }>(
    'select decrypted_secret from vault.decrypted_secrets where name = $1 limit 1',
    ['tmdb_api_key'],
  )
  return result.rows[0]?.decrypted_secret
}
