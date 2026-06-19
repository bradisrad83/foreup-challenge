<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ShowIndexRequest;
use App\Http\Resources\ShowResource;
use App\Services\TvMaze\TvMazeClient;
use App\Services\TvMaze\TvMazeException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ShowController extends Controller
{
    public function __construct(
        private readonly TvMazeClient $tvMaze,
    ) {}

    /**
     * GET /api/shows
     *
     * Returns the initial unfiltered list when no search query is present,
     * or searches TVmaze when a non-empty search param is provided.
     */
    public function index(ShowIndexRequest $request): AnonymousResourceCollection|JsonResponse
    {
        $search = $request->string('search')->trim()->value();

        try {
            $shows = $search !== ''
                ? $this->tvMaze->searchShows($search)
                : $this->tvMaze->getShows();
        } catch (TvMazeException) {
            return response()->json(
                ['message' => 'The show service is temporarily unavailable. Please try again.'],
                502,
            );
        }

        return ShowResource::collection($shows);
    }
}
