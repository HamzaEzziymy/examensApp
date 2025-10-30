<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DecisionCommission extends Model
{
    use HasFactory;

    protected $table = 'decisions_commission';
    protected $primaryKey = 'id_decision';
    protected $guarded = [];
}

