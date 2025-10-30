<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Deliberation extends Model
{
    use HasFactory;

    protected $table = 'deliberations';
    protected $primaryKey = 'id_deliberation';
    protected $guarded = [];

    public function sessionExamen(): BelongsTo
    {
        return $this->belongsTo(SessionExamen::class, 'id_session', 'id_session_examen');
    }

    public function niveau(): BelongsTo
    {
        return $this->belongsTo(Niveau::class, 'id_niveau', 'id_niveau');
    }
}

