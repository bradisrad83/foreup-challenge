<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreFavoriteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'external_id' => ['required', 'integer'],
            'name' => ['required', 'string', 'max:255'],
            'image_url' => ['sometimes', 'nullable', 'string'],
            'summary' => ['sometimes', 'nullable', 'string'],
            'premiered' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'ended' => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'status' => ['sometimes', 'nullable', 'string', 'max:100'],
            'genres' => ['sometimes', 'nullable', 'array'],
            'genres.*' => ['string'],
            'rating' => ['sometimes', 'nullable', 'numeric'],
            'language' => ['sometimes', 'nullable', 'string', 'max:100'],
            'network' => ['sometimes', 'nullable', 'string', 'max:255'],
            'official_url' => ['sometimes', 'nullable', 'string'],
            'metadata' => ['sometimes', 'nullable', 'array'],
        ];
    }
}
