<?php

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
