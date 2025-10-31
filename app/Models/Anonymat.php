<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Anonymat extends Model
{
    use HasFactory;

    protected $table = 'anonymat';
    protected $primaryKey = 'id_anonymat';
    protected $guarded = [];
    protected $fillable = [
        'id_examen',
        'id_inscription_pedagogique',
        'code_anonymat',
    ];
    public function examen(): BelongsTo
    {
        return $this->belongsTo(Examen::class, 'id_examen', 'id_examen');
    }

    public function inscriptionPedagogique(): BelongsTo
    {
        return $this->belongsTo(InscriptionPedagogique::class, 'id_inscription_pedagogique', 'id_inscription_pedagogique');
    }

    public function absences(): HasMany
    {
        return $this->hasMany(Absence::class, 'id_anonymat', 'id_anonymat');
    }

    public function incidents(): HasMany
    {
        return $this->hasMany(IncidentExamen::class, 'id_anonymat', 'id_anonymat');
    }

    public function notes(): HasMany
    {
        return $this->hasMany(Note::class, 'id_anonymat', 'id_anonymat');
    }
}
