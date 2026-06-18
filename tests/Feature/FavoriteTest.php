<?php

namespace Tests\Feature;

use App\Models\Favorite;
use App\Models\FavoriteList;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Feature tests for favorites endpoints (within a list).
 *
 * Covers: POST /api/favorite-lists/{id}/favorites,
 *         DELETE /api/favorite-lists/{id}/favorites/{favoriteId}.
 *
 * No TVmaze calls are made in these tests (pure persistence phase).
 */
class FavoriteTest extends TestCase
{
    use RefreshDatabase;

    /** Minimal valid payload for adding a favorite. */
    private function favoritePayload(array $overrides = []): array
    {
        return array_merge([
            'external_id' => 169,
            'name' => 'Breaking Bad',
            'image_url' => 'https://example.com/img.jpg',
            'summary' => 'A chemistry teacher.',
            'premiered' => '2008-01-20',
            'ended' => '2013-09-29',
            'status' => 'Ended',
            'genres' => ['Drama', 'Crime'],
            'rating' => 9.2,
            'language' => 'English',
            'network' => 'AMC',
            'official_url' => 'https://www.amc.com',
            'metadata' => ['runtime' => 60, 'show_type' => 'Scripted'],
        ], $overrides);
    }

    private function makeList(string $name = 'My List'): FavoriteList
    {
        return FavoriteList::factory()->create([
            'name' => $name,
            'normalized_name' => FavoriteList::normalizeName($name),
        ]);
    }

    // -------------------------------------------------------------------------
    // POST /api/favorite-lists/{favoriteList}/favorites — store
    // -------------------------------------------------------------------------

    public function test_store_creates_favorite_and_returns_201(): void
    {
        $list = $this->makeList();

        $response = $this->postJson("/api/favorite-lists/{$list->id}/favorites", $this->favoritePayload());

        $response->assertCreated()
            ->assertJsonPath('data.external_id', 169)
            ->assertJsonPath('data.name', 'Breaking Bad')
            ->assertJsonPath('data.favorite_list_id', $list->id);
    }

    public function test_store_persists_snapshot_to_database(): void
    {
        $list = $this->makeList();

        $this->postJson("/api/favorite-lists/{$list->id}/favorites", $this->favoritePayload());

        $this->assertDatabaseHas('favorites', [
            'favorite_list_id' => $list->id,
            'external_id' => 169,
            'name' => 'Breaking Bad',
        ]);
    }

    public function test_store_response_has_all_snapshot_fields(): void
    {
        $list = $this->makeList();

        $response = $this->postJson("/api/favorite-lists/{$list->id}/favorites", $this->favoritePayload());

        $response->assertJsonStructure([
            'data' => [
                'id', 'favorite_list_id', 'external_id', 'name',
                'image_url', 'summary', 'premiered', 'ended',
                'status', 'genres', 'rating', 'language',
                'network', 'official_url', 'metadata',
                'created_at', 'updated_at',
            ],
        ]);
    }

    public function test_store_genres_cast_to_array(): void
    {
        $list = $this->makeList();

        $response = $this->postJson("/api/favorite-lists/{$list->id}/favorites", $this->favoritePayload([
            'genres' => ['Drama', 'Crime', 'Thriller'],
        ]));

        $this->assertSame(['Drama', 'Crime', 'Thriller'], $response->json('data.genres'));
    }

    public function test_store_metadata_cast_to_array(): void
    {
        $list = $this->makeList();

        $response = $this->postJson("/api/favorite-lists/{$list->id}/favorites", $this->favoritePayload([
            'metadata' => ['runtime' => 60, 'show_type' => 'Scripted'],
        ]));

        $this->assertSame(['runtime' => 60, 'show_type' => 'Scripted'], $response->json('data.metadata'));
    }

    public function test_store_date_fields_preserved_as_date_strings(): void
    {
        $list = $this->makeList();

        $response = $this->postJson("/api/favorite-lists/{$list->id}/favorites", $this->favoritePayload([
            'premiered' => '2008-01-20',
            'ended' => '2013-09-29',
        ]));

        $this->assertSame('2008-01-20', $response->json('data.premiered'));
        $this->assertSame('2013-09-29', $response->json('data.ended'));
    }

    public function test_store_rating_cast_to_float(): void
    {
        $list = $this->makeList();

        $this->postJson("/api/favorite-lists/{$list->id}/favorites", $this->favoritePayload([
            'rating' => 9,
        ]));

        // JSON cannot distinguish 9 (int) from 9.0 (float), so we verify the
        // Eloquent cast works by reading the record directly from the DB.
        $favorite = Favorite::where('external_id', 169)->first();
        $this->assertIsFloat($favorite->rating);
    }

    public function test_store_nullable_fields_accepted_as_null(): void
    {
        $list = $this->makeList();

        $payload = [
            'external_id' => 200,
            'name' => 'Minimal Show',
            'image_url' => null,
            'summary' => null,
            'premiered' => null,
            'ended' => null,
            'status' => null,
            'genres' => null,
            'rating' => null,
            'language' => null,
            'network' => null,
            'official_url' => null,
            'metadata' => null,
        ];

        $response = $this->postJson("/api/favorite-lists/{$list->id}/favorites", $payload);

        $response->assertCreated();
        $this->assertNull($response->json('data.image_url'));
        $this->assertNull($response->json('data.summary'));
    }

    public function test_store_only_required_fields_succeeds(): void
    {
        $list = $this->makeList();

        $response = $this->postJson("/api/favorite-lists/{$list->id}/favorites", [
            'external_id' => 300,
            'name' => 'Minimal Show',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.external_id', 300)
            ->assertJsonPath('data.name', 'Minimal Show');
    }

    public function test_store_missing_external_id_returns_422(): void
    {
        $list = $this->makeList();

        $response = $this->postJson("/api/favorite-lists/{$list->id}/favorites", [
            'name' => 'Breaking Bad',
        ]);

        $response->assertUnprocessable()
            ->assertJsonStructure(['message', 'errors' => ['external_id']]);
    }

    public function test_store_missing_name_returns_422(): void
    {
        $list = $this->makeList();

        $response = $this->postJson("/api/favorite-lists/{$list->id}/favorites", [
            'external_id' => 169,
        ]);

        $response->assertUnprocessable()
            ->assertJsonStructure(['message', 'errors' => ['name']]);
    }

    public function test_store_duplicate_external_id_in_same_list_returns_409(): void
    {
        $list = $this->makeList();
        $this->postJson("/api/favorite-lists/{$list->id}/favorites", $this->favoritePayload());

        $response = $this->postJson("/api/favorite-lists/{$list->id}/favorites", $this->favoritePayload());

        $response->assertStatus(409)
            ->assertJsonPath('message', 'This show is already in the list.');
    }

    public function test_store_same_external_id_in_different_list_is_allowed(): void
    {
        $list1 = $this->makeList('List One');
        $list2 = $this->makeList('List Two');

        $this->postJson("/api/favorite-lists/{$list1->id}/favorites", $this->favoritePayload())->assertCreated();
        $this->postJson("/api/favorite-lists/{$list2->id}/favorites", $this->favoritePayload())->assertCreated();
    }

    public function test_store_unknown_list_returns_404(): void
    {
        $response = $this->postJson('/api/favorite-lists/9999/favorites', $this->favoritePayload());

        $response->assertNotFound()
            ->assertJsonPath('message', 'Favorite list not found.');
    }

    // -------------------------------------------------------------------------
    // DELETE /api/favorite-lists/{favoriteList}/favorites/{favorite} — destroy
    // -------------------------------------------------------------------------

    public function test_destroy_returns_204(): void
    {
        $list = $this->makeList();
        $favorite = Favorite::factory()->create(['favorite_list_id' => $list->id]);

        $response = $this->deleteJson("/api/favorite-lists/{$list->id}/favorites/{$favorite->id}");

        $response->assertNoContent();
    }

    public function test_destroy_removes_favorite_from_database(): void
    {
        $list = $this->makeList();
        $favorite = Favorite::factory()->create(['favorite_list_id' => $list->id]);

        $this->deleteJson("/api/favorite-lists/{$list->id}/favorites/{$favorite->id}");

        $this->assertDatabaseMissing('favorites', ['id' => $favorite->id]);
    }

    public function test_destroy_unknown_favorite_returns_404(): void
    {
        $list = $this->makeList();

        $response = $this->deleteJson("/api/favorite-lists/{$list->id}/favorites/9999");

        $response->assertNotFound()
            ->assertJsonPath('message', 'Favorite not found.');
    }

    public function test_destroy_unknown_list_returns_404(): void
    {
        $list = $this->makeList();
        $favorite = Favorite::factory()->create(['favorite_list_id' => $list->id]);

        $response = $this->deleteJson("/api/favorite-lists/9999/favorites/{$favorite->id}");

        // The unknown {favoriteList} binding fails first → list-not-found message.
        $response->assertNotFound()
            ->assertJsonPath('message', 'Favorite list not found.');
    }

    public function test_destroy_favorite_not_belonging_to_list_returns_404(): void
    {
        $list1 = $this->makeList('List One');
        $list2 = $this->makeList('List Two');
        $favoriteInList2 = Favorite::factory()->create(['favorite_list_id' => $list2->id]);

        // Try to delete a favorite from list1, but the favorite belongs to list2.
        // The list resolves, but the favorite is not in it → favorite-not-found.
        $response = $this->deleteJson("/api/favorite-lists/{$list1->id}/favorites/{$favoriteInList2->id}");

        $response->assertNotFound()
            ->assertJsonPath('message', 'Favorite not found.');
    }

    public function test_destroy_does_not_delete_favorite_belonging_to_other_list(): void
    {
        $list1 = $this->makeList('List One');
        $list2 = $this->makeList('List Two');
        $favoriteInList2 = Favorite::factory()->create(['favorite_list_id' => $list2->id]);

        $this->deleteJson("/api/favorite-lists/{$list1->id}/favorites/{$favoriteInList2->id}");

        // The favorite must still exist in list2
        $this->assertDatabaseHas('favorites', ['id' => $favoriteInList2->id]);
    }

    // -------------------------------------------------------------------------
    // Data persistence
    // -------------------------------------------------------------------------

    public function test_data_persists_across_requests(): void
    {
        $list = $this->makeList();
        $this->postJson("/api/favorite-lists/{$list->id}/favorites", $this->favoritePayload());

        $response = $this->getJson("/api/favorite-lists/{$list->id}");

        $this->assertCount(1, $response->json('data.favorites'));
        $this->assertSame(169, $response->json('data.favorites.0.external_id'));
        $this->assertSame('Breaking Bad', $response->json('data.favorites.0.name'));
    }
}
