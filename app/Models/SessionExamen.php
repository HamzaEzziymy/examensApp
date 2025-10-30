<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SessionExamen extends Model
{
    use HasFactory;

    protected $table = 'sessions_examen';
    protected $primaryKey = 'id_session_examen';
    protected $guarded = [];

    public function filiere(): BelongsTo
    {
        return $this->belongsTo(Filiere::class, 'id_filiere', 'id_filiere');
    }

    public function anneeUniversitaire(): BelongsTo
    {
        return $this->belongsTo(AnneeUniversitaire::class, 'id_annee', 'id_annee');
    }

    public function examens(): HasMany
    {
        return $this->hasMany(Examen::class, 'id_session_examen', 'id_session_examen');
    }

    public function resultatsElements(): HasMany
    {
        return $this->hasMany(ResultatElement::class, 'id_session_examen', 'id_session_examen');
    }

    public function deliberations(): HasMany
    {
        return $this->hasMany(Deliberation::class, 'id_session', 'id_session_examen');
    }

    public function reclamations(): HasMany
    {
        return $this->hasMany(Reclamation::class, 'id_session_examen', 'id_session_examen');
    }
}

