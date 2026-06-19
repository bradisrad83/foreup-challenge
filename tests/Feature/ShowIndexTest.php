<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Feature tests for GET /api/shows.
 *
 * All TVmaze HTTP calls are faked with Http::fake() — no live network calls.
 */
class ShowIndexTest extends TestCase
{
    // ---------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------

    /** Build a minimal TVmaze show object. */
    private function makeTvMazeShow(array $overrides = []): array
    {
        return array_merge([
            'id' => 169,
            'name' => 'Breaking Bad',
            'type' => 'Scripted',
            'language' => 'English',
            'genres' => ['Drama', 'Crime', 'Thriller'],
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
            'summary' => '<p>A chemistry teacher <b>diagnosed</b> with cancer.</p>',
        ], $overrides);
    }

    /** Wrap a show in TVmaze search result format { score, show }. */
    private function makeSearchResult(array $show, float $score = 1.0): array
    {
        return ['score' => $score, 'show' => $show];
    }

    // ---------------------------------------------------------------------------
    // Unfiltered / initial list (no search param)
    // ---------------------------------------------------------------------------

    public function test_returns_initial_list_when_no_search_param(): void
    {
        Http::fake([
            '*/shows*' => Http::response([$this->makeTvMazeShow()], 200),
        ]);

        $response = $this->getJson('/api/shows');

        $response->assertOk()
            ->assertJsonStructure(['data' => [['external_id', 'name']]]);
    }

    public function test_calls_tvmaze_shows_page_0_when_no_search(): void
    {
        Http::fake([
            '*/shows*' => Http::response([], 200),
        ]);

        $this->getJson('/api/shows');

        Http::assertSent(fn ($req) => str_contains($req->url(), '/shows') && $req['page'] == 0);
    }

    public function test_empty_search_param_returns_initial_list(): void
    {
        Http::fake([
            '*/shows*' => Http::response([], 200),
        ]);

        $response = $this->getJson('/api/shows?search=');

        $response->assertOk()->assertJson(['data' => []]);
    }

    public function test_whitespace_only_search_param_returns_initial_list(): void
    {
        Http::fake([
            '*/shows*' => Http::response([], 200),
        ]);

        // URL-encode the whitespace-only search value so the URI remains valid
        $response = $this->getJson('/api/shows?search='.urlencode('   '));

        $response->assertOk()->assertJson(['data' => []]);
        Http::assertSent(fn ($req) => str_contains($req->url(), '/shows'));
    }

    // ---------------------------------------------------------------------------
    // Search behavior
    // ---------------------------------------------------------------------------

    public function test_search_param_calls_tvmaze_search_endpoint(): void
    {
        Http::fake([
            '*/search/shows*' => Http::response([], 200),
        ]);

        $this->getJson('/api/shows?search=breaking');

        Http::assertSent(fn ($req) => str_contains($req->url(), '/search/shows'));
    }

    public function test_search_query_is_forwarded_to_tvmaze(): void
    {
        Http::fake([
            '*/search/shows*' => Http::response([], 200),
        ]);

        $this->getJson('/api/shows?search=breaking+bad');

        Http::assertSent(fn ($req) => $req['q'] === 'breaking bad');
    }

    public function test_search_with_no_matches_returns_empty_data_200(): void
    {
        Http::fake([
            '*/search/shows*' => Http::response([], 200),
        ]);

        $response = $this->getJson('/api/shows?search=xyznonexistent');

        $response->assertOk()->assertExactJson(['data' => []]);
    }

    // ---------------------------------------------------------------------------
    // Normalized JSON shape
    // ---------------------------------------------------------------------------

    public function test_response_has_correct_data_wrapper(): void
    {
        Http::fake([
            '*/search/shows*' => Http::response(
                [$this->makeSearchResult($this->makeTvMazeShow())],
                200,
            ),
        ]);

        $response = $this->getJson('/api/shows?search=breaking');

        $response->assertJsonStructure(['data']);
        $this->assertIsArray($response->json('data'));
    }

    public function test_normalized_show_has_all_documented_fields(): void
    {
        Http::fake([
            '*/search/shows*' => Http::response(
                [$this->makeSearchResult($this->makeTvMazeShow())],
                200,
            ),
        ]);

        $response = $this->getJson('/api/shows?search=breaking');

        $response->assertJsonStructure([
            'data' => [[
                'external_id',
                'name',
                'image_url',
                'summary',
                'premiered',
                'ended',
                'status',
                'genres',
                'rating',
                'language',
                'network',
                'official_url',
                'metadata',
            ]],
        ]);
    }

    public function test_normalized_show_values_are_correct(): void
    {
        Http::fake([
            '*/search/shows*' => Http::response(
                [$this->makeSearchResult($this->makeTvMazeShow())],
                200,
            ),
        ]);

        $response = $this->getJson('/api/shows?search=breaking');

        $show = $response->json('data.0');

        $this->assertSame(169, $show['external_id']);
        $this->assertSame('Breaking Bad', $show['name']);
        $this->assertSame('https://static.tvmaze.com/original/169.jpg', $show['image_url']);
        $this->assertSame('2008-01-20', $show['premiered']);
        $this->assertSame('2013-09-29', $show['ended']);
        $this->assertSame('Ended', $show['status']);
        $this->assertSame(['Drama', 'Crime', 'Thriller'], $show['genres']);
        $this->assertSame(9.2, $show['rating']);
        $this->assertSame('English', $show['language']);
        $this->assertSame('AMC', $show['network']);
        $this->assertSame('https://www.amc.com/shows/breaking-bad', $show['official_url']);
        $this->assertSame(['runtime' => 60, 'show_type' => 'Scripted'], $show['metadata']);
    }

    // ---------------------------------------------------------------------------
    // HTML stripping
    // ---------------------------------------------------------------------------

    public function test_summary_html_is_stripped_to_plain_text(): void
    {
        $show = $this->makeTvMazeShow(['summary' => '<p>A <b>chemistry</b> teacher &amp; cancer.</p>']);

        Http::fake([
            '*/search/shows*' => Http::response([$this->makeSearchResult($show)], 200),
        ]);

        $response = $this->getJson('/api/shows?search=breaking');

        $summary = $response->json('data.0.summary');
        $this->assertStringNotContainsString('<', $summary);
        $this->assertStringNotContainsString('>', $summary);
        $this->assertStringNotContainsString('&amp;', $summary);
        $this->assertStringContainsString('&', $summary); // entity decoded
        $this->assertStringContainsString('chemistry', $summary);
    }

    public function test_null_summary_remains_null(): void
    {
        $show = $this->makeTvMazeShow(['summary' => null]);

        Http::fake([
            '*/search/shows*' => Http::response([$this->makeSearchResult($show)], 200),
        ]);

        $response = $this->getJson('/api/shows?search=breaking');

        $this->assertNull($response->json('data.0.summary'));
    }

    // ---------------------------------------------------------------------------
    // Missing optional values
    // ---------------------------------------------------------------------------

    public function test_missing_image_becomes_null(): void
    {
        $show = $this->makeTvMazeShow(['image' => null]);

        Http::fake([
            '*/search/shows*' => Http::response([$this->makeSearchResult($show)], 200),
        ]);

        $response = $this->getJson('/api/shows?search=breaking');

        $this->assertNull($response->json('data.0.image_url'));
    }

    public function test_missing_genres_becomes_empty_array(): void
    {
        $show = $this->makeTvMazeShow(['genres' => []]);

        Http::fake([
            '*/search/shows*' => Http::response([$this->makeSearchResult($show)], 200),
        ]);

        $response = $this->getJson('/api/shows?search=breaking');

        $this->assertSame([], $response->json('data.0.genres'));
    }

    public function test_absent_genres_key_becomes_empty_array(): void
    {
        $show = $this->makeTvMazeShow();
        unset($show['genres']);

        Http::fake([
            '*/search/shows*' => Http::response([$this->makeSearchResult($show)], 200),
        ]);

        $response = $this->getJson('/api/shows?search=breaking');

        $this->assertSame([], $response->json('data.0.genres'));
    }

    public function test_missing_network_becomes_null(): void
    {
        $show = $this->makeTvMazeShow(['network' => null]);

        Http::fake([
            '*/search/shows*' => Http::response([$this->makeSearchResult($show)], 200),
        ]);

        $response = $this->getJson('/api/shows?search=breaking');

        $this->assertNull($response->json('data.0.network'));
    }

    public function test_missing_rating_becomes_null(): void
    {
        $show = $this->makeTvMazeShow(['rating' => ['average' => null]]);

        Http::fake([
            '*/search/shows*' => Http::response([$this->makeSearchResult($show)], 200),
        ]);

        $response = $this->getJson('/api/shows?search=breaking');

        $this->assertNull($response->json('data.0.rating'));
    }

    // ---------------------------------------------------------------------------
    // Result cap: never more than 100
    // ---------------------------------------------------------------------------

    public function test_results_capped_at_100(): void
    {
        $shows = array_map(
            fn ($i) => $this->makeSearchResult($this->makeTvMazeShow(['id' => $i, 'name' => "Show $i"])),
            range(1, 150),
        );

        Http::fake([
            '*/search/shows*' => Http::response($shows, 200),
        ]);

        $response = $this->getJson('/api/shows?search=show');

        $this->assertCount(100, $response->json('data'));
    }

    public function test_initial_list_capped_at_100(): void
    {
        $shows = array_map(
            fn ($i) => $this->makeTvMazeShow(['id' => $i, 'name' => "Show $i"]),
            range(1, 150),
        );

        Http::fake([
            '*/shows*' => Http::response($shows, 200),
        ]);

        $response = $this->getJson('/api/shows');

        $this->assertCount(100, $response->json('data'));
    }

    // ---------------------------------------------------------------------------
    // Caching
    // ---------------------------------------------------------------------------

    public function test_successful_initial_list_is_cached(): void
    {
        Http::fake([
            '*/shows*' => Http::response([$this->makeTvMazeShow()], 200),
        ]);

        $this->getJson('/api/shows');
        $this->getJson('/api/shows');

        // Should only send one upstream request (second served from cache)
        Http::assertSentCount(1);
    }

    public function test_successful_search_is_cached(): void
    {
        Http::fake([
            '*/search/shows*' => Http::response(
                [$this->makeSearchResult($this->makeTvMazeShow())],
                200,
            ),
        ]);

        $this->getJson('/api/shows?search=breaking');
        $this->getJson('/api/shows?search=breaking');

        Http::assertSentCount(1);
    }

    public function test_different_search_queries_are_cached_separately(): void
    {
        Http::fake([
            '*/search/shows*' => Http::response([], 200),
        ]);

        $this->getJson('/api/shows?search=breaking');
        $this->getJson('/api/shows?search=sopranos');

        Http::assertSentCount(2);
    }

    public function test_upstream_failure_is_not_cached(): void
    {
        // Use Http::sequence() to return different responses on successive calls
        // to the same URL: first call returns 503 (failure), second returns 200
        // (recovery). If the failure were cached, the second request would never
        // hit the sequence and would return 502 again.
        Http::fake([
            '*/shows*' => Http::sequence()
                ->push(null, 503)   // first upstream call: fail
                ->push([$this->makeTvMazeShow()], 200), // second upstream call: success
        ]);

        $this->getJson('/api/shows')->assertStatus(502);

        // Should make a new upstream request (no failure cached), so this succeeds
        $this->getJson('/api/shows')->assertOk();
    }

    // ---------------------------------------------------------------------------
    // Upstream failure — 502 response
    // ---------------------------------------------------------------------------

    public function test_upstream_non_success_returns_502(): void
    {
        Http::fake([
            '*/shows*' => Http::response(null, 503),
        ]);

        $response = $this->getJson('/api/shows');

        $response->assertStatus(502)
            ->assertJsonStructure(['message']);
    }

    public function test_upstream_failure_message_is_controlled(): void
    {
        Http::fake([
            '*/shows*' => Http::response(null, 500),
        ]);

        $response = $this->getJson('/api/shows');

        $this->assertSame(
            'The show service is temporarily unavailable. Please try again.',
            $response->json('message'),
        );
    }

    public function test_upstream_failure_does_not_expose_internal_details(): void
    {
        Http::fake([
            '*/shows*' => Http::response(['error' => 'internal db error'], 500),
        ]);

        $response = $this->getJson('/api/shows');

        $body = $response->json();
        $this->assertArrayNotHasKey('exception', $body);
        $this->assertArrayNotHasKey('trace', $body);
    }

    public function test_connection_failure_returns_502(): void
    {
        Http::fake([
            '*/shows*' => Http::failedConnection(),
        ]);

        $response = $this->getJson('/api/shows');

        $response->assertStatus(502);
    }

    // ---------------------------------------------------------------------------
    // Validation
    // ---------------------------------------------------------------------------

    public function test_search_param_over_255_chars_returns_422(): void
    {
        $response = $this->getJson('/api/shows?search='.str_repeat('a', 256));

        $response->assertStatus(422)
            ->assertJsonStructure(['message', 'errors' => ['search']]);
    }

    // ---------------------------------------------------------------------------
    // Both upstream shapes normalize to the same shape
    // ---------------------------------------------------------------------------

    public function test_initial_list_and_search_produce_same_shape(): void
    {
        $tvmazeShow = $this->makeTvMazeShow();

        // Both upstream shapes must normalize to the same output shape.
        // Use more-specific patterns: search/shows before shows to prevent overlap.
        Http::fake([
            '*/search/shows*' => Http::response([$this->makeSearchResult($tvmazeShow)], 200),
            '*/shows*' => Http::response([$tvmazeShow], 200),
        ]);

        $initialKeys = array_keys($this->getJson('/api/shows')->json('data.0'));
        $searchKeys = array_keys($this->getJson('/api/shows?search=breaking')->json('data.0'));

        sort($initialKeys);
        sort($searchKeys);
        $this->assertSame($initialKeys, $searchKeys);
    }
}
