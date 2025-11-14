<?php

namespace App\Http\Controllers;

use App\Models\Faculte;
use Illuminate\Http\Request;
use Inertia\Inertia;

class FaculteController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return Inertia::render("Configuration/Faculte/Index",[
            "faculte"=> Faculte::all(),
        ]
    );
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
            'nom_faculte' => 'required|string|max:100|unique:facultes,nom_faculte',
            'entete' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'logo' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'adress' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'web' => 'nullable|url|max:255',
            'fax' => 'nullable|string|max:255',
        ]);

        // Handle file uploads
        if ($request->hasFile('entete')) {
            $validated['entete'] = $request->file('entete')->store('storage/facultes/entetes', 'public');
        }
        if ($request->hasFile('logo')) {
            $validated['logo'] = $request->file('logo')->store('storage/facultes/logos', 'public');
        }

        $faculte = Faculte::create($validated);

        return redirect()->route('configuration.faculte.index');
    }    /**
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
        $faculte = Faculte::findOrFail($id);

        $validated = $request->validate([
            'nom_faculte' => 'required|string|max:100|unique:facultes,nom_faculte,' . $faculte->id_faculte . ',id_faculte',
            'entete' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'logo' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'adress' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'web' => 'nullable|url|max:255',
            'fax' => 'nullable|string|max:255',
        ]);

        // Handle file uploads
        if ($request->hasFile('entete')) {
            // Delete old file if exists
            if ($faculte->entete) {
                \Storage::disk('public')->delete($faculte->entete);
            }
            $validated['entete'] = $request->file('entete')->store('facultes/entetes', 'public');
        }
        if ($request->hasFile('logo')) {
            // Delete old file if exists
            if ($faculte->logo) {
                \Storage::disk('public')->delete($faculte->logo);
            }
            $validated['logo'] = $request->file('logo')->store('facultes/logos', 'public');
        }

        $faculte->update($validated);

        return redirect()->route('configuration.faculte.index');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }
}
