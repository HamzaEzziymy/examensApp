<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MembreCommission extends Model
{
    use HasFactory;

    protected $table = 'membres_commission';
    protected $primaryKey = 'id_membre_commission';
    protected $guarded = [];

    public function commission(): BelongsTo
    {
        return $this->belongsTo(Commission::class, 'id_commission', 'id_commission');
    }

    public function enseignant(): BelongsTo
    {
        return $this->belongsTo(Enseignant::class, 'id_enseignant', 'id_enseignant');
    }
}

