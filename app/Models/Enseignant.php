<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Enseignant extends Model
{
    use HasFactory;

    protected $table = 'enseignants';
    protected $primaryKey = 'id_enseignant';
    protected $guarded = [];
 protected $fillable = [
        'id_user', 'code', 'nom', 'prenom', 'mail_academique', 'telephone',
    ];
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'id_user', 'id');
    }

    public function module(): BelongsTo
    {
        return $this->belongsTo(Module::class, 'id_module', 'id_module');
    }

    public function modules(): BelongsToMany
    {
        return $this->belongsToMany(Module::class, 'enseignant_module', 'id_enseignant', 'id_module')
            ->withTimestamps();
    }

    public function sujetsExamens(): HasMany
    {
        return $this->hasMany(SujetExamen::class, 'id_auteur', 'id_enseignant');
    }

    public function grillesCorrection(): HasMany
    {
        return $this->hasMany(GrilleCorrection::class, 'id_auteur', 'id_enseignant');
    }

    public function stagesEncadres(): HasMany
    {
        return $this->hasMany(Stage::class, 'encadrant_faculte', 'id_enseignant');
    }

    public function correcteurs(): HasMany
    {
        return $this->hasMany(Correcteur::class, 'id_enseignant', 'id_enseignant');
    }

    public function membresCommission(): HasMany
    {
        return $this->hasMany(MembreCommission::class, 'id_enseignant', 'id_enseignant');
    }
}
