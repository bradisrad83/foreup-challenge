<?php

namespace Database\Factories;

use App\Models\FavoriteList;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<FavoriteList>
 */
class FavoriteListFactory extends Factory
{
    protected $model = FavoriteList::class;

    public function definition(): array
    {
        $name = $this->faker->unique()->words(3, true);

        return [
            'name' => ucwords($name),
            'normalized_name' => FavoriteList::normalizeName($name),
        ];
    }
}
