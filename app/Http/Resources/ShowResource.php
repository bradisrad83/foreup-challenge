<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Renders the normalized show shape.
 *
 * The resource wraps an associative array (the normalized show) rather than
 * an Eloquent model, so we access fields via array syntax on $this->resource.
 */
class ShowResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $show = $this->resource;

        return [
            'external_id' => $show['external_id'],
            'name' => $show['name'],
            'image_url' => $show['image_url'],
            'summary' => $show['summary'],
            'premiered' => $show['premiered'],
            'ended' => $show['ended'],
            'status' => $show['status'],
            'genres' => $show['genres'] ?? [],
            'rating' => $show['rating'],
            'language' => $show['language'],
            'network' => $show['network'],
            'official_url' => $show['official_url'],
            'metadata' => $show['metadata'],
        ];
    }
}
