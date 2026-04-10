<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
        ]);

        //
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (\Illuminate\Database\QueryException $e, $request) {
            $previous = $e->getPrevious();
            $isConnError = $previous instanceof \PDOException
                && in_array($previous->getCode(), ['2002', '1045', '1049', 'HY000']);

            if ($isConnError || str_contains($e->getMessage(), 'Connection refused')
                || str_contains($e->getMessage(), 'Access denied')
                || str_contains($e->getMessage(), 'Unknown database')) {

                if ($request->expectsJson() || $request->header('X-Inertia')) {
                    return response()->json([
                        'message' => 'Impossible de se connecter à la base de données. Veuillez réessayer plus tard.',
                    ], 503);
                }

                return response()->view('errors.db', [], 503);
            }
        });

        $exceptions->render(function (\PDOException $e, $request) {
            if ($request->expectsJson() || $request->header('X-Inertia')) {
                return response()->json([
                    'message' => 'Impossible de se connecter à la base de données. Veuillez réessayer plus tard.',
                ], 503);
            }
            return response()->view('errors.db', [], 503);
        });
    })->create();
