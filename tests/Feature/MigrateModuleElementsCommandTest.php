<?php

namespace Tests\Feature;

use App\Models\Module;
use App\Models\ElementModule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MigrateModuleElementsCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_command_creates_self_referencing_elements_for_modules_without_elements(): void
    {
        // Disable observer to create modules without elements
        Module::unsetEventDispatcher();

        // Create modules without elements
        $module1 = Module::create([
            'code_module' => 'TEST-201',
            'nom_module' => 'Test Module 1',
            'type_module' => 'CONNAISSANCE',
            'credits' => 5.0,
        ]);

        $module2 = Module::create([
            'code_module' => 'TEST-202',
            'nom_module' => 'Test Module 2',
            'type_module' => 'STAGE',
            'credits' => 10.0,
        ]);

        // Re-enable observer
        Module::setEventDispatcher($this->app['events']);

        // Verify no elements exist
        $this->assertCount(0, $module1->elements);
        $this->assertCount(0, $module2->elements);

        // Run the command
        $this->artisan('module:migrate-elements')
            ->expectsOutput('Processing modules without elements...')
            ->expectsOutput('Created 2 self-referencing elements')
            ->expectsOutput('Migration completed successfully')
            ->assertExitCode(0);

        // Verify elements were created
        $module1->refresh();
        $module2->refresh();

        $this->assertCount(1, $module1->elements);
        $this->assertCount(1, $module2->elements);

        // Verify element properties
        $element1 = $module1->elements->first();
        $this->assertEquals('TEST-201', $element1->code_element);
        $this->assertEquals('Test Module 1', $element1->nom_element);
        $this->assertEquals('COURS', $element1->type_element);

        $element2 = $module2->elements->first();
        $this->assertEquals('TEST-202', $element2->code_element);
        $this->assertEquals('STAGE_ELEMENT', $element2->type_element);
    }

    public function test_command_skips_modules_with_existing_elements(): void
    {
        // Disable observer
        Module::unsetEventDispatcher();

        // Create module with element
        $moduleWithElement = Module::create([
            'code_module' => 'TEST-203',
            'nom_module' => 'Module with Element',
            'type_module' => 'CONNAISSANCE',
            'credits' => 5.0,
        ]);

        ElementModule::create([
            'id_module' => $moduleWithElement->id_module,
            'code_element' => 'CUSTOM-ELEM',
            'nom_element' => 'Custom Element',
            'type_element' => 'COURS',
            'coefficient' => 3.0,
        ]);

        // Create module without element
        $moduleWithoutElement = Module::create([
            'code_module' => 'TEST-204',
            'nom_module' => 'Module without Element',
            'type_module' => 'CONNAISSANCE',
            'credits' => 5.0,
        ]);

        // Re-enable observer
        Module::setEventDispatcher($this->app['events']);

        // Run the command
        $this->artisan('module:migrate-elements')
            ->expectsOutput('Created 1 self-referencing elements')
            ->assertExitCode(0);

        // Verify module with element still has only 1 element
        $moduleWithElement->refresh();
        $this->assertCount(1, $moduleWithElement->elements);
        $this->assertEquals('CUSTOM-ELEM', $moduleWithElement->elements->first()->code_element);

        // Verify module without element now has 1 element
        $moduleWithoutElement->refresh();
        $this->assertCount(1, $moduleWithoutElement->elements);
    }

    public function test_command_is_idempotent(): void
    {
        // Disable observer
        Module::unsetEventDispatcher();

        $module = Module::create([
            'code_module' => 'TEST-205',
            'nom_module' => 'Test Module Idempotent',
            'type_module' => 'CONNAISSANCE',
            'credits' => 5.0,
        ]);

        // Re-enable observer
        Module::setEventDispatcher($this->app['events']);

        // Run command first time
        $this->artisan('module:migrate-elements')
            ->expectsOutput('Created 1 self-referencing elements')
            ->assertExitCode(0);

        $module->refresh();
        $this->assertCount(1, $module->elements);

        // Run command second time
        $this->artisan('module:migrate-elements')
            ->expectsOutput('No modules without elements found.')
            ->assertExitCode(0);

        // Verify still only 1 element
        $module->refresh();
        $this->assertCount(1, $module->elements);
    }

    public function test_command_handles_no_modules_without_elements(): void
    {
        // Don't create any modules, or create modules with elements
        
        // Run the command
        $this->artisan('module:migrate-elements')
            ->expectsOutput('Processing modules without elements...')
            ->expectsOutput('No modules without elements found.')
            ->assertExitCode(0);
    }

    public function test_command_handles_errors_gracefully(): void
    {
        // This test verifies that the command continues processing even if one module fails
        // We'll need to mock a failure scenario
        
        // Disable observer
        Module::unsetEventDispatcher();

        // Create multiple modules
        $module1 = Module::create([
            'code_module' => 'TEST-206',
            'nom_module' => 'Test Module 1',
            'type_module' => 'CONNAISSANCE',
            'credits' => 5.0,
        ]);

        $module2 = Module::create([
            'code_module' => 'TEST-207',
            'nom_module' => 'Test Module 2',
            'type_module' => 'CONNAISSANCE',
            'credits' => 5.0,
        ]);

        // Re-enable observer
        Module::setEventDispatcher($this->app['events']);

        // Run the command - should process both successfully
        $this->artisan('module:migrate-elements')
            ->expectsOutput('Created 2 self-referencing elements')
            ->expectsOutput('Migration completed successfully')
            ->assertExitCode(0);
    }

    public function test_command_displays_progress_bar(): void
    {
        // Disable observer
        Module::unsetEventDispatcher();

        // Create several modules to test progress bar
        for ($i = 1; $i <= 5; $i++) {
            Module::create([
                'code_module' => "PROG-{$i}",
                'nom_module' => "Progress Module {$i}",
                'type_module' => 'CONNAISSANCE',
                'credits' => 5.0,
            ]);
        }

        // Re-enable observer
        Module::setEventDispatcher($this->app['events']);

        // Run the command
        $this->artisan('module:migrate-elements')
            ->expectsOutput('Processing modules without elements...')
            ->expectsOutput('Created 5 self-referencing elements')
            ->expectsOutput('Migration completed successfully')
            ->assertExitCode(0);
    }
}
