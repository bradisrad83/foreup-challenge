<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FavoriteResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'favorite_list_id' => $this->favorite_list_id,
            'external_id' => $this->external_id,
            'name' => $this->name,
            'image_url' => $this->image_url,
            'summary' => $this->summary,
            'premiered' => $this->premiered?->toDateString(),
            'ended' => $this->ended?->toDateString(),
            'status' => $this->status,
            'genres' => $this->genres ?? [],
            'rating' => $this->rating,
            'language' => $this->language,
            'network' => $this->network,
            'official_url' => $this->official_url,
            'metadata' => $this->metadata,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
