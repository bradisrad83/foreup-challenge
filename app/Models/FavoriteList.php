<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FavoriteList extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'normalized_name',
    ];

    /**
     * Normalize a display name to its canonical form for uniqueness checks.
     * Trims leading/trailing whitespace, lowercases, and collapses internal
     * whitespace runs to a single space.
     */
    public static function normalizeName(string $name): string
    {
        return preg_replace('/\s+/', ' ', mb_strtolower(trim($name)));
    }

    public function favorites(): HasMany
    {
        return $this->hasMany(Favorite::class);
    }
}
