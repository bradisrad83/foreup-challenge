<?php

namespace App\Providers;

use App\Services\TvMaze\ShowNormalizer;
use App\Services\TvMaze\TvMazeClient;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(TvMazeClient::class, function () {
            return new TvMazeClient(
                normalizer: new ShowNormalizer,
                baseUrl: config('services.tvmaze.base_url'),
                timeout: config('services.tvmaze.timeout'),
            );
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
