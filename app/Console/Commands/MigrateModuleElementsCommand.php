<?php

namespace App\Console\Commands;

use App\Services\ModuleService;
use Illuminate\Console\Command;

class MigrateModuleElementsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'module:migrate-elements';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create self-referencing elements for modules without any elements';

    /**
     * The module service instance.
     *
     * @var ModuleService
     */
    private ModuleService $moduleService;

    /**
     * Create a new command instance.
     *
     * @param ModuleService $moduleService
     * @return void
     */
    public function __construct(ModuleService $moduleService)
    {
        parent::__construct();
        $this->moduleService = $moduleService;
    }

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle(): int
    {
        $this->info('Processing modules without elements...');

        // Get all modules without elements
        $modules = $this->moduleService->getModulesWithoutElements();
        $totalModules = $modules->count();

        if ($totalModules === 0) {
            $this->info('No modules without elements found.');
            return self::SUCCESS;
        }

        $createdCount = 0;
        $errorCount = 0;

        // Create progress bar
        $progressBar = $this->output->createProgressBar($totalModules);
        $progressBar->start();

        // Process each module
        foreach ($modules as $module) {
            try {
                $wasCreated = $this->moduleService->ensureModuleHasElement($module);
                if ($wasCreated) {
                    $createdCount++;
                }
            } catch (\Exception $e) {
                $errorCount++;
                $this->error("\nError processing module {$module->code_module}: {$e->getMessage()}");
            }
            
            $progressBar->advance();
        }

        $progressBar->finish();
        $this->newLine(2);

        // Display summary
        $this->info("Created {$createdCount} self-referencing elements");
        
        if ($errorCount > 0) {
            $this->warn("Failed to process {$errorCount} modules");
        }

        $this->info('Migration completed successfully');

        return self::SUCCESS;
    }
}
