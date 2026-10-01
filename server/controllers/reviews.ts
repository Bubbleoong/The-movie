import { asyncHandler } from '../utils/asyncHandler.js';
import type { MediaId } from '../../src/types/media.js';
import { ApiError } from '../errors/ApiError.js';
import { accessCookie, authenticatedUser, refreshCookie, requireSameOrigin } from '../middleware/session.js';
import { deleteMyReview, deleteReview, getMyReview, listReviews, saveReview } from '../services/reviews.js';
function mediaId(mediaType: unknown, tmdbId: unknown): MediaId {
    if (mediaType !== 'movie' && mediaType !== 'tv')
        throw new ApiError(400, 'INVALID_INPUT', 'mediaType ต้องเป็น movie หรือ tv');
    if (typeof tmdbId !== 'string' || !/^[1-9]\d*$/.test(tmdbId) || !Number.isSafeInteger(Number(tmdbId))) {
        throw new ApiError(400, 'INVALID_INPUT', 'tmdbId ต้องเป็นจำนวนเต็มบวก');
    }
    return { mediaType, tmdbId: Number(tmdbId) };
}
function pageParam(value: unknown) {
    if (value === undefined)
        return 1;
    if (typeof value !== 'string' || !/^[1-9]\d{0,2}$/.test(value) || Number(value) > 500) {
        throw new ApiError(400, 'INVALID_INPUT', 'page ต้องเป็นจำนวนเต็มบวกไม่เกิน 500');
    }
    return Number(value);
}
export const getReviewsController = asyncHandler(async (request, response) => {
    const id = mediaId(request.params.mediaType, request.params.tmdbId);
    const page = pageParam(request.query.page);
    let userId: string | null = null;
    if (accessCookie(request) || refreshCookie(request)) {
        try {
            userId = (await authenticatedUser(request, response)).user.id;
        }
        catch (error) {
            if (!(error instanceof ApiError) || error.status !== 401)
                throw error;
        }
    }
    response.json(await listReviews(id, page, userId));
});
export const putMyReviewController = asyncHandler(async (request, response) => {
    requireSameOrigin(request);
    const id = mediaId(request.params.mediaType, request.params.tmdbId);
    const rating = request.body?.rating;
    const body = request.body?.body;
    if (!Number.isInteger(rating) || rating < 1 || rating > 10 ||
        typeof body !== 'string' || body.trim().length < 1 || body.trim().length > 2000) {
        throw new ApiError(400, 'INVALID_INPUT', 'คะแนนต้องเป็นจำนวนเต็ม 1–10 และข้อความรีวิวต้องมี 1–2000 ตัวอักษร');
    }
    const { user } = await authenticatedUser(request, response);
    response.json({ data: await saveReview(id, user.id, rating, body.trim()) });
});
export const getMyReviewController = asyncHandler(async (request, response) => {
    const id = mediaId(request.params.mediaType, request.params.tmdbId);
    const { user } = await authenticatedUser(request, response);
    response.json({ data: await getMyReview(id, user.id) });
});
export const deleteMyReviewController = asyncHandler(async (request, response) => {
    requireSameOrigin(request);
    const id = mediaId(request.params.mediaType, request.params.tmdbId);
    const { user } = await authenticatedUser(request, response);
    await deleteMyReview(id, user.id);
    response.json({ data: null });
});
export const deleteReviewController = asyncHandler(async (request, response) => {
    requireSameOrigin(request);
    const id = mediaId(request.params.mediaType, request.params.tmdbId);
    const reviewId = request.params.reviewId;
    if (typeof reviewId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(reviewId)) {
        throw new ApiError(400, 'INVALID_INPUT', 'รหัสรีวิวไม่ถูกต้อง');
    }
    const { user } = await authenticatedUser(request, response);
    await deleteReview(id, reviewId, user.id);
    response.json({ data: null });
});
