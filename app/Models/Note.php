<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Note extends Model
{
    use HasFactory;

    protected $table = 'notes';
    protected $primaryKey = 'id_note';
    protected $guarded = [];
    protected $fillable = [
        'id_anonymat',
        'id_examen',
        'id_element',
        'id_enseignant',
        'note',
        'note_sur',
        'date_saisie',
        'commentaire',
    ];
    public function anonymat(): BelongsTo
    {
        return $this->belongsTo(Anonymat::class, 'id_anonymat', 'id_anonymat');
    }

    public function examen(): BelongsTo
    {
        return $this->belongsTo(Examen::class, 'id_examen', 'id_examen');
    }

    public function element(): BelongsTo
    {
        return $this->belongsTo(ElementModule::class, 'id_element', 'id_element');
    }

    public function enseignant(): BelongsTo
    {
        return $this->belongsTo(Enseignant::class, 'id_enseignant', 'id_enseignant');
    }
}
