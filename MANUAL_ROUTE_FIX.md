# Manual Route Addition Required

## Location
File: `routes/web.php`
After line 125 (after the `etudiants` resource definition in the `personnes` prefix group)

## Route to Add

```php
    // Bulk delete for students
    Route::post('etudiants/bulk-destroy', [EtudiantController::class, 'bulkDestroy'])
        ->name('etudiants.bulk-destroy');
```

## Full Context
The route should be added here:

```php
Route::prefix('personnes')->name('personnes.')->group(function () {
    Route::resources([
        'enseignants' => EnseignantController::class,
        'surveillants' => SurveillantController::class,
        'etudiants' => EtudiantController::class,
    ]);

    // ADD THIS ROUTE HERE:
    // Bulk delete for students
    Route::post('etudiants/bulk-destroy', [EtudiantController::class, 'bulkDestroy'])
        ->name('etudiants.bulk-destroy');

    // Pivot enseignant_module (assignations d'enseignants aux modules)
    Route::resource('enseignant-modules', EnseignantModuleController::class)
        ->only(['index', 'store', 'destroy']);
});
```

## Why This is Needed
This route enables the bulk delete functionality for students in the frontend. Without it, the bulk delete button will not work.

## Verification
After adding the route, run:
```bash
php artisan route:list --name=etudiants.bulk-destroy
```

You should see the route listed.
