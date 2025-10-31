<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RepartitionEtudiant extends Model
{
    use HasFactory;

    protected $table = 'repartition_etudiants';
    protected $primaryKey = 'id_repartition';
    protected $guarded = [];
    protected $fillable = [
        'id_examen',
        'id_inscription_pedagogique',
        'code_grille',
        'code_anonymat',
        'numero_place',
        'present',
        'heure_arrivee',
        'heure_sortie',
        'observation',
    ];
    
    public function examen(): BelongsTo
    {
        return $this->belongsTo(Examen::class, 'id_examen', 'id_examen');
    }

    public function inscriptionPedagogique(): BelongsTo
    {
        return $this->belongsTo(InscriptionPedagogique::class, 'id_inscription_pedagogique', 'id_inscription_pedagogique');
    }
}
