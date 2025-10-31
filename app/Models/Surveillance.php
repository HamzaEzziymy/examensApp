<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Surveillance extends Model
{
    use HasFactory;

    protected $table = 'surveillances';
    protected $primaryKey = 'id_surveillance';
    protected $guarded = [];
    protected $fillable = [
        'id_examen',
        'id_surveillant',
        'role',
        'heure_debut',
        'heure_fin',
        'observations',
    ];
    public function examen(): BelongsTo
    {
        return $this->belongsTo(Examen::class, 'id_examen', 'id_examen');
    }

    public function surveillant(): BelongsTo
    {
        return $this->belongsTo(Surveillant::class, 'id_surveillant', 'id_surveillant');
    }

    public function incidents(): HasMany
    {
        return $this->hasMany(IncidentExamen::class, 'id_surveillance', 'id_surveillance');
    }
}
