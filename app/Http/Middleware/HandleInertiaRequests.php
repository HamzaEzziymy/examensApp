<?php

namespace App\Http\Middleware;

use App\Models\Faculte;
use App\Models\UserFiliereAnnee;
use Illuminate\Http\Request;
use Inertia\Middleware;
use App\Models\Filiere;
use App\Models\AnneeUniversitaire;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user(),
                // Load user's filieres and annees via pivot table; use load() on the model instance
                'user_filiere_annee' => $request->user() ? $request->user()->load(['filieres', 'anneesUniv']) : null,

            ],
            'filieres' => function () {
                return Filiere::orderBy('nom_filiere')->get();
            },
            'anneeUniv' => function () {
                return AnneeUniversitaire::all();
            },
            'faculte' => function () {
                return Faculte::first();
            }
        ];
    }
}
