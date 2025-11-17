<?php

namespace App\Http\Controllers;

use App\Models\Section;
use Illuminate\Http\Request;

class SectionController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            "nom_section" => ["required", "string", "max:100"],
            "langue" => ["required", "in:FR,EN,AR"],
            "id_filiere" => ["required", "exists:filieres,id_filiere"],
        ]);

        $section = Section::create($validated);
        return Redirect()->route('academique.filieres.index');
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $validated = $request->validate([
            "nom_section" => ["required", "string", "max:100"],
            "langue" => ["required", "in:FR,EN,AR"],
            "id_filiere" => ["required", "exists:filieres,id_filiere"],
        ]);

        $section = Section::findOrFail($id);
        $section->update($validated);
        return Redirect()->route('academique.filieres.index');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $section = Section::findOrFail($id);
        $section->delete();
        return Redirect()->route('academique.filieres.index');
    }
}
