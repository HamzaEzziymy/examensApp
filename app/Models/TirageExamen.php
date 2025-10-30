<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TirageExamen extends Model
{
    use HasFactory;

    protected $table = 'tirages_examens';
    protected $primaryKey = 'id_tirage';
    protected $guarded = [];

    public function sujet(): BelongsTo
    {
        return $this->belongsTo(SujetExamen::class, 'id_sujet', 'id_sujet');
    }
}

