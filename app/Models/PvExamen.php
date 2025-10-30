<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PvExamen extends Model
{
    use HasFactory;

    protected $table = 'pv_examens';
    protected $primaryKey = 'id_pv';
    protected $guarded = [];

    public function examen(): BelongsTo
    {
        return $this->belongsTo(Examen::class, 'id_examen', 'id_examen');
    }
}

