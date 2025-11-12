<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Module extends Model
{
    use HasFactory;

    protected $table = 'modules';
    protected $primaryKey = 'id_module';
    protected $guarded = [];

    protected $fillable = [
        'code_module',
        'nom_module',
        'abreviation_module',
        'nature',
        'id_semestre',
        'quadrimestre',
        'seuil_validation',
        'coefficient_module',
        'credits_requis',
        'description',
    ];
    public function semestre(): BelongsTo
    {
        return $this->belongsTo(Semestre::class, 'id_semestre', 'id_semestre');
    }

    public function elements(): HasMany
    {
        return $this->hasMany(ElementModule::class, 'id_module', 'id_module');
    }

    public function enseignantsResponsables(): HasMany
    {
        return $this->hasMany(Enseignant::class, 'id_module', 'id_module');
    }

    public function enseignants(): BelongsToMany
    {
        return $this->belongsToMany(Enseignant::class, 'enseignant_module', 'id_module', 'id_enseignant')
            ->withTimestamps();
    }

    public function inscriptionsPedagogiques(): HasMany
    {
        return $this->hasMany(InscriptionPedagogique::class, 'id_module', 'id_module');
    }

    public function capitalisations(): HasMany
    {
        return $this->hasMany(Capitalisation::class, 'id_module', 'id_module');
    }

    public function stages(): HasMany
    {
        return $this->hasMany(Stage::class, 'id_module', 'id_module');
    }

    public function resultatsModules(): HasMany
    {
        return $this->hasMany(ResultatModule::class, 'id_module', 'id_module');
    }

    public function examens(): HasMany
    {
        return $this->hasMany(Examen::class, 'id_module', 'id_module');
    }
}
