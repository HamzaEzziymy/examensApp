<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Correcteur extends Model
{
    use HasFactory;

    protected $table = 'correcteurs';
    protected $primaryKey = 'id_correcteur';
    protected $guarded = [];

    public function examen(): BelongsTo
    {
        return $this->belongsTo(Examen::class, 'id_examen', 'id_examen');
    }

    public function enseignant(): BelongsTo
    {
        return $this->belongsTo(Enseignant::class, 'id_enseignant', 'id_enseignant');
    }

    public function notes(): HasMany
    {
        return $this->hasMany(Note::class, 'id_correcteur', 'id_correcteur');
    }
}

