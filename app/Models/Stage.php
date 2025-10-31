<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Stage extends Model
{
    use HasFactory;

    protected $table = 'stages';
    protected $primaryKey = 'id_stage';
    protected $guarded = [];

     protected $fillable = [
        'id_inscription_pedagogique','id_module',
        'nom_hopital','service','date_debut','date_fin',
        'encadrant_hopital','encadrant_faculte',
        'note_stage','rapport_stage',
    ];
    
    public function inscriptionPedagogique(): BelongsTo
    {
        return $this->belongsTo(InscriptionPedagogique::class, 'id_inscription_pedagogique', 'id_inscription_pedagogique');
    }

    public function module(): BelongsTo
    {
        return $this->belongsTo(Module::class, 'id_module', 'id_module');
    }

    public function encadrantFaculte(): BelongsTo
    {
        return $this->belongsTo(Enseignant::class, 'encadrant_faculte', 'id_enseignant');
    }
}

