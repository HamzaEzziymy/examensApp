<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Surveillance extends Model
{
    use HasFactory;

    protected $table = 'surveillances';
    protected $primaryKey = 'id_surveillance';
    protected $guarded = [];
}

