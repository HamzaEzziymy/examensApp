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
    protected $guarded = [];

    public function filieres(): HasMany
    {
        return $this->hasMany(Filiere::class, 'id_annee', 'id_annee');
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
