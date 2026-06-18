<?php

use App\Http\Controllers\Api\FavoriteController;
use App\Http\Controllers\Api\FavoriteListController;
use App\Http\Controllers\Api\ShowController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Routes here are loaded under the "/api" prefix.
|
*/

Route::get('/shows', [ShowController::class, 'index']);

// Returned when the {favoriteList} route-model binding cannot be resolved.
$favoriteListMissing = fn () => response()->json(['message' => 'Favorite list not found.'], 404);

Route::get('/favorite-lists', [FavoriteListController::class, 'index']);
Route::post('/favorite-lists', [FavoriteListController::class, 'store']);
Route::get('/favorite-lists/{favoriteList}', [FavoriteListController::class, 'show'])->missing($favoriteListMissing);
Route::delete('/favorite-lists/{favoriteList}', [FavoriteListController::class, 'destroy'])->missing($favoriteListMissing);

Route::post('/favorite-lists/{favoriteList}/favorites', [FavoriteController::class, 'store'])->missing($favoriteListMissing);
Route::delete('/favorite-lists/{favoriteList}/favorites/{favorite}', [FavoriteController::class, 'destroy'])->missing($favoriteListMissing);
