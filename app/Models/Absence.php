<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Absence extends Model
{
    use HasFactory;

    protected $table = 'absences';
    protected $primaryKey = 'id_absence';
    protected $guarded = [];
    protected $fillable = [
        'id_examen',
        'id_anonymat',
        'date_absence',
        'motif',
        'justificatif',
        'statut',
    ];
    
    public function examen(): BelongsTo
    {
        return $this->belongsTo(Examen::class, 'id_examen', 'id_examen');
    }

    public function anonymat(): BelongsTo
    {
        return $this->belongsTo(Anonymat::class, 'id_anonymat', 'id_anonymat');
    }
}
