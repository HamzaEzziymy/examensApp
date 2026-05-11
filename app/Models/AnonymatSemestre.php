<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AnonymatSemestre extends Model
{
    use HasFactory;

    protected $table = 'anonymat_semestres';
    protected $primaryKey = 'id_anonymat_semestre';
    protected $guarded = [];
    protected $fillable = [
        'id_inscription_admin',
        'id_semestre',
        'id_annee',
        'code_anonymat',
    ];

    public function inscriptionAdministrative(): BelongsTo
    {
        return $this->belongsTo(InscriptionAdministrative::class, 'id_inscription_admin', 'id_inscription_admin');
    }

    public function semestre(): BelongsTo
    {
        return $this->belongsTo(Semestre::class, 'id_semestre', 'id_semestre');
    }

    public function anneeUniversitaire(): BelongsTo
    {
        return $this->belongsTo(AnneeUniversitaire::class, 'id_annee', 'id_annee');
    }
}
