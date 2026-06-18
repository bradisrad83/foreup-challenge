<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreFavoriteListRequest;
use App\Http\Resources\FavoriteListResource;
use App\Models\FavoriteList;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class FavoriteListController extends Controller
{
    /**
     * GET /api/favorite-lists
     *
     * Returns all lists ordered by name ascending, each with favorites_count.
     */
    public function index(): AnonymousResourceCollection
    {
        $lists = FavoriteList::withCount('favorites')
            ->orderBy('name')
            ->get();

        return FavoriteListResource::collection($lists);
    }

    /**
     * POST /api/favorite-lists
     *
     * Creates a new favorite list. Name uniqueness is enforced case-insensitively
     * via normalized_name (Form Request validates first; DB unique index backstops).
     */
    public function store(StoreFavoriteListRequest $request): JsonResponse
    {
        $name = $request->string('name')->trim()->value();

        $list = FavoriteList::create([
            'name' => $name,
            'normalized_name' => FavoriteList::normalizeName($name),
        ]);

        // Load favorites_count for the response (0 for a newly created list)
        $list->loadCount('favorites');

        return (new FavoriteListResource($list))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * GET /api/favorite-lists/{favoriteList}
     *
     * Returns one list with its favorites ordered by updated_at descending.
     */
    public function show(FavoriteList $favoriteList): FavoriteListResource
    {
        $favoriteList->loadCount('favorites');
        $favoriteList->load([
            'favorites' => fn ($q) => $q->orderByDesc('updated_at'),
        ]);

        return new FavoriteListResource($favoriteList);
    }

    /**
     * DELETE /api/favorite-lists/{favoriteList}
     *
     * Deletes a list and cascades to its favorites.
     */
    public function destroy(FavoriteList $favoriteList): Response
    {
        $favoriteList->delete();

        return response()->noContent();
    }
}
