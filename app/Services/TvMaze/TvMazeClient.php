<?php

namespace App\Services\TvMaze;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/**
 * The sole caller of the TVmaze API.
 *
 * Caches successful normalized results (~5 minutes).
 * Never caches failures.
 * Returns a controlled exception on upstream failure so controllers can return 502.
 */
class TvMazeClient
{
    private const CACHE_TTL_SECONDS = 300; // 5 minutes

    private const MAX_RESULTS = 100;

    public function __construct(
        private readonly ShowNormalizer $normalizer,
        private readonly string $baseUrl,
        private readonly int $timeout,
    ) {}

    /**
     * Fetch the initial unfiltered list of shows (TVmaze /shows?page=0).
     *
     * @return array<int, array<string, mixed>>
     *
     * @throws TvMazeException
     */
    public function getShows(): array
    {
        return Cache::remember('shows:index', self::CACHE_TTL_SECONDS, function () {
            $response = $this->get('/shows', ['page' => 0]);

            return array_slice(
                $this->normalizer->normalizeMany($response),
                0,
                self::MAX_RESULTS,
            );
        });
    }

    /**
     * Search TVmaze shows by query string (TVmaze /search/shows?q={query}).
     *
     * @return array<int, array<string, mixed>>
     *
     * @throws TvMazeException
     */
    public function searchShows(string $query): array
    {
        $cacheKey = 'shows:search:'.md5($query);

        return Cache::remember($cacheKey, self::CACHE_TTL_SECONDS, function () use ($query) {
            $response = $this->get('/search/shows', ['q' => $query]);

            return array_slice(
                $this->normalizer->normalizeSearchResults($response),
                0,
                self::MAX_RESULTS,
            );
        });
    }

    /**
     * Make a GET request to the TVmaze API.
     *
     * @param  array<string, mixed>  $query
     * @return array<mixed>
     *
     * @throws TvMazeException
     */
    private function get(string $path, array $query = []): array
    {
        // User input never controls the host; base URL comes from config only.
        $url = rtrim($this->baseUrl, '/').'/'.ltrim($path, '/');

        try {
            $response = Http::timeout($this->timeout)
                ->acceptJson()
                ->get($url, $query);
        } catch (ConnectionException $e) {
            throw new TvMazeException('TVmaze connection failed: '.$e->getMessage(), previous: $e);
        }

        if (! $response->successful()) {
            throw new TvMazeException(
                sprintf('TVmaze returned HTTP %d for %s', $response->status(), $path)
            );
        }

        return $response->json() ?? [];
    }
}
