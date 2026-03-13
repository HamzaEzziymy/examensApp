<?php

namespace App\Providers;

use App\Models\Module;
use App\Observers\ModuleObserver;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);
        
        // Register ModuleObserver to automatically create self-referencing elements
        Module::observe(ModuleObserver::class);
    }
}
