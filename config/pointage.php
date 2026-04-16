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
];
