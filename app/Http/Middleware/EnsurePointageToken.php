<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePointageToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $expectedToken = config('pointage.token');

        if (! is_string($expectedToken) || trim($expectedToken) === '') {
            return response()->json([
                'message' => 'Pointage API token is not configured.',
            ], 503);
        }

        $providedToken = $request->bearerToken() ?: $request->header('X-Pointage-Token');

        if (! is_string($providedToken) || ! hash_equals($expectedToken, $providedToken)) {
            return response()->json([
                'message' => 'Unauthorized.',
            ], 401);
        }

        return $next($request);
    }
}
