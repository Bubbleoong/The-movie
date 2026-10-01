import { asyncHandler } from '../utils/asyncHandler.js';
import type { MediaType } from '../../src/types/media.js';
import { ApiError } from '../errors/ApiError.js';
import { animationTitles, popularTitles, searchTitles, titleDetail } from '../services/titles.js';
function pageParam(value: unknown): number {
    if (value === undefined)
        return 1;
    if (typeof value !== 'string' || !/^[1-9]\d{0,2}$/.test(value)) {
        throw new ApiError(400, 'INVALID_INPUT', 'page ต้องเป็นจำนวนเต็มบวกไม่เกิน 500');
    }
    const page = Number(value);
    if (page > 500)
        throw new ApiError(400, 'INVALID_INPUT', 'page ต้องเป็นจำนวนเต็มบวกไม่เกิน 500');
    return page;
}
function mediaTypeParam(value: unknown): MediaType {
    if (value !== 'movie' && value !== 'tv')
        throw new ApiError(400, 'INVALID_INPUT', 'mediaType ต้องเป็น movie หรือ tv');
    return value;
}
function tmdbIdParam(value: unknown): number {
    if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
        throw new ApiError(400, 'INVALID_INPUT', 'tmdbId ต้องเป็นจำนวนเต็มบวก');
    }
    const id = Number(value);
    if (!Number.isSafeInteger(id))
        throw new ApiError(400, 'INVALID_INPUT', 'tmdbId ต้องเป็นจำนวนเต็มบวก');
    return id;
}
export const getPopularController = asyncHandler(async (request, response) => {
    const mediaType = mediaTypeParam(request.query.mediaType);
    const page = pageParam(request.query.page);
    response.json(await popularTitles(mediaType, page));
});
export const getAnimationController = asyncHandler(async (request, response) => {
    const page = pageParam(request.query.page);
    response.json(await animationTitles(page));
});
export const searchTitlesController = asyncHandler(async (request, response) => {
    const query = request.query.q;
    if (typeof query !== 'string' || !query.trim() || query.trim().length > 100) {
        throw new ApiError(400, 'INVALID_INPUT', 'q ต้องมีความยาว 1–100 ตัวอักษร');
    }
    const page = pageParam(request.query.page);
    response.json(await searchTitles(query.trim(), page));
});
export const getTitleDetailController = asyncHandler(async (request, response) => {
    const mediaType = mediaTypeParam(request.params.mediaType);
    const tmdbId = tmdbIdParam(request.params.tmdbId);
    response.json({ data: await titleDetail(mediaType, tmdbId) });
});
