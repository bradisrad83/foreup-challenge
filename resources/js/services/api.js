/**
 * Thin fetch wrapper for the internal Laravel /api/* endpoints.
 *
 * Rules enforced here:
 * - Always sets Accept: application/json
 * - Parses JSON bodies (success and error)
 * - Propagates AbortController signals
 * - Never calls TVmaze — only relative /api/* paths
 * - Throws a structured error object so callers can branch on status
 */

const BASE = '/api';

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
