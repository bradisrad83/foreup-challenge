<?php

namespace Tests\Feature;

use App\Models\Favorite;
use App\Models\FavoriteList;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Feature tests for GET /api/favorites/ids — the distinct external_ids of every
 * saved show across all lists (powers the "favorited" indicator).
 */
class FavoriteIdsTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_empty_array_when_no_favorites(): void
    {
        $this->getJson('/api/favorites/ids')
            ->assertOk()
            ->assertExactJson(['data' => []]);
    }

    public function test_returns_distinct_external_ids_across_all_lists(): void
    {
        $list1 = FavoriteList::factory()->create(['name' => 'A', 'normalized_name' => 'a']);
        $list2 = FavoriteList::factory()->create(['name' => 'B', 'normalized_name' => 'b']);

        Favorite::factory()->create(['favorite_list_id' => $list1->id, 'external_id' => 169]);
        Favorite::factory()->create(['favorite_list_id' => $list1->id, 'external_id' => 200]);
        // The same show (169) saved to a second list must appear only once.
        Favorite::factory()->create(['favorite_list_id' => $list2->id, 'external_id' => 169]);

        $response = $this->getJson('/api/favorites/ids');

        $response->assertOk();

        $ids = $response->json('data');
        sort($ids);
        $this->assertSame([169, 200], $ids);
    }
}
