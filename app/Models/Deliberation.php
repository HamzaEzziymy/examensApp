<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Deliberation extends Model
{
    use HasFactory;

    protected $table = 'deliberations';
    protected $primaryKey = 'id_deliberation';
    protected $guarded = [];
}

