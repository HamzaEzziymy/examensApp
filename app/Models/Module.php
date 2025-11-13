<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Module extends Model
{
    use HasFactory;

    protected $table = 'modules';
    protected $primaryKey = 'id_module';
    public $timestamps = false;
    protected $guarded = [];

    protected $fillable = [
        'code_module',
        'nom_module',
        'type_module',
        'credits',
    ];

    public function elements(): HasMany
    {
        return $this->hasMany(ElementModule::class, 'id_module', 'id_module');
    }

    public function offresFormation(): HasMany
    {
        return $this->hasMany(OffreFormation::class, 'id_module', 'id_module');
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

