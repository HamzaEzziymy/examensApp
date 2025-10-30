<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Commission extends Model
{
    use HasFactory;

    protected $table = 'commissions';
    protected $primaryKey = 'id_commission';
    protected $guarded = [];

    public function membres(): HasMany
    {
        return $this->hasMany(MembreCommission::class, 'id_commission', 'id_commission');
    }

    public function decisions(): HasMany
    {
        return $this->hasMany(DecisionCommission::class, 'id_commission', 'id_commission');
    }
}

