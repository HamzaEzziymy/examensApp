<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InscriptionPedagogique extends Model
{
    use HasFactory;

    protected $table = 'inscriptions_pedagogiques';
    protected $primaryKey = 'id_inscription_pedagogique';
    protected $guarded = [];

    protected $fillable = [
        'id_etudiant','id_inscription_admin','id_module',
        'type_inscription','credits_acquis',
    ];
    
    public function etudiant(): BelongsTo
    {
        return $this->belongsTo(Etudiant::class, 'id_etudiant', 'id_etudiant');
    }

    public function inscriptionAdministrative(): BelongsTo
    {
        return $this->belongsTo(InscriptionAdministrative::class, 'id_inscription_admin', 'id_inscription_admin');
    }

    public function module(): BelongsTo
    {
        return $this->belongsTo(Module::class, 'id_module', 'id_module');
    }

    public function capitalisations(): HasMany
    {
        return $this->hasMany(Capitalisation::class, 'id_inscription_pedagogique', 'id_inscription_pedagogique');
    }

    public function stages(): HasMany
    {
        return $this->hasMany(Stage::class, 'id_inscription_pedagogique', 'id_inscription_pedagogique');
    }

    public function anonymats(): HasMany
    {
        return $this->hasMany(Anonymat::class, 'id_inscription_pedagogique', 'id_inscription_pedagogique');
    }

    public function repartitions(): HasMany
    {
        return $this->hasMany(RepartitionEtudiant::class, 'id_inscription_pedagogique', 'id_inscription_pedagogique');
    }

    public function resultatsElements(): HasMany
    {
        return $this->hasMany(ResultatElement::class, 'id_inscription_pedagogique', 'id_inscription_pedagogique');
    }

    public function resultatsModules(): HasMany
    {
        return $this->hasMany(ResultatModule::class, 'id_inscription_pedagogique', 'id_inscription_pedagogique');
    }

    public function reclamations(): HasMany
    {
        return $this->hasMany(Reclamation::class, 'id_inscription_pedagogique', 'id_inscription_pedagogique');
    }
}

