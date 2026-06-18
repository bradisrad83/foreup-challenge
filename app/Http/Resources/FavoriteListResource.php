<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FavoriteListResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'favorites_count' => $this->favorites_count ?? 0,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'favorites' => $this->whenLoaded(
                'favorites',
                fn () => FavoriteResource::collection($this->favorites),
            ),
        ];
    }
}
