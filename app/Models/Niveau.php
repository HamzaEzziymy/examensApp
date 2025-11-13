<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Niveau extends Model
{
    use HasFactory;

    protected $table = 'niveaux';
    protected $primaryKey = 'id_niveau';
    public $timestamps = false;
    protected $guarded = [];

    protected $fillable = [
        'code_niveau',
        'nom_niveau',
        'ordre',
    ];

    public function semestres(): HasMany
    {
        return $this->hasMany(Semestre::class, 'id_niveau', 'id_niveau');
    }

    public function inscriptionsAdministratives(): HasMany
    {
        return $this->hasMany(InscriptionAdministrative::class, 'id_niveau', 'id_niveau');
    }

    public function deliberations(): HasMany
    {
        return $this->hasMany(Deliberation::class, 'id_niveau', 'id_niveau');
    }
}
