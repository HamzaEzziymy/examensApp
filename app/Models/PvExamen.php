<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PvExamen extends Model
{
    use HasFactory;

    protected $table = 'pv_examens';
    protected $primaryKey = 'id_pv';
    protected $guarded = [];
}

