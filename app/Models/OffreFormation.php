<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OffreFormation extends Model
{
    use HasFactory;

    protected $table = 'offre_formation';
    protected $primaryKey = 'id_offre';
    public $timestamps = false;
    protected $guarded = [];

    protected $fillable = [
        'id_module',
        'id_semestre',
        'id_section',
        'id_annee',
        'id_coordinateur',
        'nom_affiche',
    ];

    public function module(): BelongsTo
    {
        return $this->belongsTo(Module::class, 'id_module', 'id_module');
    }

    public function semestre(): BelongsTo
    {
        return $this->belongsTo(Semestre::class, 'id_semestre', 'id_semestre');
    }

    public function section(): BelongsTo
    {
        return $this->belongsTo(Section::class, 'id_section', 'id_section');
    }

    public function anneeUniversitaire(): BelongsTo
    {
        return $this->belongsTo(AnneeUniversitaire::class, 'id_annee', 'id_annee');
    }

    public function coordinateur(): BelongsTo
    {
        return $this->belongsTo(Enseignant::class, 'id_coordinateur', 'id_enseignant');
    }
}

