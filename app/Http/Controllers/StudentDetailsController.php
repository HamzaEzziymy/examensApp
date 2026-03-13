<?php

namespace App\Http\Controllers;

use App\Models\Etudiant;
use App\Models\InscriptionPedagogique;
use Illuminate\Http\Request;
use Inertia\Inertia;

class StudentDetailsController extends Controller
{
    /**
     * Display the student's complete profile with all academic information
     */
    public function show(string $id)
    {
        $student = Etudiant::with([
            'section.filiere',
            'inscriptionsAdministratives' => function ($query) {
                $query->orderBy('date_inscription', 'desc')
                    ->with(['anneeUniversitaire', 'niveau', 'section']);
            },
        ])->findOrFail($id);

        // Get pedagogical inscriptions directly through administrative inscriptions
        $adminInscriptionIds = $student->inscriptionsAdministratives->pluck('id_inscription_admin')->toArray();
        
        $pedInscriptions = InscriptionPedagogique::whereIn('id_inscription_admin', $adminInscriptionIds)
            ->with([
                'offreFormation.module',
                'offreFormation.section.filiere',
                'offreFormation.semestre.niveau',
            ])
            ->orderBy('created_at', 'desc')
            ->get();

        // Attach pedagogical inscriptions to student
        $student->inscriptionsPedagogiques = $pedInscriptions;

        // Calculate academic statistics
        $stats = $this->calculateAcademicStats($student);

        // Explicitly convert to array to ensure all relationships are included
        $studentData = $student->toArray();
        $studentData['inscriptionsAdministratives'] = $student->inscriptionsAdministratives->toArray();
        $studentData['inscriptionsPedagogiques'] = $pedInscriptions->toArray();

        return Inertia::render('GestionsEtudiantes/Etudiantes/Show', [
            'student' => $studentData,
            'stats' => $stats,
        ]);
    }

    /**
     * Calculate academic statistics for the student
     */
    private function calculateAcademicStats($student): array
    {
        $adminInscriptions = $student->inscriptionsAdministratives ?? [];
        $pedInscriptions = $student->inscriptionsPedagogiques ?? [];

        $totalCredits = collect($pedInscriptions)->sum('credits_acquis');
        $activeInscriptions = collect($adminInscriptions)->where('statut', 'Active')->count();
        $totalModules = count($pedInscriptions);

        return [
            'totalAdminInscriptions' => count($adminInscriptions),
            'activeInscriptions' => $activeInscriptions,
            'totalPedInscriptions' => $totalModules,
            'totalCreditsAcquired' => $totalCredits,
            'averageCreditsPerModule' => $totalModules > 0 ? round($totalCredits / $totalModules, 2) : 0,
        ];
    }
}
