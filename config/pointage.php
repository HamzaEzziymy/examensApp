<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Pointage API Token
    |--------------------------------------------------------------------------
    |
    | Shared secret used by the external pointage application. Requests may send
    | it with either "Authorization: Bearer <token>" or "X-Pointage-Token".
    |
    */

    'token' => env('POINTAGE_API_TOKEN'),

    /*
    |--------------------------------------------------------------------------
    | External Pointage Push Target
    |--------------------------------------------------------------------------
    |
    | URL and optional bearer token used when the repartition screen pushes an
    | exam payload to the external pointage application.
    |
    */

    'external_url' => env('POINTAGE_EXTERNAL_URL'),
    'external_token' => env('POINTAGE_EXTERNAL_TOKEN'),
    'external_timeout' => (int) env('POINTAGE_EXTERNAL_TIMEOUT', 15),
];
