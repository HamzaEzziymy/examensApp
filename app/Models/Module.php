<?php

namespace App\Models;

use App\Services\ModuleService;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
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

    public function inscriptionsPedagogiques(): HasManyThrough
    {
        return $this->hasManyThrough(
            InscriptionPedagogique::class,
            OffreFormation::class,
            'id_module', // FK on offre_formation -> modules
            'id_offre', // FK on inscriptions_pedagogiques -> offre_formation
            'id_module', // Local key on modules
            'id_offre' // Local key on offre_formation
        );
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

    public function examens(): HasManyThrough
    {
        return $this->hasManyThrough(
            Examen::class,
            OffreFormation::class,
            'id_module',
            'id_offre',
            'id_module',
            'id_offre'
        );
    }

    /**
     * Get the self-referencing element for this module
     *
     * @return ElementModule|null
     */
    public function getSelfReferencingElement(): ?ElementModule
    {
        $moduleService = app(ModuleService::class);

        return $this->elements->first(function ($element) use ($moduleService) {
            return $moduleService->isSelfReferencingElement($element);
        });
    }

    /**
     * Check if this module has a self-referencing element
     *
     * @return bool
     */
    public function hasSelfReferencingElement(): bool
    {
        return $this->getSelfReferencingElement() !== null;
    }

}
