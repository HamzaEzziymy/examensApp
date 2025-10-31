<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class SujetExamen extends Model
{
    use HasFactory;

    protected $table = 'sujets_examens';
    protected $primaryKey = 'id_sujet';
    protected $guarded = [];
    protected $fillable = [
        'id_examen',
        'version_sujet',
        'chemin_fichier',
        'id_auteur',
        'date_creation',
        'statut',
    ];

    public function examen(): BelongsTo
    {
        return $this->belongsTo(Examen::class, 'id_examen', 'id_examen');
    }

    public function auteur(): BelongsTo
    {
        return $this->belongsTo(Enseignant::class, 'id_auteur', 'id_enseignant');
    }

    public function grille(): HasOne
    {
        return $this->hasOne(GrilleCorrection::class, 'id_sujet', 'id_sujet');
    }

    public function tirages(): HasMany
    {
        return $this->hasMany(TirageExamen::class, 'id_sujet', 'id_sujet');
    }
}
