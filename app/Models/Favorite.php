<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Favorite extends Model
{
    use HasFactory;

    protected $fillable = [
        'favorite_list_id',
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
    ];

    protected $casts = [
        'genres' => 'array',
        'metadata' => 'array',
        'premiered' => 'date',
        'ended' => 'date',
        'rating' => 'float',
    ];

    public function favoriteList(): BelongsTo
    {
        return $this->belongsTo(FavoriteList::class);
    }
}
