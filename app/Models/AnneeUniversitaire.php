<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AnneeUniversitaire extends Model
{
    use HasFactory;

    protected $table = 'annees_universitaires';
    protected $primaryKey = 'id_annee';
    public $timestamps = false;
    protected $guarded = [];
    protected $fillable = [
        'annee_univ',
        'date_debut',
        'date_fin',
        'est_active',
    ];

    public function offresFormation(): HasMany
    {
        return $this->hasMany(OffreFormation::class, 'id_annee', 'id_annee');
    }

    public function inscriptionsAdministratives(): HasMany
    {
        return $this->hasMany(InscriptionAdministrative::class, 'id_annee', 'id_annee');
    }

    public function sessionsExamen(): HasMany
    {
        return $this->hasMany(SessionExamen::class, 'id_annee', 'id_annee');
    }
}
