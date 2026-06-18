<?php

namespace Database\Factories;

use App\Models\Favorite;
use App\Models\FavoriteList;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Favorite>
 */
class FavoriteFactory extends Factory
{
    protected $model = Favorite::class;

    public function definition(): array
    {
        return [
            'favorite_list_id' => FavoriteList::factory(),
            'external_id' => $this->faker->unique()->numberBetween(1, 100000),
            'name' => $this->faker->words(3, true),
            'image_url' => $this->faker->optional()->imageUrl(),
            'summary' => $this->faker->optional()->paragraph(),
            'premiered' => $this->faker->optional()->date(),
            'ended' => $this->faker->optional()->date(),
            'status' => $this->faker->optional()->randomElement(['Running', 'Ended', 'In Development']),
            'genres' => $this->faker->optional()->randomElements(['Drama', 'Comedy', 'Thriller', 'Crime'], 2),
            'rating' => $this->faker->optional()->randomFloat(1, 1, 10),
            'language' => $this->faker->optional()->randomElement(['English', 'Spanish', 'French']),
            'network' => $this->faker->optional()->company(),
            'official_url' => $this->faker->optional()->url(),
            'metadata' => $this->faker->optional()->randomElement([
                ['runtime' => 60, 'show_type' => 'Scripted'],
                ['runtime' => 30, 'show_type' => 'Animation'],
            ]),
        ];
    }
}
