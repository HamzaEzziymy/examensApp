<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Correcteur extends Model
{
    use HasFactory;

    protected $table = 'correcteurs';
    protected $primaryKey = 'id_correcteur';
    protected $guarded = [];
    protected $fillable = [
        'id_examen',
        'id_enseignant',
        'id_element',
        'nombre_copies',
        'date_attribution',
        'date_limite_correction',
        'statut',
    ];
    
    public function examen(): BelongsTo
    {
        return $this->belongsTo(Examen::class, 'id_examen', 'id_examen');
    }

    public function enseignant(): BelongsTo
    {
        return $this->belongsTo(Enseignant::class, 'id_enseignant', 'id_enseignant');
    }

    public function element(): BelongsTo
    {
        return $this->belongsTo(ElementModule::class, 'id_element', 'id_element');
    }
<<<<<<< HEAD
=======

    public function notes(): HasMany
    {
        return $this->hasMany(Note::class, 'id_examen', 'id_examen');
    }
>>>>>>> 7acd31734ed3535860e911b345d76df2f5164380
}
