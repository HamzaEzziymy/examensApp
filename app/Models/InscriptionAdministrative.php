<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\Filiere;

class InscriptionAdministrative extends Model
{
    use HasFactory;

    protected $table = 'inscriptions_administratives';
    protected $primaryKey = 'id_inscription_admin';
    protected $guarded = [];
    protected $fillable = [
        'id_etudiant',
        'id_annee',
        'id_niveau',
        'id_filiere',
        'date_inscription',
        'statut',
    ];
    
    public function etudiant(): BelongsTo
    {
        return $this->belongsTo(Etudiant::class, 'id_etudiant', 'id_etudiant');
    }

    public function anneeUniversitaire(): BelongsTo
    {
        return $this->belongsTo(AnneeUniversitaire::class, 'id_annee', 'id_annee');
    }

    public function niveau(): BelongsTo
    {
        return $this->belongsTo(Niveau::class, 'id_niveau', 'id_niveau');
    }

    public function filiere(): BelongsTo
    {
        return $this->belongsTo(Filiere::class, 'id_filiere', 'id_filiere');
    }

    public function inscriptionsPedagogiques(): HasMany
    {
        return $this->hasMany(InscriptionPedagogique::class, 'id_inscription_admin', 'id_inscription_admin');
    }
}
