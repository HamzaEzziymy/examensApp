<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Reclamation extends Model
{
    use HasFactory;

    protected $table = 'reclamations';
    protected $primaryKey = 'id_reclamation';
    protected $guarded = [];

    public function inscriptionPedagogique(): BelongsTo
    {
        return $this->belongsTo(InscriptionPedagogique::class, 'id_inscription_pedagogique', 'id_inscription_pedagogique');
    }

    public function element(): BelongsTo
    {
        return $this->belongsTo(ElementModule::class, 'id_element_module', 'id_element');
    }

    public function sessionExamen(): BelongsTo
    {
        return $this->belongsTo(SessionExamen::class, 'id_session_examen', 'id_session_examen');
    }
}

