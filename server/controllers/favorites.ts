import { asyncHandler } from '../utils/asyncHandler.js';
import type { MediaId } from '../../src/types/media.js';
import { ApiError } from '../errors/ApiError.js';
import { authenticatedUser, requireSameOrigin } from '../middleware/session.js';
import { addFavorite, listFavorites, removeFavorite } from '../services/favorites.js';
function mediaId(mediaType: unknown, tmdbId: unknown): MediaId {
    if (mediaType !== 'movie' && mediaType !== 'tv')
        throw new ApiError(400, 'INVALID_INPUT', 'mediaType ต้องเป็น movie หรือ tv');
    if (typeof tmdbId !== 'string' || !/^[1-9]\d*$/.test(tmdbId) || !Number.isSafeInteger(Number(tmdbId))) {
        throw new ApiError(400, 'INVALID_INPUT', 'tmdbId ต้องเป็นจำนวนเต็มบวก');
    }
    return { mediaType, tmdbId: Number(tmdbId) };
}
export const getFavoritesController = asyncHandler(async (request, response) => {
    const { user, accessToken } = await authenticatedUser(request, response);
    response.json({ data: await listFavorites(accessToken, user.id) });
});
export const putFavoriteController = asyncHandler(async (request, response) => {
    requireSameOrigin(request);
    const id = mediaId(request.params.mediaType, request.params.tmdbId);
    const { user, accessToken } = await authenticatedUser(request, response);
    response.json({ data: await addFavorite(accessToken, user.id, id) });
});
export const deleteFavoriteController = asyncHandler(async (request, response) => {
    requireSameOrigin(request);
    const id = mediaId(request.params.mediaType, request.params.tmdbId);
    const { user, accessToken } = await authenticatedUser(request, response);
    await removeFavorite(accessToken, user.id, id);
    response.json({ data: null });
});
