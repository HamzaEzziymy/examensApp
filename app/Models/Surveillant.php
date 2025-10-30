<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Surveillant extends Model
{
    use HasFactory;

    protected $table = 'surveillants';
    protected $primaryKey = 'id_surveillant';
    protected $guarded = [];

    public function surveillances(): HasMany
    {
        return $this->hasMany(Surveillance::class, 'id_surveillant', 'id_surveillant');
    }
}

