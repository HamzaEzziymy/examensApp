<?php

namespace App\Observers;

use App\Models\Module;
use App\Services\ModuleService;

class ModuleObserver
{
    /**
     * Create a new observer instance.
     */
    public function __construct(private ModuleService $moduleService)
    {
    }

    /**
     * Handle the Module "created" event.
     * 
     * Called after Module is successfully saved to database.
     * Creates a self-referencing element if the Module has no elements.
     *
     * @param Module $module
     * @return void
     */
    public function created(Module $module): void
    {
        // Check if Module has any elements and create self-referencing element if none exist
        $this->moduleService->ensureModuleHasElement($module);
    }
}
