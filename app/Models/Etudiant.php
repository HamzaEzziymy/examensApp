<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\Section;

class Etudiant extends Model
{
    use HasFactory;

    protected $table = 'etudiants';
    protected $primaryKey = 'id_etudiant';
    protected $guarded = [];
    protected $fillable = [
        'cne',
        'nom',
        'prenom',
        'mail_academique',
        'mail_personnel',
        'date_naissance',
        'telephone',
        'url_photo',
        'id_section',
    ];

    // Prefer singular naming for clarity in seeders/controllers
    public function section(): BelongsTo
    {
        return $this->belongsTo(Section::class, 'id_section', 'id_section');
    }

    public function inscriptionsAdministratives(): HasMany
    {
        return $this->hasMany(InscriptionAdministrative::class, 'id_etudiant', 'id_etudiant');
    }

    public function inscriptionsPedagogiques(): HasMany
    {
        return $this->hasMany(InscriptionPedagogique::class, 'id_etudiant', 'id_etudiant');
    }
}
