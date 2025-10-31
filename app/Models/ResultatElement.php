<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ResultatElement extends Model
{
    use HasFactory;

    protected $table = 'resultats_elements';
    protected $primaryKey = 'id_resultat_element';
    protected $guarded = [];
    protected $fillable = [
        'id_inscription_pedagogique',
        'id_element',
        'id_session_examen',
        'moyenne_element',
        'statut',
        'date_validation',
    ];
    public function inscriptionPedagogique(): BelongsTo
    {
        return $this->belongsTo(InscriptionPedagogique::class, 'id_inscription_pedagogique', 'id_inscription_pedagogique');
    }

    public function element(): BelongsTo
    {
        return $this->belongsTo(ElementModule::class, 'id_element', 'id_element');
    }

    public function sessionExamen(): BelongsTo
    {
        return $this->belongsTo(SessionExamen::class, 'id_session_examen', 'id_session_examen');
    }
}
