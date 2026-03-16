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
        'id_correcteur',
        'id_examen',
        'note',
        'date_saisie',
        'commentaire',
    ];
    public function anonymat(): BelongsTo
    {
        return $this->belongsTo(Anonymat::class, 'id_anonymat', 'id_anonymat');
    }

    public function correcteur(): BelongsTo
    {
        return $this->belongsTo(Correcteur::class, 'id_correcteur', 'id_correcteur');
    }

    public function examen(): BelongsTo
    {
        return $this->belongsTo(Examen::class, 'id_examen', 'id_examen');
    }
}
