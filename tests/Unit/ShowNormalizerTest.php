<?php

namespace Tests\Unit;

use App\Services\TvMaze\ShowNormalizer;
use PHPUnit\Framework\TestCase;

/**
 * Unit tests for ShowNormalizer — isolated logic, no HTTP calls.
 */
class ShowNormalizerTest extends TestCase
{
    private ShowNormalizer $normalizer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->normalizer = new ShowNormalizer;
    }

    private function makeTvMazeShow(array $overrides = []): array
    {
        return array_merge([
            'id' => 169,
            'name' => 'Breaking Bad',
            'type' => 'Scripted',
            'language' => 'English',
            'genres' => ['Drama', 'Crime'],
            'status' => 'Ended',
            'runtime' => 60,
            'premiered' => '2008-01-20',
            'ended' => '2013-09-29',
            'officialSite' => 'https://www.amc.com/shows/breaking-bad',
            'rating' => ['average' => 9.2],
            'network' => ['id' => 20, 'name' => 'AMC'],
            'image' => [
                'medium' => 'https://static.tvmaze.com/medium/169.jpg',
                'original' => 'https://static.tvmaze.com/original/169.jpg',
            ],
            'summary' => '<p>A chemistry teacher.</p>',
        ], $overrides);
    }

    // ---------------------------------------------------------------------------
    // normalize()
    // ---------------------------------------------------------------------------

    public function test_normalizes_show_id_to_external_id(): void
    {
        $result = $this->normalizer->normalize($this->makeTvMazeShow(['id' => 42]));

        $this->assertSame(42, $result['external_id']);
    }

    public function test_maps_image_original_to_image_url(): void
    {
        $result = $this->normalizer->normalize($this->makeTvMazeShow());

        $this->assertSame('https://static.tvmaze.com/original/169.jpg', $result['image_url']);
    }

    public function test_falls_back_to_medium_image_when_original_absent(): void
    {
        $show = $this->makeTvMazeShow(['image' => ['medium' => 'https://example.com/medium.jpg']]);

        $result = $this->normalizer->normalize($show);

        $this->assertSame('https://example.com/medium.jpg', $result['image_url']);
    }

    public function test_null_image_becomes_null(): void
    {
        $result = $this->normalizer->normalize($this->makeTvMazeShow(['image' => null]));

        $this->assertNull($result['image_url']);
    }

    public function test_maps_network_name_to_network(): void
    {
        $result = $this->normalizer->normalize($this->makeTvMazeShow());

        $this->assertSame('AMC', $result['network']);
    }

    public function test_null_network_becomes_null(): void
    {
        $result = $this->normalizer->normalize($this->makeTvMazeShow(['network' => null]));

        $this->assertNull($result['network']);
    }

    public function test_maps_rating_average_to_rating(): void
    {
        $result = $this->normalizer->normalize($this->makeTvMazeShow(['rating' => ['average' => 8.5]]));

        $this->assertSame(8.5, $result['rating']);
    }

    public function test_null_rating_average_becomes_null(): void
    {
        $result = $this->normalizer->normalize($this->makeTvMazeShow(['rating' => ['average' => null]]));

        $this->assertNull($result['rating']);
    }

    public function test_maps_official_site_to_official_url(): void
    {
        $result = $this->normalizer->normalize($this->makeTvMazeShow());

        $this->assertSame('https://www.amc.com/shows/breaking-bad', $result['official_url']);
    }

    public function test_metadata_contains_runtime_and_show_type(): void
    {
        $result = $this->normalizer->normalize($this->makeTvMazeShow());

        $this->assertSame(['runtime' => 60, 'show_type' => 'Scripted'], $result['metadata']);
    }

    public function test_missing_genres_defaults_to_empty_array(): void
    {
        $show = $this->makeTvMazeShow();
        unset($show['genres']);

        $result = $this->normalizer->normalize($show);

        $this->assertSame([], $result['genres']);
    }

    // ---------------------------------------------------------------------------
    // HTML stripping in summary
    // ---------------------------------------------------------------------------

    public function test_strips_html_tags_from_summary(): void
    {
        $show = $this->makeTvMazeShow(['summary' => '<p>A <b>chemistry</b> teacher.</p>']);

        $result = $this->normalizer->normalize($show);

        $this->assertSame('A chemistry teacher.', $result['summary']);
    }

    public function test_decodes_html_entities_in_summary(): void
    {
        $show = $this->makeTvMazeShow(['summary' => '<p>Teacher &amp; student.</p>']);

        $result = $this->normalizer->normalize($show);

        $this->assertStringContainsString('&', $result['summary']);
        $this->assertStringNotContainsString('&amp;', $result['summary']);
    }

    public function test_collapses_whitespace_in_summary(): void
    {
        $show = $this->makeTvMazeShow(['summary' => "<p>First  paragraph.</p>\n<p>Second.</p>"]);

        $result = $this->normalizer->normalize($show);

        $this->assertStringNotContainsString('  ', $result['summary']);
    }

    public function test_null_summary_stays_null(): void
    {
        $result = $this->normalizer->normalize($this->makeTvMazeShow(['summary' => null]));

        $this->assertNull($result['summary']);
    }

    public function test_empty_summary_becomes_null(): void
    {
        $result = $this->normalizer->normalize($this->makeTvMazeShow(['summary' => '']));

        $this->assertNull($result['summary']);
    }

    public function test_tags_only_summary_becomes_null(): void
    {
        $result = $this->normalizer->normalize($this->makeTvMazeShow(['summary' => '<p></p>']));

        $this->assertNull($result['summary']);
    }

    // ---------------------------------------------------------------------------
    // normalizeMany() — /shows array shape
    // ---------------------------------------------------------------------------

    public function test_normalizes_many_shows(): void
    {
        $shows = [
            $this->makeTvMazeShow(['id' => 1, 'name' => 'Show 1']),
            $this->makeTvMazeShow(['id' => 2, 'name' => 'Show 2']),
        ];

        $result = $this->normalizer->normalizeMany($shows);

        $this->assertCount(2, $result);
        $this->assertSame(1, $result[0]['external_id']);
        $this->assertSame(2, $result[1]['external_id']);
    }

    public function test_normalizes_empty_array(): void
    {
        $result = $this->normalizer->normalizeMany([]);

        $this->assertSame([], $result);
    }

    // ---------------------------------------------------------------------------
    // normalizeSearchResults() — /search/shows {score,show} shape
    // ---------------------------------------------------------------------------

    public function test_unwraps_search_result_wrapper(): void
    {
        $results = [
            ['score' => 1.0, 'show' => $this->makeTvMazeShow(['id' => 99, 'name' => 'Test Show'])],
        ];

        $result = $this->normalizer->normalizeSearchResults($results);

        $this->assertCount(1, $result);
        $this->assertSame(99, $result[0]['external_id']);
        $this->assertSame('Test Show', $result[0]['name']);
    }

    public function test_normalizes_multiple_search_results(): void
    {
        $results = [
            ['score' => 0.9, 'show' => $this->makeTvMazeShow(['id' => 1])],
            ['score' => 0.8, 'show' => $this->makeTvMazeShow(['id' => 2])],
        ];

        $result = $this->normalizer->normalizeSearchResults($results);

        $this->assertCount(2, $result);
    }

    public function test_skips_search_results_missing_a_usable_show(): void
    {
        $results = [
            ['score' => 1.0, 'show' => $this->makeTvMazeShow(['id' => 1])],
            ['score' => 0.5], // malformed: no `show` key
            ['score' => 0.4, 'show' => null], // malformed: `show` is not an array
            ['score' => 0.3, 'show' => $this->makeTvMazeShow(['id' => 2])],
        ];

        $result = $this->normalizer->normalizeSearchResults($results);

        $this->assertCount(2, $result);
        $this->assertSame(1, $result[0]['external_id']);
        $this->assertSame(2, $result[1]['external_id']);
    }
}
