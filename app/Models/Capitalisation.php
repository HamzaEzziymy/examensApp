<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Capitalisation extends Model
{
    use HasFactory;

    protected $table = 'capitalisations';
    protected $primaryKey = 'id_capitalisation';
    protected $guarded = [];
    protected $fillable = [
        'id_inscription_admin',
        'id_offre',
        'note',
        'date_capitalisation',
        'date_expiration',
    ];

    public function inscriptionAdministrative(): BelongsTo
    {
        return $this->belongsTo(InscriptionAdministrative::class, 'id_inscription_admin', 'id_inscription_admin');
    }

    public function offreFormation(): BelongsTo
    {
        return $this->belongsTo(OffreFormation::class, 'id_offre', 'id_offre');
    }
}

