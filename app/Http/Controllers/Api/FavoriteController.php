<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreFavoriteRequest;
use App\Http\Resources\FavoriteResource;
use App\Models\FavoriteList;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class FavoriteController extends Controller
{
    /**
     * POST /api/favorite-lists/{favoriteList}/favorites
     *
     * Saves a show snapshot to the list. Returns 409 if the show is already in
     * the list (duplicate external_id).
     */
    public function store(StoreFavoriteRequest $request, FavoriteList $favoriteList): JsonResponse
    {
        // Check for duplicate before attempting insert to return a clean 409.
        if ($favoriteList->favorites()->where('external_id', $request->input('external_id'))->exists()) {
            return response()->json(
                ['message' => 'This show is already in the list.'],
                409,
            );
        }

        try {
            $favorite = $favoriteList->favorites()->create($request->validated());
        } catch (UniqueConstraintViolationException) {
            // Race-condition backstop: the DB unique index caught a duplicate.
            return response()->json(
                ['message' => 'This show is already in the list.'],
                409,
            );
        }

        return (new FavoriteResource($favorite))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * DELETE /api/favorite-lists/{favoriteList}/favorites/{favorite}
     *
     * Removes a favorite from the list. The favorite is resolved scoped to the
     * list, so an unknown favorite — or one that belongs to a different list —
     * returns a 404 with "Favorite not found." (An unknown list is handled by
     * the route's missing() callback before reaching here.)
     */
    public function destroy(FavoriteList $favoriteList, string $favorite): Response|JsonResponse
    {
        $model = $favoriteList->favorites()->find($favorite);

        if ($model === null) {
            return response()->json(['message' => 'Favorite not found.'], 404);
        }

        $model->delete();

        return response()->noContent();
    }
}
