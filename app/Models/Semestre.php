<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Semestre extends Model
{
    use HasFactory;

    protected $table = 'semestres';
    protected $primaryKey = 'id_semestre';
    protected $guarded = [];
 protected $fillable = [
        'code_semestre', 'nom_semestre', 'id_niveau', 'credits_requis',
    ];
    public function niveau(): BelongsTo
    {
        return $this->belongsTo(Niveau::class, 'id_niveau', 'id_niveau');
    }

    public function modules(): HasMany
    {
        return $this->hasMany(Module::class, 'id_semestre', 'id_semestre');
    }
}
