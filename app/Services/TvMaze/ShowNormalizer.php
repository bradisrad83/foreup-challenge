<?php

namespace App\Services\TvMaze;

/**
 * Converts raw TVmaze show objects into the application's normalized show shape.
 *
 * Handles two upstream shapes:
 *  - GET /shows?page=0        — array of show objects
 *  - GET /search/shows?q=...  — array of { score, show } wrappers
 */
class ShowNormalizer
{
    /**
     * Normalize an array of raw TVmaze show objects (from /shows).
     *
     * @param  array<int, array<string, mixed>>  $shows
     * @return array<int, array<string, mixed>>
     */
    public function normalizeMany(array $shows): array
    {
        return array_values(
            array_map(fn (array $show) => $this->normalize($show), $shows)
        );
    }

    /**
     * Normalize an array of search result wrappers (from /search/shows).
     * Each item is { score, show }; we unwrap the show before normalizing.
     * Items without a usable `show` payload are skipped rather than throwing,
     * so one malformed upstream entry cannot fail the whole response.
     *
     * @param  array<int, array<string, mixed>>  $results
     * @return array<int, array<string, mixed>>
     */
    public function normalizeSearchResults(array $results): array
    {
        $shows = [];

        foreach ($results as $result) {
            if (! isset($result['show']) || ! is_array($result['show'])) {
                continue;
            }

            $shows[] = $this->normalize($result['show']);
        }

        return $shows;
    }

    /**
     * Normalize a single raw TVmaze show object.
     *
     * @param  array<string, mixed>  $show
     * @return array<string, mixed>
     */
    public function normalize(array $show): array
    {
        return [
            'external_id' => $show['id'] ?? null,
            'name' => $show['name'] ?? null,
            'image_url' => $show['image']['original'] ?? $show['image']['medium'] ?? null,
            'summary' => $this->stripHtml($show['summary'] ?? null),
            'premiered' => $show['premiered'] ?? null,
            'ended' => $show['ended'] ?? null,
            'status' => $show['status'] ?? null,
            'genres' => $show['genres'] ?? [],
            'rating' => $show['rating']['average'] ?? null,
            'language' => $show['language'] ?? null,
            'network' => $show['network']['name'] ?? null,
            'official_url' => $show['officialSite'] ?? null,
            'metadata' => [
                'runtime' => $show['runtime'] ?? null,
                'show_type' => $show['type'] ?? null,
            ],
        ];
    }

    /**
     * Strip HTML tags and decode HTML entities from a summary string.
     * Returns null when the input is null or empty after stripping.
     */
    private function stripHtml(?string $html): ?string
    {
        if ($html === null || $html === '') {
            return null;
        }

        $text = strip_tags($html);
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = preg_replace('/\s+/', ' ', $text);
        $text = trim($text);

        return $text !== '' ? $text : null;
    }
}
