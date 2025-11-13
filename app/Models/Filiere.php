<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Filiere extends Model
{
    use HasFactory;

    protected $table = 'filieres';
    protected $primaryKey = 'id_filiere';
    public $timestamps = false;
    protected $guarded = [];
    protected $fillable = [
        'id_faculte',
        'nom_filiere',
    ];

    public function faculte(): BelongsTo
    {
        return $this->belongsTo(Faculte::class, 'id_faculte', 'id_faculte');
    }

    public function sections(): HasMany
    {
        return $this->hasMany(Section::class, 'id_filiere', 'id_filiere');
    }

    public function etudiants(): HasMany
    {
        return $this->hasMany(Etudiant::class, 'id_filiere', 'id_filiere');
    }

    public function sessionsExamen(): HasMany
    {
        return $this->hasMany(SessionExamen::class, 'id_filiere', 'id_filiere');
    }
}
