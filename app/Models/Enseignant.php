<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Enseignant extends Model
{
    use HasFactory;

    protected $table = 'enseignants';
    protected $primaryKey = 'id_enseignant';
    public $timestamps = false;
    protected $guarded = [];

    protected $fillable = [
        'id_utilisateur',
        'matricule',
        'nom',
        'prenom',
        'email',
        'grade',
        'departement',
        'chemin_signature_scan',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'id_utilisateur', 'id');
    }

    public function offresCoordonnees(): HasMany
    {
        return $this->hasMany(OffreFormation::class, 'id_coordinateur', 'id_enseignant');
    }

    public function sujetsExamens(): HasMany
    {
        return $this->hasMany(SujetExamen::class, 'id_auteur', 'id_enseignant');
    }

    public function grillesCorrection(): HasMany
    {
        return $this->hasMany(GrilleCorrection::class, 'id_auteur', 'id_enseignant');
    }

    public function stagesEncadres(): HasMany
    {
        return $this->hasMany(Stage::class, 'encadrant_faculte', 'id_enseignant');
    }

    public function correcteurs(): HasMany
    {
        return $this->hasMany(Correcteur::class, 'id_enseignant', 'id_enseignant');
    }

    public function membresCommission(): HasMany
    {
        return $this->hasMany(MembreCommission::class, 'id_enseignant', 'id_enseignant');
    }
}
