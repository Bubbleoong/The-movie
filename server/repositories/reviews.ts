import type pg from 'pg';
import type { MediaId } from '../../src/types/media.js';
import { ApiError } from '../errors/ApiError.js';
import { databasePool } from '../database/config.js';
export type Row = {
    id: string;
    user_id: string;
    media_type: 'movie' | 'tv';
    tmdb_id: number;
    rating: number;
    body: string;
    created_at: Date | string;
    updated_at: Date | string;
};
export async function asRole<T>(userId: string | null, action: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    let client: pg.PoolClient;
    try {
        client = await databasePool().connect();
    }
    catch (error) {
        if (error instanceof ApiError)
            throw error;
        throw new ApiError(503, 'DB_UNAVAILABLE', 'ติดต่อฐานข้อมูลรีวิวไม่ได้');
    }
    try {
        await client.query('begin');
        await client.query(userId ? 'set local role authenticated' : 'set local role anon');
        if (userId)
            await client.query("select set_config('request.jwt.claim.sub', $1, true)", [userId]);
        const result = await action(client);
        await client.query('commit');
        return result;
    }
    catch (error) {
        await client.query('rollback').catch(() => { });
        if (error instanceof ApiError)
            throw error;
        console.warn('Reviews database operation failed', { code: (error as {
                code?: string;
            }).code ?? 'unknown' });
        throw new ApiError(503, 'DB_UNAVAILABLE', 'จัดการรีวิวไม่สำเร็จ');
    }
    finally {
        client.release();
    }
}
export function selectReviewSummary(client: pg.PoolClient, id: MediaId) {
    return client.query<{
        count: number;
        average: string | null;
    }>('select count(*)::integer as count, round(avg(rating)::numeric, 1) as average from public.reviews where media_type=$1 and tmdb_id=$2', [id.mediaType, id.tmdbId]);
}
export function selectReviewAdmin(client: pg.PoolClient) {
    return client.query<{
        allowed: boolean;
    }>('select app_private.is_site_admin() as allowed');
}
export function selectReviews(client: pg.PoolClient, id: MediaId, page: number) {
    return client.query<Row>('select id,user_id,media_type,tmdb_id,rating,body,created_at,updated_at from public.reviews where media_type=$1 and tmdb_id=$2 order by created_at desc,id desc limit 10 offset $3', [id.mediaType, id.tmdbId, (page - 1) * 10]);
}
export function upsertReview(client: pg.PoolClient, userId: string, id: MediaId, rating: number, body: string) {
    return client.query<Row>(`insert into public.reviews(user_id,media_type,tmdb_id,rating,body)
       values($1,$2,$3,$4,$5)
       on conflict(user_id,media_type,tmdb_id) do update set rating=excluded.rating,body=excluded.body
       returning id,user_id,media_type,tmdb_id,rating,body,created_at,updated_at`, [userId, id.mediaType, id.tmdbId, rating, body]);
}
export function selectMyReview(client: pg.PoolClient, userId: string, id: MediaId) {
    return client.query<Row>('select id,user_id,media_type,tmdb_id,rating,body,created_at,updated_at from public.reviews where user_id=$1 and media_type=$2 and tmdb_id=$3', [userId, id.mediaType, id.tmdbId]);
}
export function removeMyReview(client: pg.PoolClient, userId: string, id: MediaId) {
    return client.query('delete from public.reviews where user_id=$1 and media_type=$2 and tmdb_id=$3', [userId, id.mediaType, id.tmdbId]);
}
export function removeReview(client: pg.PoolClient, reviewId: string, id: MediaId) {
    return client.query('delete from public.reviews where id=$1 and media_type=$2 and tmdb_id=$3', [reviewId, id.mediaType, id.tmdbId]);
}
