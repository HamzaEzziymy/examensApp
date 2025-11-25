<?php

use App\Http\Controllers\FaculteController;
use App\Http\Controllers\OffreFormationController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\SectionController;
use App\Models\Section;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\{
    // Académique
    AnneeUniversitaireController,
    FiliereController,
    NiveauController,
    SemestreController,
    ModuleController,
    ElementModuleController,
    // Personnes
    EnseignantController,
    SurveillantController,
    EtudiantController,
    EnseignantModuleController,
    // Inscriptions
    InscriptionAdministrativeController,
    InscriptionPedagogiqueController,
    CapitalisationController,
    StageController,
    // Examens
    SalleController,
    SessionExamenController,
    ExamenController,
    SujetExamenController,
    GrilleCorrectionController,
    TirageExamenController,
    // Surveillance / salle d’exam
    SurveillanceController,
    AnonymatController,
    RepartitionEtudiantController,
    AbsenceController,
    IncidentExamenController,
    PvExamenController,
    // Correction & résultats
    CorrecteurController,
    NoteController,
    ResultatElementController,
    ResultatModuleController,
    // Commissions & réclamations
    CommissionController,
    MembreCommissionController,
    DeliberationController,
    ReclamationController,
    DecisionCommissionController
};

use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken as MiddlewareVerifyCsrfToken;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

//dashboard route
Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

//profile routes
Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});


//docs routes
Route::middleware('auth')->group(function () {
    Route::get('/documents/proces-v', [DocumentController::class, 'indexPv'])->name('proces-v');
    Route::post('/documents/proces-v', [DocumentController::class, 'storePv'])->name('proces-v.store');
    Route::post('/documents/{document}', [DocumentController::class, 'destroyPv'])->name('documents.destroy');
});


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
Route::withoutMiddleware([MiddlewareVerifyCsrfToken::class])->group(function () {

    Route::prefix('configuration')->name('configuration.')->group(function () {
        Route::resources([
            'faculte' => FaculteController::class,
            'annees-universitaires' => AnneeUniversitaireController::class,
        ]);
    });
});


Route::withoutMiddleware([MiddlewareVerifyCsrfToken::class])->group(function () {

    Route::prefix('academique')->name('academique.')->group(function () {
        Route::resources([
            'niveaux' => NiveauController::class,
            'semestres' => SemestreController::class,
            'modules' => ModuleController::class,
            'elements-module' => ElementModuleController::class,
            'filieres' => FiliereController::class,
            'sections' => SectionController::class,
            'offres-formations' => OffreFormationController::class, // offre_formation
        ]);
    });
});
/* =========================
|  Personnes (Enseignants, Surveillants, Étudiants)
|=========================*/
Route::prefix('personnes')->name('personnes.')->group(function () {
    Route::resources([
        'enseignants' => EnseignantController::class,
        'surveillants' => SurveillantController::class,
        'etudiants' => EtudiantController::class,
    ]);

    // Pivot enseignant_module (assignations d’enseignants aux modules)
    Route::resource('enseignant-modules', EnseignantModuleController::class)
        ->only(['index', 'store', 'destroy']);
});

/* =========================
|  Inscriptions & Stages
|=========================*/
Route::prefix('inscriptions')->name('inscriptions.')->group(function () {
    Route::resources([
        'etudiants' => EtudiantController::class,
        'administratives' => InscriptionAdministrativeController::class, // inscriptions_administratives
        'pedagogiques' => InscriptionPedagogiqueController::class,    // inscriptions_pedagogiques
        'capitalisations' => CapitalisationController::class,
        'stages' => StageController::class,
    ]);
});

/* =========================
|  Examens (Sessions, Salles, Examens)
|=========================*/
Route::prefix('examens')->name('examens.')->group(function () {
    Route::resources([
        'salles' => SalleController::class,
        'sessions' => SessionExamenController::class, // sessions_examen
        'examens' => ExamenController::class,
        'sujets' => SujetExamenController::class,
        'grilles' => GrilleCorrectionController::class,
        'tirages' => TirageExamenController::class,
    ]);

    // Exemples d’actions personnalisées utiles (optionnel)
    // Route::post('examens/{examen}/publier', [ExamenController::class, 'publier'])->name('examens.publier');
    // Route::get('examens/{examen}/pv',      [PvExamenController::class, 'showByExamen'])->name('examens.pv');

    Route::get('calendrier', [ExamenController::class, 'calendar'])->name('calendar');
});

/* =========================
|  Surveillance / Gestion de salle le jour J
|=========================*/
Route::prefix('surveillance')->name('surveillance.')->group(function () {
    Route::resources([
        'surveillances' => SurveillanceController::class,
        'anonymats' => AnonymatController::class,           // table anonymat
        'repartition-etudiants' => RepartitionEtudiantController::class,
        'absences' => AbsenceController::class,
        'incidents' => IncidentExamenController::class,
        'pv-examens' => PvExamenController::class,
    ]);
});

/* =========================
|  Correction & Résultats
|=========================*/
Route::prefix('correction')->name('correction.')->group(function () {
    Route::resources([
        'correcteurs' => CorrecteurController::class,
        'notes' => NoteController::class,
        'resultats-elements' => ResultatElementController::class,
        'resultats-modules' => ResultatModuleController::class,
    ]);
});

/* =========================
|  Commissions, Délibérations & Réclamations
|=========================*/
Route::prefix('commissions')->name('commissions.')->group(function () {
    Route::resources([
        'commissions' => CommissionController::class,
        'membres' => MembreCommissionController::class,
        'deliberations' => DeliberationController::class,
        'reclamations' => ReclamationController::class,
        'decisions' => DecisionCommissionController::class,
    ]);

});
require __DIR__ . '/auth.php';
