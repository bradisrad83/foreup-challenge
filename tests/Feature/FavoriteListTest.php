<?php

namespace Tests\Feature;

use App\Models\Favorite;
use App\Models\FavoriteList;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Feature tests for favorite-list endpoints.
 *
 * Covers: GET /api/favorite-lists, POST /api/favorite-lists,
 * GET /api/favorite-lists/{id}, DELETE /api/favorite-lists/{id}.
 *
 * No TVmaze calls are made in these tests (pure persistence phase).
 */
class FavoriteListTest extends TestCase
{
    use RefreshDatabase;

    // -------------------------------------------------------------------------
    // GET /api/favorite-lists — index
    // -------------------------------------------------------------------------

    public function test_index_returns_200_with_data_wrapper(): void
    {
        $response = $this->getJson('/api/favorite-lists');

        $response->assertOk()
            ->assertJsonStructure(['data']);
    }

    public function test_index_returns_empty_array_when_no_lists(): void
    {
        $response = $this->getJson('/api/favorite-lists');

        $response->assertOk()
            ->assertExactJson(['data' => []]);
    }

    public function test_index_returns_lists_ordered_by_name_ascending(): void
    {
        FavoriteList::factory()->create(['name' => 'Zebra Shows', 'normalized_name' => 'zebra shows']);
        FavoriteList::factory()->create(['name' => 'Alpha Shows', 'normalized_name' => 'alpha shows']);
        FavoriteList::factory()->create(['name' => 'Mango Shows', 'normalized_name' => 'mango shows']);

        $response = $this->getJson('/api/favorite-lists');

        $names = $response->json('data.*.name');
        $this->assertSame(['Alpha Shows', 'Mango Shows', 'Zebra Shows'], $names);
    }

    public function test_index_includes_favorites_count_for_each_list(): void
    {
        $list = FavoriteList::factory()->create(['name' => 'My List', 'normalized_name' => 'my list']);
        Favorite::factory()->count(3)->create(['favorite_list_id' => $list->id]);

        $response = $this->getJson('/api/favorite-lists');

        $this->assertSame(3, $response->json('data.0.favorites_count'));
    }

    public function test_index_returns_zero_count_for_empty_list(): void
    {
        FavoriteList::factory()->create(['name' => 'Empty List', 'normalized_name' => 'empty list']);

        $response = $this->getJson('/api/favorite-lists');

        $this->assertSame(0, $response->json('data.0.favorites_count'));
    }

    public function test_index_response_has_expected_fields(): void
    {
        FavoriteList::factory()->create(['name' => 'My List', 'normalized_name' => 'my list']);

        $response = $this->getJson('/api/favorite-lists');

        $response->assertJsonStructure([
            'data' => [[
                'id',
                'name',
                'favorites_count',
                'created_at',
                'updated_at',
            ]],
        ]);
    }

    public function test_index_does_not_expose_normalized_name(): void
    {
        FavoriteList::factory()->create(['name' => 'My List', 'normalized_name' => 'my list']);

        $response = $this->getJson('/api/favorite-lists');

        $this->assertArrayNotHasKey('normalized_name', $response->json('data.0'));
    }

    // -------------------------------------------------------------------------
    // POST /api/favorite-lists — store
    // -------------------------------------------------------------------------

    public function test_store_creates_list_and_returns_201(): void
    {
        $response = $this->postJson('/api/favorite-lists', ['name' => 'Weeknight Watching']);

        $response->assertCreated()
            ->assertJsonPath('data.name', 'Weeknight Watching')
            ->assertJsonPath('data.favorites_count', 0);

        $this->assertDatabaseHas('favorite_lists', ['name' => 'Weeknight Watching']);
    }

    public function test_store_persists_trimmed_name(): void
    {
        $response = $this->postJson('/api/favorite-lists', ['name' => '  My Shows  ']);

        $response->assertCreated()
            ->assertJsonPath('data.name', 'My Shows');

        $this->assertDatabaseHas('favorite_lists', ['name' => 'My Shows']);
    }

    public function test_store_persists_normalized_name(): void
    {
        $this->postJson('/api/favorite-lists', ['name' => 'Weeknight Watching']);

        $this->assertDatabaseHas('favorite_lists', ['normalized_name' => 'weeknight watching']);
    }

    public function test_store_response_includes_expected_fields(): void
    {
        $response = $this->postJson('/api/favorite-lists', ['name' => 'My List']);

        $response->assertCreated()
            ->assertJsonStructure([
                'data' => ['id', 'name', 'favorites_count', 'created_at', 'updated_at'],
            ]);
    }

    public function test_store_missing_name_returns_422(): void
    {
        $response = $this->postJson('/api/favorite-lists', []);

        $response->assertUnprocessable()
            ->assertJsonStructure(['message', 'errors' => ['name']]);
    }

    public function test_store_empty_name_returns_422(): void
    {
        $response = $this->postJson('/api/favorite-lists', ['name' => '']);

        $response->assertUnprocessable()
            ->assertJsonStructure(['message', 'errors' => ['name']]);
    }

    public function test_store_whitespace_only_name_returns_422(): void
    {
        $response = $this->postJson('/api/favorite-lists', ['name' => '   ']);

        $response->assertUnprocessable()
            ->assertJsonStructure(['message', 'errors' => ['name']]);
    }

    public function test_store_name_over_255_chars_returns_422(): void
    {
        $response = $this->postJson('/api/favorite-lists', ['name' => str_repeat('a', 256)]);

        $response->assertUnprocessable()
            ->assertJsonStructure(['message', 'errors' => ['name']]);
    }

    public function test_store_exact_duplicate_name_returns_422_with_errors_name(): void
    {
        FavoriteList::factory()->create(['name' => 'My List', 'normalized_name' => 'my list']);

        $response = $this->postJson('/api/favorite-lists', ['name' => 'My List']);

        $response->assertUnprocessable()
            ->assertJsonPath('errors.name.0', 'A list with this name already exists.');
    }

    public function test_store_case_insensitive_duplicate_returns_422(): void
    {
        FavoriteList::factory()->create(['name' => 'My List', 'normalized_name' => 'my list']);

        $response = $this->postJson('/api/favorite-lists', ['name' => 'MY LIST']);

        $response->assertUnprocessable()
            ->assertJsonPath('errors.name.0', 'A list with this name already exists.');
    }

    public function test_store_duplicate_message_matches_contract(): void
    {
        FavoriteList::factory()->create(['name' => 'My List', 'normalized_name' => 'my list']);

        $response = $this->postJson('/api/favorite-lists', ['name' => 'my list']);

        $response->assertUnprocessable()
            ->assertJsonPath('message', 'A list with this name already exists.');
    }

    public function test_store_allows_same_name_trimmed_and_collapsed(): void
    {
        // "weeknight  watching" normalizes the same as "Weeknight Watching"
        FavoriteList::factory()->create(['name' => 'Weeknight Watching', 'normalized_name' => 'weeknight watching']);

        $response = $this->postJson('/api/favorite-lists', ['name' => 'WEEKNIGHT  WATCHING']);

        $response->assertUnprocessable()
            ->assertJsonPath('errors.name.0', 'A list with this name already exists.');
    }

    // -------------------------------------------------------------------------
    // GET /api/favorite-lists/{favoriteList} — show
    // -------------------------------------------------------------------------

    public function test_show_returns_200_with_list_data(): void
    {
        $list = FavoriteList::factory()->create(['name' => 'My List', 'normalized_name' => 'my list']);

        $response = $this->getJson("/api/favorite-lists/{$list->id}");

        $response->assertOk()
            ->assertJsonPath('data.id', $list->id)
            ->assertJsonPath('data.name', 'My List');
    }

    public function test_show_includes_favorites_array(): void
    {
        $list = FavoriteList::factory()->create(['name' => 'My List', 'normalized_name' => 'my list']);

        $response = $this->getJson("/api/favorite-lists/{$list->id}");

        $response->assertOk()
            ->assertJsonStructure(['data' => ['favorites']]);
        $this->assertIsArray($response->json('data.favorites'));
    }

    public function test_show_includes_favorites_count(): void
    {
        $list = FavoriteList::factory()->create(['name' => 'My List', 'normalized_name' => 'my list']);
        Favorite::factory()->count(2)->create(['favorite_list_id' => $list->id]);

        $response = $this->getJson("/api/favorite-lists/{$list->id}");

        $response->assertOk()
            ->assertJsonPath('data.favorites_count', 2);
    }

    public function test_show_favorites_ordered_by_updated_at_descending(): void
    {
        $list = FavoriteList::factory()->create(['name' => 'My List', 'normalized_name' => 'my list']);

        $oldest = Favorite::factory()->create([
            'favorite_list_id' => $list->id,
            'external_id' => 1,
            'name' => 'Show Oldest',
            'updated_at' => now()->subDays(2),
        ]);

        $newest = Favorite::factory()->create([
            'favorite_list_id' => $list->id,
            'external_id' => 2,
            'name' => 'Show Newest',
            'updated_at' => now(),
        ]);

        $middle = Favorite::factory()->create([
            'favorite_list_id' => $list->id,
            'external_id' => 3,
            'name' => 'Show Middle',
            'updated_at' => now()->subDay(),
        ]);

        $response = $this->getJson("/api/favorite-lists/{$list->id}");

        $ids = $response->json('data.favorites.*.id');
        $this->assertSame([$newest->id, $middle->id, $oldest->id], $ids);
    }

    public function test_show_unknown_id_returns_404(): void
    {
        $response = $this->getJson('/api/favorite-lists/9999');

        $response->assertNotFound()
            ->assertJsonPath('message', 'Favorite list not found.');
    }

    public function test_show_response_structure(): void
    {
        $list = FavoriteList::factory()->create(['name' => 'My List', 'normalized_name' => 'my list']);

        $response = $this->getJson("/api/favorite-lists/{$list->id}");

        $response->assertJsonStructure([
            'data' => [
                'id', 'name', 'favorites_count',
                'created_at', 'updated_at', 'favorites',
            ],
        ]);
    }

    // -------------------------------------------------------------------------
    // DELETE /api/favorite-lists/{favoriteList} — destroy
    // -------------------------------------------------------------------------

    public function test_destroy_returns_204(): void
    {
        $list = FavoriteList::factory()->create(['name' => 'My List', 'normalized_name' => 'my list']);

        $response = $this->deleteJson("/api/favorite-lists/{$list->id}");

        $response->assertNoContent();
    }

    public function test_destroy_removes_list_from_database(): void
    {
        $list = FavoriteList::factory()->create(['name' => 'My List', 'normalized_name' => 'my list']);

        $this->deleteJson("/api/favorite-lists/{$list->id}");

        $this->assertDatabaseMissing('favorite_lists', ['id' => $list->id]);
    }

    public function test_destroy_cascades_to_favorites(): void
    {
        $list = FavoriteList::factory()->create(['name' => 'My List', 'normalized_name' => 'my list']);
        $favorite = Favorite::factory()->create(['favorite_list_id' => $list->id]);

        $this->deleteJson("/api/favorite-lists/{$list->id}");

        $this->assertDatabaseMissing('favorites', ['id' => $favorite->id]);
    }

    public function test_destroy_unknown_id_returns_404(): void
    {
        $response = $this->deleteJson('/api/favorite-lists/9999');

        $response->assertNotFound()
            ->assertJsonPath('message', 'Favorite list not found.');
    }
}
