<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Filiere extends Model
{
    use HasFactory;

    protected $table = 'filieres';
    protected $primaryKey = 'id_filiere';
    protected $guarded = [];
    protected $fillable = [
        'id_annee',
        'nom_filiere',
        'code_filiere',

    ];

    public function anneeUniversitaire(): BelongsTo
    {
        return $this->belongsTo(AnneeUniversitaire::class, 'id_annee', 'id_annee');
    }

    public function niveaux(): HasMany
    {
        return $this->hasMany(Niveau::class, 'id_filiere', 'id_filiere');
    }

    public function etudiants(): HasMany
    {
        return $this->hasMany(Etudiant::class, 'id_filiere', 'id_filiere');
    }

    public function sessionsExamen(): HasMany
    {
        return $this->hasMany(SessionExamen::class, 'id_filiere', 'id_filiere');
    }
}
