<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Surveillant extends Model
{
    use HasFactory;

    protected $table = 'surveillants';
    protected $primaryKey = 'id_surveillant';
    protected $guarded = [];
}

