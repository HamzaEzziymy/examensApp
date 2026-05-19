<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasOneThrough;

class Examen extends Model
{
    use HasFactory;

    public const STATUTS = ['Planifiee', 'En cours', 'Terminee', 'Annulee'];
    public const STUDENT_ORDERS = ['alphabetic', 'random'];

    protected $table = 'examens';
    protected $primaryKey = 'id_examen';
    protected $guarded = [];
    protected $fillable = [
        'id_session_examen',
        'id_offre',
        'id_module',
        'id_element',
        'id_salle',
        'anonymat_start',
        'anonymat_end',
        'student_order',
        'date_examen',
        'date_debut',
        'date_fin',
        'statut',
        'description',
    ];
    protected $casts = [
        'anonymat_start' => 'integer',
        'anonymat_end'   => 'integer',
        'date_examen' => 'date',
        'date_debut'  => 'datetime',
        'date_fin'    => 'datetime',
    ];

    protected static function booted(): void
    {
        static::saving(function (self $examen) {
            if ($examen->id_offre) {
                if (! $examen->id_module) {
                    $examen->id_module = OffreFormation::query()
                        ->whereKey($examen->id_offre)
                        ->value('id_module');
                }

                return;
            }

            if (! $examen->id_module) {
                return;
            }

            $resolvedOffreId = self::resolveOffreIdForExam(
                (int) $examen->id_module,
                $examen->id_session_examen ? (int) $examen->id_session_examen : null
            );

            if ($resolvedOffreId) {
                $examen->id_offre = $resolvedOffreId;
            }
        });
    }

    public function sessionExamen(): BelongsTo
    {
        return $this->belongsTo(SessionExamen::class, 'id_session_examen', 'id_session_examen');
    }

    public function offreFormation(): BelongsTo
    {
        return $this->belongsTo(OffreFormation::class, 'id_offre', 'id_offre');
    }

    public function module(): HasOneThrough
    {
        return $this->hasOneThrough(
            Module::class,
            OffreFormation::class,
            'id_offre',
            'id_module',
            'id_offre',
            'id_module'
        );
    }

    public function element(): BelongsTo
    {
        return $this->belongsTo(ElementModule::class, 'id_element', 'id_element');
    }

    public function salle(): BelongsTo
    {
        return $this->belongsTo(Salle::class, 'id_salle', 'id_salle');
    }

    public function salles(): BelongsToMany
    {
        return $this->belongsToMany(Salle::class, 'exam_salle', 'id_examen', 'id_salle')
            ->withPivot('ordre', 'nombre_affecte')
            ->orderByRaw('case when exam_salle.ordre is null then 1 else 0 end')
            ->orderBy('exam_salle.ordre')
            ->orderBy('exam_salle.created_at')
            ->orderBy('salles.id_salle')
            ->withTimestamps();
    }

    public function surveillances(): HasMany
    {
        return $this->hasMany(Surveillance::class, 'id_examen', 'id_examen');
    }

    public function anonymats(): HasMany
    {
        return $this->hasMany(Anonymat::class, 'id_examen', 'id_examen');
    }

    public function repartitions(): HasMany
    {
        return $this->hasMany(RepartitionEtudiant::class, 'id_examen', 'id_examen');
    }

    public function absences(): HasMany
    {
        return $this->hasMany(Absence::class, 'id_examen', 'id_examen');
    }

    public function sujetsExamens(): HasMany
    {
        return $this->hasMany(SujetExamen::class, 'id_examen', 'id_examen');
    }

    public function correcteurs(): HasMany
    {
        return $this->hasMany(Correcteur::class, 'id_examen', 'id_examen');
    }

    public function notes(): HasMany
    {
        return $this->hasMany(Note::class, 'id_examen', 'id_examen');
    }

    public function pvExamens(): HasMany
    {
        return $this->hasMany(PvExamen::class, 'id_examen', 'id_examen');
    }

    private static function resolveOffreIdForExam(int $moduleId, ?int $sessionId = null): ?int
    {
        $session = $sessionId
            ? SessionExamen::query()->find($sessionId, ['id_session_examen', 'id_annee', 'id_filiere'])
            : null;

        $query = OffreFormation::query()
            ->leftJoin('sections', 'sections.id_section', '=', 'offre_formation.id_section')
            ->where('offre_formation.id_module', $moduleId);

        if ($session?->id_annee) {
            $query->where('offre_formation.id_annee', $session->id_annee);
        }

        if ($session?->id_filiere) {
            $query->where('sections.id_filiere', $session->id_filiere);
        }

        $offreId = $query
            ->orderBy('offre_formation.id_offre')
            ->value('offre_formation.id_offre');

        if ($offreId) {
            return (int) $offreId;
        }

        if ($session?->id_annee) {
            $offreId = OffreFormation::query()
                ->where('id_module', $moduleId)
                ->where('id_annee', $session->id_annee)
                ->orderBy('id_offre')
                ->value('id_offre');

            if ($offreId) {
                return (int) $offreId;
            }
        }

        $offreId = OffreFormation::query()
            ->where('id_module', $moduleId)
            ->orderBy('id_offre')
            ->value('id_offre');

        return $offreId ? (int) $offreId : null;
    }
}
