<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GrilleCorrection extends Model
{
    use HasFactory;

    protected $table = 'grilles_correction';
    protected $primaryKey = 'id_grille';
    protected $guarded = [];
    protected $fillable = [
        'id_sujet',
        'type_grille',
        'contenu_grille',
        'note_maximale',
        'id_auteur',
        'date_creation',
    ];
     protected $casts = [
        'contenu_grille' => 'array',     // <-- IMPORTANT
        'note_maximale'  => 'decimal:2',
        'date_creation'  => 'datetime',
    ];
    public function sujet(): BelongsTo
    {
        return $this->belongsTo(SujetExamen::class, 'id_sujet', 'id_sujet');
    }

    public function auteur(): BelongsTo
    {
        return $this->belongsTo(Enseignant::class, 'id_auteur', 'id_enseignant');
    }
}
