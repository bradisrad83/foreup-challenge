/**
 * Thin fetch wrapper for the internal Laravel /api/* endpoints.
 *
 * Rules enforced here:
 * - Always sets Accept: application/json
 * - Parses JSON bodies (success and error)
 * - Propagates AbortController signals
 * - Never calls TVmaze — only relative /api/* paths
 * - Throws a structured error object so callers can branch on status
 * - Sends the CSRF token on mutating requests (read from meta tag, then cookie)
 */

const BASE = '/api';

/**
 * Read the CSRF token, preferring the <meta name="csrf-token"> tag (set by
 * the Blade shell), falling back to the XSRF-TOKEN cookie that Laravel sets
 * automatically on the first page load.
 *
 * Laravel's /api routes use the stateless "api" middleware group and do not
 * enforce CSRF verification, but we send the token anyway so this wrapper
 * remains correct if the middleware configuration ever changes.
 *
 * @returns {string|null}
 */
function getCsrfToken() {
    // Try <meta name="csrf-token"> first (most reliable)
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag) {
        return metaTag.getAttribute('content');
    }

    // Fall back to the XSRF-TOKEN cookie
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    if (match) {
        return decodeURIComponent(match[1]);
    }

    return null;
}

/**
 * @param {string} path  - path relative to /api, e.g. '/shows'
 * @param {object} [options]
 * @param {string} [options.method]  - HTTP method (default 'GET')
 * @param {object} [options.params]  - URL query parameters (object)
 * @param {object} [options.body]    - request body (will be JSON-serialized)
 * @param {AbortSignal} [options.signal] - AbortController signal
 * @returns {Promise<any>} parsed JSON response data
 * @throws {{ status: number, message: string, errors?: object }} on HTTP errors
 */
async function request(path, { method = 'GET', params, body, signal } = {}) {
    let url = BASE + path;

    if (params) {
        const qs = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
            if (value !== null && value !== undefined && value !== '') {
                qs.set(key, value);
            }
        }
        const queryString = qs.toString();
        if (queryString) {
            url += '?' + queryString;
        }
    }

    const headers = {
        Accept: 'application/json',
    };

    if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
    }

    // Send CSRF token on state-mutating requests
    const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (mutatingMethods.includes(method.toUpperCase())) {
        const token = getCsrfToken();
        if (token) {
            headers['X-CSRF-TOKEN'] = token;
        }
    }

    const response = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal,
    });

    // 204 No Content — no body to parse
    if (response.status === 204) {
        return null;
    }

    let json;
    try {
        json = await response.json();
    } catch {
        // Body was not valid JSON — create a minimal error
        const error = new Error(`HTTP ${response.status}`);
        error.status = response.status;
        error.message = `HTTP ${response.status}`;
        throw error;
    }

    if (!response.ok) {
        const error = new Error(json.message || `HTTP ${response.status}`);
        error.status = response.status;
        error.message = json.message || `HTTP ${response.status}`;
        error.errors = json.errors || null;
        throw error;
    }

    return json;
}

/**
 * GET /api/shows
 * @param {object} [params]        - e.g. { search: 'breaking bad' }
 * @param {AbortSignal} [signal]
 */
export function getShows(params, signal) {
    return request('/shows', { params, signal });
}

// ---------------------------------------------------------------------------
// Favorite lists
// ---------------------------------------------------------------------------

/**
 * GET /api/favorite-lists
 * Returns all lists ordered by name asc, each with favorites_count.
 */
export function getFavoriteLists() {
    return request('/favorite-lists');
}

/**
 * POST /api/favorite-lists
 * @param {{ name: string }} body
 */
export function createFavoriteList(body) {
    return request('/favorite-lists', { method: 'POST', body });
}

/**
 * GET /api/favorite-lists/{id}
 * Returns the list with its favorites ordered by updated_at desc.
 * @param {number} id
 */
export function getFavoriteList(id) {
    return request(`/favorite-lists/${id}`);
}

/**
 * DELETE /api/favorite-lists/{id}
 * @param {number} id
 */
export function deleteFavoriteList(id) {
    return request(`/favorite-lists/${id}`, { method: 'DELETE' });
}

// ---------------------------------------------------------------------------
// Favorites (within a list)
// ---------------------------------------------------------------------------

/**
 * POST /api/favorite-lists/{listId}/favorites
 * Save a show snapshot to the list.
 * @param {number} listId
 * @param {object} show - normalized show fields
 */
export function addFavorite(listId, show) {
    return request(`/favorite-lists/${listId}/favorites`, { method: 'POST', body: show });
}

/**
 * DELETE /api/favorite-lists/{listId}/favorites/{favoriteId}
 * @param {number} listId
 * @param {number} favoriteId
 */
export function removeFavorite(listId, favoriteId) {
    return request(`/favorite-lists/${listId}/favorites/${favoriteId}`, { method: 'DELETE' });
}
