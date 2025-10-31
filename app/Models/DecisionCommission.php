<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DecisionCommission extends Model
{
    use HasFactory;

    protected $table = 'decisions_commission';
    protected $primaryKey = 'id_decision';
    protected $guarded = [];
    protected $fillable = [
        'id_commission',
        'id_cas',
        'date_decision',
        'decision',
        'sanction',
    ];
    public function commission(): BelongsTo
    {
        return $this->belongsTo(Commission::class, 'id_commission', 'id_commission');
    }
}
