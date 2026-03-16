<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Examen extends Model
{
    use HasFactory;

    public const STATUTS = ['Planifiee', 'En cours', 'Terminee', 'Annulee'];

    protected $table = 'examens';
    protected $primaryKey = 'id_examen';
    protected $guarded = [];
    protected $fillable = [
        'id_session_examen',
        'id_module',
        'id_salle',
        'date_examen',
        'date_debut',
        'date_fin',
        'statut',
        'description',
    ];
    protected $casts = [
        'date_examen' => 'date',
        'date_debut'  => 'datetime',
        'date_fin'    => 'datetime',
    ];

    public function sessionExamen(): BelongsTo
    {
        return $this->belongsTo(SessionExamen::class, 'id_session_examen', 'id_session_examen');
    }

    public function module(): BelongsTo
    {
        return $this->belongsTo(Module::class, 'id_module', 'id_module');
    }

    public function salle(): BelongsTo
    {
        return $this->belongsTo(Salle::class, 'id_salle', 'id_salle');
    }

    public function salles(): BelongsToMany
    {
        return $this->belongsToMany(Salle::class, 'exam_salle', 'id_examen', 'id_salle')
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

    public function pvExamens(): HasMany
    {
        return $this->hasMany(PvExamen::class, 'id_examen', 'id_examen');
    }
}
