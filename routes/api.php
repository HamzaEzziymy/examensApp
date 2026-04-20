<?php

use App\Http\Controllers\Api\PointageSyncController;
use Illuminate\Support\Facades\Route;

Route::prefix('pointage')
    ->name('api.pointage.')
    ->middleware('pointage.token')
    ->group(function () {
        Route::get('examens/{examen}/repartitions', [PointageSyncController::class, 'show'])
            ->name('repartitions.show');

        Route::match(['post', 'put', 'patch'], 'examens/{examen}/repartitions', [PointageSyncController::class, 'update'])
            ->name('repartitions.update');
    });
