<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MembreCommission extends Model
{
    use HasFactory;

    protected $table = 'membres_commission';
    protected $primaryKey = 'id_membre_commission';
    protected $guarded = [];
}

